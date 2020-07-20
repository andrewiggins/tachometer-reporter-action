const escapeRe = require("escape-string-regexp");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * @param {import('./global').GitHubActionClient} github
 * @param {import('./global').CommentContext} context
 * @param {(c: null) => string} getInitialBody
 * @param {import('./global').Logger} logger
 * @returns {Promise<import('./global').CommentData>}
 */
async function initiateCommentLock(github, context, getInitialBody, logger) {
	// TODO: Consider adding an initiateCommentLock function which finds all
	// workflow runs associated with this PR and searches for runs whose jobs
	// contain this action. ~~The job whose run_id and job/step index is first
	// creates a new comment. All others wait for comment to be created.~~ Can't
	// determine which other jobs use tachometer-reporter-action so this doesn't
	// work. Instead we are going to use the index of the job in the run to
	// deterministically delay the potentially write of the comment so hopefully
	// only the first job writes the comment.
	//
	// Creating a comment per workflow def should simplify this a bit since you'll
	// only have to search the jobs for the current workflow instead of trying to
	// find all workflow runs. Would mean the footer and comment matcher needs to
	// be customized per workflow with the workflow name.
	//
	// Don't worry about steps since steps must run sequentially. Multiple
	// reporter actions in one job can't parallelly try to initiate comment lock.

	logger.startGroup("Initiating comment lock...");
	let delay = context.delayFactor * 100; // (factor * 100) milliseconds

	/** @type {import('./global').CommentData} */
	let comment = await readComment(github, context, logger);
	if (!comment) {
		logger.info(`Comment not found. Waiting ${delay}ms before trying again...`);
		await sleep(delay);

		comment = await readComment(github, context, logger);

		if (!comment) {
			// TODO: Consider going ahead and adding a lock for this job to the
			// comment now since this job is creating the comment.

			logger.info("After delay, comment not found. Creating comment...");
			comment = await createComment(
				github,
				context,
				getInitialBody(null),
				logger
			);
		} else {
			logger.info("Comment found. Doing nothing.");
		}
	} else {
		logger.info("Comment found. Doing nothing.");
	}

	logger.endGroup();

	context.id = comment.id;
	return comment;
}

/**
 * @param {import('./global').GitHubActionClient} github
 * @param {import('./global').CommentContext} context
 * @param {(c: null) => string} getInitialBody
 * @param {import('./global').Logger} logger
 * @returns {Promise<import('./global').CommentData>}
 */
async function acquireCommentLock(github, context, getInitialBody, logger) {
	// config values:
	// - minLockHold: Minimum amount of time lock must be consistently held before
	//   safely assuming it was successfully acquired. Default: 500ms (or 1s?)
	// - minLockWait: Minimum amount of time to wait before trying to acquire the
	//   lock again after seeing it is held. Default: 500ms (or 1s?)
	//
	// Check every 500ms (or half minLockHold if <500ms) to see if lock is still
	// held to eagerly go back to waiting state
	//
	// Consider using https://npm.im/@xstate/fsm
	// Sample States:
	// - https://xstate.js.org/viz/?gist=33685dc6569747e6156af33503e77e26
	// - https://xstate.js.org/viz/?gist=80c62c3012452b6c4ab96a9c9c995975
	//
	// Tutorial: https://egghead.io/courses/introduction-to-state-machines-using-xstate
	//
	// 1. read if comment exists
	// 1. if comment exists and has lock, wait then try again
	// 1. if comment doesn't exist or is not locked, continue
	// 1. update comment with lock id
	// 1. wait a random short time for any other inflight writes
	// 1. read comment again to see we still have the lock
	// 1. if we have lock, continue
	// 1. if we don't have lock, wait a random time and try again

	// Create comment if it doesn't already exist
	let comment = await initiateCommentLock(
		github,
		context,
		getInitialBody,
		logger
	);

	return comment;
}

/**
 * Read a comment matching with matching regex
 * @param {import('./global').GitHubActionClient} github
 * @param {import('./global').CommentContext} context
 * @param {import('./global').Logger} logger
 * @returns {Promise<import('./global').CommentData | null>}
 */
async function readComment(github, context, logger) {
	/** @type {import('./global').CommentData} */
	let comment;

	try {
		if (context.id) {
			logger.info(`Reading comment ${context.id}...`);
			comment = (
				await github.issues.getComment({
					owner: context.owner,
					repo: context.repo,
					comment_id: context.id,
				})
			).data;
		} else {
			logger.info(`Trying to find matching comment...`);

			// Assuming comment is in the first page of results for now...
			// https://docs.github.com/en/rest/reference/issues#list-issue-comments
			const comments = (
				await github.issues.listComments({
					owner: context.owner,
					repo: context.repo,
					issue_number: context.issueNumber,
				})
			).data;

			for (let i = comments.length; i--; ) {
				const c = comments[i];

				logger.debug(() => {
					return `Testing if "${context.footerRe.toString()}" matches the following by "${
						c.user.type
					}":\n${c.body}\n\n`;
				});

				if (context.matches(c)) {
					comment = c;
					logger.info(`Found comment! (id: ${c.id})`);
					logger.debug(() => `Found comment: ${JSON.stringify(c, null, 2)}`);
					break;
				}
			}
		}
	} catch (e) {
		logger.warn("Error trying to read comments: " + e.message);
		logger.debug(() => e.toString());
	}

	return comment;
}

/**
 * @param {import('./global').GitHubActionClient} github
 * @param {import('./global').CommentContext} context
 * @param {string} body
 * @param {import('./global').Logger} logger
 */
async function updateComment(github, context, body, logger) {
	if (context.id == null) {
		throw new Error(`Cannot update comment if "context.id" is null`);
	}

	logger.info(`Updating comment body (id: ${context.id})...`);

	await github.issues.updateComment({
		repo: context.repo,
		owner: context.owner,
		comment_id: context.id,
		body,
	});

	logger.debug(() => `Updated comment body: ${body}`);
}

/**
 * @param {import('./global').GitHubActionClient} github
 * @param {import('./global').CommentContext} context
 * @param {string} body
 * @param {import('./global').Logger} logger
 * @returns {Promise<import('./global').CommentData>}
 */
async function createComment(github, context, body, logger) {
	logger.info("Creating new comment...");
	logger.debug(() => `New comment body: ${body}`);

	return (
		await github.issues.createComment({
			owner: context.owner,
			repo: context.repo,
			issue_number: context.issueNumber,
			body,
		})
	).data;
}

/**
 * Create a PR comment, or update one if it already exists
 * @param {import('./global').GitHubActionClient} github
 * @param {import('./global').CommentContext} context
 * @param {(comment: import('./global').CommentData | null) => string} getCommentBody
 * @param {import('./global').Logger} logger
 */
async function postOrUpdateComment(github, context, getCommentBody, logger) {
	// logger.startGroup(`Updating PR comment:`);
	logger.info(`Updating PR comment:`);

	// TODO: Need to get writer id to identify this run as having the lock

	// TODO: How will getCommentBody handle if the comment already exists but with
	// just the lock metadata? Perhaps acquireCommentLock returns if it created
	// the comment? Perhaps initiateCommentLock takes an initial template?

	let comment = await acquireCommentLock(
		github,
		context,
		getCommentBody,
		logger
	);

	if (comment) {
		context.id = comment.id;

		try {
			// TODO: Consider checking if last write was by a workflow whose run
			// number is great that ours, meaning we are out-of-date and should do
			// nothing. Perhaps pass a metadata string into getCommentBody so it can
			// put it in its DOM

			let updatedBody = getCommentBody(comment);
			if (!updatedBody.includes(context.footer)) {
				updatedBody = updatedBody + context.footer;
			}

			// TODO: Write `removeCommentLock` function to remove the comment lock
			// from updatedBody

			await updateComment(github, context, updatedBody, logger);
		} catch (e) {
			logger.info(`Error updating comment: ${e.message}`);
			logger.debug(() => e.toString());
			comment = null;
		}
	}

	if (!comment) {
		try {
			await createComment(
				github,
				context,
				getCommentBody(null) + context.footer,
				logger
			);
		} catch (e) {
			logger.info(`Error creating comment: ${e.message}`);
			logger.debug(() => e.toString());
		}
	}

	// logger.endGroup();
}

/**
 * @param {import('./global').GitHubActionContext} context
 * @param {import('./global').WorkflowRunInfo} workflowInfo
 * @returns {import('./global').CommentContext}
 */
function createCommentContext(context, workflowInfo) {
	const footer = `\n\n<sub><a href="https://github.com/andrewiggins/tachometer-reporter-action" target="_blank">tachometer-reporter-action</a> for <a href="${workflowInfo.workflowRunsHtmlUrl}" target="_blank">${workflowInfo.workflowName}</a></sub>`;
	const footerRe = new RegExp(escapeRe(footer.trim()));

	return {
		...context.repo,
		issueNumber: context.issue.number,
		id: null,
		footer,
		footerRe,
		matches(c) {
			return c.user.type === "Bot" && footerRe.test(c.body);
		},
		delayFactor: workflowInfo.jobIndex,
	};
}

module.exports = {
	createCommentContext,
	initiateCommentLock,
	postOrUpdateComment,
};
