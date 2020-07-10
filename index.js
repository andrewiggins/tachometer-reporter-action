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
		const comments = (await github.issues.listComments(commentInfo)).data;
		for (let i = comments.length; i--; ) {
			const c = comments[i];
			if (
				c.user.type === "Bot" &&
				/<sub>[\s\n]*tachometer-reporter-action/.test(c.body)
			) {
				commentId = c.id;
				break;
			}
		}
	} catch (e) {
		console.log("Error checking for previous comments: " + e.message);
	}

	if (commentId) {
		try {
			await github.issues.updateComment({
				...context.repo,
				comment_id: commentId,
				body: comment.body,
			});
		} catch (e) {
			commentId = null;
		}
	}

	if (!commentId) {
		try {
			await github.issues.createComment(comment);
		} catch (e) {
			console.log(`Error creating comment: ${e.message}`);
		}
	}
	logger.endGroup();
}

/**
 * @typedef {{ summary: string; markdown: string; }} Report
 * @param {import('tachometer/lib/json-output').JsonOutputFile} tachResults
 * @returns {Report}
 */
function buildReport(tachResults) {
	return {
		summary: "One line summary of results",
		markdown: "## Benchmark Results Markdown",
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
