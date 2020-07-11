const { readFile } = require("fs").promises;
const { UAParser } = require("ua-parser-js");

/** @jsx h */

function h(tag, attrs, ...children) {
	let attrStr = "";
	for (let key in attrs) {
		attrStr += ` ${key}="${attrs[key]}"`;
	}

	return `<${tag} ${attrStr}>${children}</${tag}>`;
}

/**
 * @param {BenchmarkResult["browser"]} browser
 */
function getBrowserConfigName(browser) {
	let s = browser.name;
	if (browser.headless) {
		s += "-headless";
	}
	if (browser.remoteUrl) {
		s += `\n@${browser.remoteUrl}`;
	}
	if (browser.userAgent !== "") {
		// We'll only have a user agent when using the built-in static server.
		// TODO Get UA from window.navigator.userAgent so we always have it.
		const ua = new UAParser(browser.userAgent).getBrowser();
		s += `\n${ua.version}`;
	}
	return s;
}

/**
 * @param {BenchmarkResult[]} benchmarks
 */
function renderTable(benchmarks) {
	return (
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
							<td>{b.bytesSent}</td>
						</tr>
					);
				})}
			</tbody>
		</table>
	);
}

/**
 * @typedef {{ summary: string; markdown: string; }} Report
 * @typedef {JsonOutputFile} TachResults
 * @typedef {TachResults["benchmarks"][0]} BenchmarkResult
 *
 * @param {TachResults} tachResults
 * @param {string | null} localVersion
 * @param {string | null} baseVersion
 *
 * @returns {Report}
 */
function buildReport(tachResults, localVersion, baseVersion) {
	const benchmarkNames = new Set();
	const browserNames = new Set();

	for (let benchmark of tachResults.benchmarks) {
		benchmarkNames.add(benchmark.name);
		browserNames.add(getBrowserConfigName(benchmark.browser));
	}

	// Group by benchmark name then browser
	/** @type {Map<string, Map<string, TachResults["benchmarks"]>>} */
	const benchmarks = new Map();
	for (let bench of tachResults.benchmarks) {
		if (!benchmarks.has(bench.name)) {
			benchmarks.set(bench.name, new Map());
		}

		const browserName = getBrowserConfigName(bench.browser);
		const benchBrowsers = benchmarks.get(bench.name);
		if (!benchBrowsers.has(browserName)) {
			benchBrowsers.set(browserName, []);
		}

		benchBrowsers.get(browserName).push(bench);
	}

	// Generate tables for each benchmark/browser combination
	const tables = [];
	for (let benchName of benchmarkNames) {
		for (let browserName of browserNames) {
			tables.push(renderTable(benchmarks.get(benchName).get(browserName)));
		}
	}

	return {
		summary: "One line summary of results",
		markdown: `## Benchmark Results Markdown \n<div id="test-1">${tables[0]}</div>`,
	};
}

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

	await postOrUpdateComment(github, context, report.markdown, logger);
	return report;
}

module.exports = {
	buildReport,
	reportTachResults,
};
