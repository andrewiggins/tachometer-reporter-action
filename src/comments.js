/** @type {(c: import('./global').CommentData) => boolean} */
const commentMatcher = (c) =>
	c.user.type === "Bot" &&
	/<sub>[\s\n]*tachometer-reporter-action/.test(c.body);

const footer = `\n\n<a href="https://github.com/andrewiggins/tachometer-reporter-action"><sub>tachometer-reporter-action</sub></a>`;

async function initiateCommentLock() {
	// TODO: Consider adding an initiateCommentLock function which finds all
	// workflow runs associated with this PR and searches for runs whose jobs
	// contain this action. The job whose run_id and job/step index is first
	// creates a new comment. All others wait for comment to be created.
	//
	// Creating a comment per workflow def should simplify this a bit since you'll
	// only have to search the jobs for the current workflow instead of trying to
	// find all workflow runs. Would mean the footer and comment matcher needs to
	// be customized per workflow with the workflow name.
	//
	// Don't worry about steps since steps must run sequentially. Multiple
	// reporter actions in one job can't parallelly try to initiate comment lock.
}

async function acquireCommentLock() {
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
}

/**
 * Read a comment matching with matching regex
 * @typedef {{ owner: string; repo: string; issue_number: number; }} CommentInfo
 * @param {import('./global').GitHubActionClient} github
 * @param {CommentInfo} commentInfo
 * @param {(c: import('./global').CommentData) => boolean} matches
 * @param {import('./global').Logger} logger
 */
async function readComment(github, commentInfo, matches, logger) {
	/** @type {import('./global').CommentData} */
	let comment;

	try {
		logger.info(`Trying to read matching comment...`);

		// Assuming comment is in the first page of results for now...
		// https://docs.github.com/en/rest/reference/issues#list-issue-comments
		const comments = (await github.issues.listComments(commentInfo)).data;
		for (let i = comments.length; i--; ) {
			const c = comments[i];
			if (matches(c)) {
				comment = c;
				logger.info(`Found comment! (id: ${c.id})`);
				logger.debug(() => `Found comment: ${JSON.stringify(c, null, 2)}`);
				break;
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
 * @param {CommentInfo} commentInfo
 * @param {number} commentId
 * @param {string} body
 * @param {import('./global').Logger} logger
 */
async function writeComment(github, commentInfo, commentId, body, logger) {
	logger.info(`Writing comment body (id: ${commentId})...`);
	await github.issues.updateComment({
		repo: commentInfo.repo,
		owner: commentInfo.owner,
		comment_id: commentId,
		body,
	});

	logger.debug(() => `New body: ${body}`);
}

/**
 * Create a PR comment, or update one if it already exists
 * @param {import('./global').GitHubActionClient} github
 * @param {import('./global').GitHubActionContext} context
 * @param {(comment: import('./global').CommentData | null) => string} getCommentBody
 * @param {import('./global').Logger} logger
 */
async function postOrUpdateComment(github, context, getCommentBody, logger) {
	const commentInfo = {
		...context.repo,
		issue_number: context.issue.number,
	};

	// logger.startGroup(`Updating PR comment:`);
	logger.info(`Updating PR comment:`);

	// TODO: Need to get writer id to identify this run as having the lock

	// TODO: How will getCommentBody handle if the comment already exists but with
	// just the lock metadata? Perhaps acquireCommentLock returns if it created
	// the comment? Perhaps initiateCommentLock takes an initial template?

	// TODO: Replace with acquireCommentLock. Should acquireCommentLock return the
	// comment once it is locked so we don't need to read it again?
	let comment = await readComment(github, commentInfo, commentMatcher, logger);

	if (comment) {
		try {
			let updatedBody = getCommentBody(comment);
			if (!updatedBody.includes(footer)) {
				updatedBody = updatedBody + footer;
			}

			// TODO: Write `removeCommentLock` function to remove the comment lock
			// from updatedBody

			await writeComment(github, commentInfo, comment.id, updatedBody, logger);
		} catch (e) {
			logger.info(`Error updating comment: ${e.message}`);
			logger.debug(() => e.toString());
			comment = null;
		}
	}

	if (!comment) {
		try {
			logger.info(`Creating new comment...`);
			await github.issues.createComment({
				...commentInfo,
				body: getCommentBody(null) + footer,
			});
		} catch (e) {
			logger.info(`Error creating comment: ${e.message}`);
			logger.debug(() => e.toString());
		}
	}

	// logger.endGroup();
}

module.exports = {
	postOrUpdateComment,
};
