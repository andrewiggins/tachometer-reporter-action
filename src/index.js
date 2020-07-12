const { readFile } = require("fs").promises;
const { renderTable } = require("./html");

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

/** @jsx h */

/**
 * @typedef {import('./global').JsonOutputFile} TachResults
 * @typedef {TachResults["benchmarks"][0]} BenchmarkResult
 * @typedef {{ summary: string; body: string; results: TachResults["benchmarks"]; }} BenchmarkReport
 * @typedef {string} Report Results of
 * Tachometer grouped by benchmark name, then browser
 *
 * @param {TachResults} tachResults
 * @param {string | null} localVersion
 * @param {string | null} baseVersion
 *
 * @returns {Report}
 */
function buildReport(tachResults, localVersion, baseVersion) {
	// TODO: Generate summaries
	// TODO: Write comment update code
	// TODO: Determine if we can render `Running...` status at start of job
	//		- might need to add a label/id input values so we can update comments
	// 			before we have results
	// TODO: Consider improving names (likely needs to happen in runner repo)
	//		- "before" and "this PR"
	//		- Allow different names for local runs and CI runs
	// 		- Allowing aliases
	// 		- replace `base-version` with `branch@SHA`

	return renderTable({ benchmarks: tachResults.benchmarks });
}

/**
 * @param {GitHubActionContext} context
 * @param {Report} report
 * @param {CommentData | null} comment
 */
function getCommentBody(context, report, comment) {
	// TODO: Update comment body
	// TODO: Include which action generated the results (e.g. Main#13)
	// TODO: Add tests for getCommentBody
	//		- new comment (null comment arg)
	//		- existing comment with no existing id
	//		- existing comment with existing id & replace
	//		- existing comment with existing id & no replace

	let body = [
		"## Tachometer Benchmark Results",
		"",
		"### Summary",
		"<sub>local_version vs base_version</sub>",
		"",
		// TODO: Consider if numbers should inline or below result
		"- test_bench: unsure 🔍 *-4.10ms - +5.24ms (-10% - +12%)*",
		"",
		"### Results",
		"",
		report,
	].join("\n");

	return body;
}

/**
 * Create a PR comment, or update one if it already exists
 *
 * @typedef {import('@octokit/types').IssuesGetCommentResponseData} CommentData
 *
 * @param {GitHubActionClient} github,
 * @param {GitHubActionContext} context
 * @param {(comment: CommentData | null) => string} getCommentBody
 * @param {Logger} logger
 */
async function postOrUpdateComment(github, context, getCommentBody, logger) {
	const footer = `\n\n<a href="https://github.com/andrewiggins/tachometer-reporter-action"><sub>tachometer-reporter-action</sub></a>`; // used to update this comment later
	const commentInfo = {
		...context.repo,
		issue_number: context.issue.number,
	};

	logger.startGroup(`Updating PR comment`);

	/** @type {CommentData} */
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
 * @typedef {{ path: string; localVersion: string; baseVersion: string; }} Inputs
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
	const report = buildReport(
		tachResults,
		inputs.localVersion,
		inputs.baseVersion
	);

	await postOrUpdateComment(
		github,
		context,
		(comment) => {
			const body = getCommentBody(context, report, comment);
			logger.debug(() => "New Comment Body: " + body);
			return body;
		},
		logger
	);
	return report;
}

module.exports = {
	buildReport,
	getCommentBody,
	reportTachResults,
};
