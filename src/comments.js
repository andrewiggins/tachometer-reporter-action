function acquireCommentLock() {
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
 * Create a PR comment, or update one if it already exists
 * @param {import('./global').GitHubActionClient} github,
 * @param {import('./global').GitHubActionContext} context
 * @param {(comment: import('./global').CommentData | null) => string} getCommentBody
 * @param {import('./global').Logger} logger
 */
async function postOrUpdateComment(github, context, getCommentBody, logger) {
	const footer = `\n\n<a href="https://github.com/andrewiggins/tachometer-reporter-action"><sub>tachometer-reporter-action</sub></a>`;
	const commentInfo = {
		...context.repo,
		issue_number: context.issue.number,
	};

	logger.startGroup(`Updating PR comment`);

	/** @type {import('./global').CommentData} */
	let comment;
	try {
		logger.info(`Looking for existing comment...`);
		const comments = (await github.issues.listComments(commentInfo)).data;
		for (let i = comments.length; i--; ) {
			const c = comments[i];
			if (
				c.user.type === "Bot" &&
				/<sub>[\s\n]*tachometer-reporter-action/.test(c.body)
			) {
				comment = c;
				logger.info(`Found comment! (id: ${c.id})`);
				logger.debug(() => `Found comment: ${JSON.stringify(c, null, 2)}`);
				break;
			}
		}
	} catch (e) {
		logger.info("Error checking for previous comments: " + e.message);
	}

	if (comment) {
		try {
			logger.info(`Updating comment (id: ${comment.id})...`);
			await github.issues.updateComment({
				...context.repo,
				comment_id: comment.id,
				body: getCommentBody(comment) + footer,
			});
		} catch (e) {
			logger.info(`Error updating comment: ${e.message}`);
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
		}
	}

	logger.endGroup();
}

module.exports = {
	postOrUpdateComment,
};
