const { readFile } = require("fs").promises;

/**
 * Create a PR comment, or update one if it already exists
 * @param {GitHubActionClient} github,
 * @param {GitHubActionContext} context
 * @param {string} commentMarkdown
 * @param {Logger} logger
 */
async function postOrUpdateComment(github, context, commentMarkdown, logger) {
	const commentInfo = {
		...context.repo,
		issue_number: context.issue.number,
	};

	const comment = {
		...commentInfo,
		body: commentMarkdown + "\n\n<sub>tachometer-reporter-action</sub>", // used to update this comment later
	};

	logger.startGroup(`Updating PR comment`);
	let commentId;
	try {
		logger.info(`Looking for existing comment...`);
		const comments = (await github.issues.listComments(commentInfo)).data;
		for (let i = comments.length; i--; ) {
			const c = comments[i];
			if (
				c.user.type === "Bot" &&
				/<sub>[\s\n]*tachometer-reporter-action/.test(c.body)
			) {
				commentId = c.id;
				logger.info(`Found comment! (id: ${c.id})`);
				logger.debug(() => `Found comment: ${JSON.stringify(c, null, 2)}`);
				break;
			}
		}
	} catch (e) {
		logger.info("Error checking for previous comments: " + e.message);
	}

	if (commentId) {
		try {
			logger.info(`Updating comment (id: ${commentId})...`);
			await github.issues.updateComment({
				...context.repo,
				comment_id: commentId,
				body: comment.body,
			});
		} catch (e) {
			logger.info(`Error updating comment: ${e.message}`);
			commentId = null;
		}
	}

	if (!commentId) {
		try {
			logger.info(`Creating new comment...`);
			await github.issues.createComment(comment);
		} catch (e) {
			logger.info(`Error creating comment: ${e.message}`);
		}
	}
	logger.endGroup();
}

/**
 * @typedef {{ summary: string; markdown: string; }} Report
 * @param {import('tachometer/lib/json-output').JsonOutputFile} tachResults
 * @param {string | null} baseVersion
 * @param {string | null} localVersion
 * @returns {Report}
 */
function buildReport(tachResults, baseVersion, localVersion) {
	return {
		summary: "One line summary of results",
		markdown: `## Benchmark Results Markdown \n<div id="test-1" style="color: red"><table><tbody><tr><td>Cell 1</td><td>Cell 2</td></tr></tbody></table></div>\n<p id="test-2">A paragraph</p>\n`,
	};
}

/** @type {Logger} */
const defaultLogger = {
	warn(getMsg) {
		console.warn(getMsg);
	},
	info(getMsg) {
		console.log(getMsg);
	},
	debug() {},
	startGroup(name) {
		console.group(name);
	},
	endGroup() {
		console.groupEnd();
	},
};

/**
 * @typedef {ReturnType<typeof import('@actions/github').getOctokit>} GitHubActionClient
 * @typedef {typeof import('@actions/github').context} GitHubActionContext
 * @typedef {{ path: string; }} Inputs
 * @typedef {{ warn(msg: string): void; info(msg: string): void; debug(getMsg: () => string): void; startGroup(name: string): void; endGroup(): void; }} Logger
 *
 * @param {GitHubActionClient} github
 * @param {GitHubActionContext} context
 * @param {Inputs} inputs
 * @param {Logger} [logger]
 *
 * @returns {Promise<Report>}
 */
async function reportTachResults(
	github,
	context,
	inputs,
	logger = defaultLogger
) {
	const tachResults = JSON.parse(await readFile(inputs.path, "utf8"));
	const report = buildReport(tachResults);

	await postOrUpdateComment(github, context, report.markdown, logger);
	return report;
}

module.exports = {
	buildReport,
	reportTachResults,
};
