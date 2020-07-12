const { readFile } = require("fs").promises;
const crypto = require("crypto");
const { h, Table, Summary, SummaryList } = require("./html");
const { postOrUpdateComment } = require("./comments");
const { getWorkflowRun } = require("./utils/github");

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
 * @param {import('./global').WorkflowRunData} workflowRun
 * @param {Pick<import('./global').Inputs, 'localVersion' | 'baseVersion' | 'defaultOpen' | 'reportId'>} inputs
 * @param {import('./global').TachResults} tachResults
 * @returns {import('./global').Report}
 */
function buildReport(workflowRun, inputs, tachResults) {
	// TODO: Consider improving names (likely needs to happen in runner repo)
	//		- "before" and "this PR"
	//		- Allow different names for local runs and CI runs
	// 		- Allowing aliases
	// 		- replace `base-version` with `branch@SHA`

	const benchmarks = tachResults.benchmarks;
	const reportId = inputs.reportId ? inputs.reportId : getReportId(benchmarks);

	return {
		id: reportId,
		body: (
			<Table
				reportId={reportId}
				benchmarks={benchmarks}
				workflowRun={workflowRun}
				open={inputs.defaultOpen}
			/>
		),
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

	/** @type {string[]} */
	let body = ["## 📊 Tachometer Benchmark Results\n"];

	if (report.summary) {
		body.push(
			"### Summary",
			// TODO: Should these be grouped by how they are summarized in case not
			// all benchmarks compare the same?
			`<sub>${report.localVersion} vs ${report.baseVersion}</sub>\n`,
			<SummaryList>{[report.summary]}</SummaryList>,
			""
		);
	}

	body.push("### Results\n", report.body);

	return body.join("\n");
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

const defaultInputs = {
	localVersion: null,
	baseVersion: null,
	reportId: null,
	keepOldResults: false,
	defaultOpen: false,
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
	inputs = { ...defaultInputs, ...inputs };

	const tachResults = JSON.parse(await readFile(inputs.path, "utf8"));
	const workflowRun = await getWorkflowRun(context, github);
	const report = buildReport(workflowRun, inputs, tachResults);

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
