const { readFile } = require("fs").promises;
const crypto = require("crypto");
const { h, Table, Summary, SummaryList } = require("./html");

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
 * @param {import('./global').BenchmarkResult[]} benchmarks
 */
function getReportId(benchmarks) {
	/** @type {(b: import('./global').BenchmarkResult) => string} */
	const getBrowserKey = (b) =>
		b.browser.name + (b.browser.headless ? "-headless" : "");

	const benchKeys = benchmarks.map((b) => {
		return `${b.name},${b.version},${getBrowserKey(b)}`;
	});

	return crypto
		.createHash("sha1")
		.update(benchKeys.join("::"))
		.digest("base64")
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=*$/, "");
}

/**
 * @param {import('./global').TachResults} tachResults
 * @param {{ localVersion: string; baseVersion: string; reportId: string; }} inputs
 * @returns {import('./global').Report}
 */
function buildReport(tachResults, inputs) {
	// TODO: Write comment update code
	// TODO: Determine if we can render `Running...` status at start of job
	//		- might need to add a label/id input values so we can update comments
	// 			before we have results
	// TODO: Consider improving names (likely needs to happen in runner repo)
	//		- "before" and "this PR"
	//		- Allow different names for local runs and CI runs
	// 		- Allowing aliases
	// 		- replace `base-version` with `branch@SHA`

	const benchmarks = tachResults.benchmarks;
	const reportId = inputs.reportId ? inputs.reportId : getReportId(benchmarks);

	return {
		id: reportId,
		body: <Table reportId={reportId} benchmarks={benchmarks} />,
		results: benchmarks,
		localVersion: inputs.localVersion,
		baseVersion: inputs.baseVersion,
		summary:
			inputs.baseVersion && inputs.localVersion ? (
				<Summary
					reportId={reportId}
					benchmarks={benchmarks}
					localVersion={inputs.localVersion}
					baseVersion={inputs.baseVersion}
				/>
			) : null,
	};
}

/**
 * @param {import('./global').GitHubActionContext} context
 * @param {import('./global').Report} report
 * @param {import('./global').CommentData | null} comment
 */
function getCommentBody(context, report, comment) {
	// TODO: Update comment body
	// TODO: Include which action generated the results (e.g. Main#13)
	// TODO: Add tests for getCommentBody
	//		- new comment (null comment arg)
	//		- new comment with no local and/or base version defined
	//		- existing comment with no existing id
	//		- existing comment with existing id & replace
	//		- existing comment with existing id & no replace
	//		- existing comment with no local and/or base version defined

	let body = ["## Tachometer Benchmark Results\n"];

	if (report.summary) {
		body.push(
			"### Summary",
			`<sub>${report.localVersion} vs ${report.baseVersion}</sub>\n`,
			// TODO: Consider if numbers should inline or below result
			// "- test_bench: unsure 🔍 *-4.10ms - +5.24ms (-10% - +12%)*",
			<SummaryList>{[report.summary]}</SummaryList>,
			""
		);
	}

	body.push("### Results\n", report.body);

	return body.join("\n");
}

/**
 * Create a PR comment, or update one if it already exists
 * @param {import('./global').GitHubActionClient} github,
 * @param {import('./global').GitHubActionContext} context
 * @param {(comment: import('./global').CommentData | null) => string} getCommentBody
 * @param {import('./global').Logger} logger
 */
async function postOrUpdateComment(github, context, getCommentBody, logger) {
	const footer = `\n\n<a href="https://github.com/andrewiggins/tachometer-reporter-action"><sub>tachometer-reporter-action</sub></a>`; // used to update this comment later
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

/** @type {import('./global').Logger} */
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
 * @param {import('./global').GitHubActionClient} github
 * @param {import('./global').GitHubActionContext} context
 * @param {import('./global').Inputs} inputs
 * @param {import('./global').Logger} [logger]
 * @returns {Promise<import('./global').Report>}
 */
async function reportTachResults(
	github,
	context,
	inputs,
	logger = defaultLogger
) {
	const tachResults = JSON.parse(await readFile(inputs.path, "utf8"));
	const report = buildReport(tachResults, inputs);

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
