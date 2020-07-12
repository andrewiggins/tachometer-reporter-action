function acquireCommentLock() {
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
