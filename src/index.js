const { readFile } = require("fs").promises;
const { UAParser } = require("ua-parser-js");
const prettyBytes = require("pretty-bytes");
const { h } = require("./html");
const { buildTableData, renderTable3 } = require("./tachometer-utils");

/** @jsx h */

/**
 * @param {string} benchName
 * @param {string} browserName
 * @param {string} summary
 * @param {BenchmarkResult[]} benchmarks
 */
function renderTable(benchName, browserName, summary, benchmarks) {
	return (
		<div id="test-1">
			<table>
				<thead>
					<tr>
						<th>Version</th>
						<th>Bytes Sent</th>
					</tr>
				</thead>
				<tbody>
					{benchmarks.map((b) => {
						return (
							<tr>
								<td>{b.version}</td>
								<td>{prettyBytes(b.bytesSent)}</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}

/**
 * @param {import('./tachometer-utils').TableData} props
 */
function renderTable2({ fixed, unfixed }) {
	const { dimensions, results } = unfixed;
	return (
		<div id="test-1">
			<table>
				<thead>
					<tr>
						{dimensions.map((d) => (
							<th>{d.label}</th>
						))}
					</tr>
				</thead>
				<tbody>
					{results.map((b) => {
						return (
							<tr>
								{dimensions.map((d) => (
									<td>{d.format(b)}</td>
								))}
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}

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
	// return renderTable2(buildTableData(tachResults.benchmarks));
	return renderTable3({ benchmarks: tachResults.benchmarks });
}

/**
 * @param {GitHubActionContext} context
 * @param {Report} report
 * @param {CommentData} [comment]
 */
function getCommentBody(context, report, comment) {
	// TODO: Update comment body

	let body = "## Benchmark Results Markdown\n";
	// for (let [benchName, browsers] of report) {
	// 	for (let [browserName, benchReport] of browsers) {
	// 		body += benchReport.body;
	// 	}
	// }

	return body + report;
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
	const footer = "\n\n<sub>tachometer-reporter-action</sub>"; // used to update this comment later
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
		(comment) => getCommentBody(context, report, comment),
		logger
	);
	return report;
}

module.exports = {
	buildReport,
	reportTachResults,
};
