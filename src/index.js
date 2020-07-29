const { readFile } = require("fs").promises;
const crypto = require("crypto");
const {
	h,
	getCommentBody,
	Summary,
	Status,
	ResultsEntry,
} = require("./getCommentBody");
const { getActionInfo, getCommit } = require("./utils/github");
const { createCommentContext, postOrUpdateComment } = require("./comments");

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
 * @param {import("./global").CommitInfo} commitInfo
 * @param {import('./global').ActionInfo} actionInfo
 * @param {Pick<import('./global').Inputs, 'prBenchName' | 'baseBenchName' | 'defaultOpen' | 'reportId'>} inputs
 * @param {import('./global').TachResults} tachResults
 * @param {boolean} [isRunning]
 * @returns {import('./global').Report}
 */
function buildReport(
	commitInfo,
	actionInfo,
	inputs,
	tachResults,
	isRunning = false
) {
	// TODO: Consider improving names (likely needs to happen in runner repo)
	//    - "before" and "this PR"
	//    - Allow different names for local runs and CI runs
	//    - Allowing aliases
	//    - replace `base-bench-name` with `branch@SHA`

	const benchmarks = tachResults?.benchmarks;

	let reportId;
	let title;
	if (inputs.reportId) {
		reportId = inputs.reportId;
		title = inputs.reportId;
	} else if (benchmarks) {
		reportId = getReportId(benchmarks);
		title = Array.from(new Set(benchmarks.map((b) => b.name))).join(", ");
	} else {
		throw new Error(
			"Could not determine ID for report. 'report-id' option was not provided and there are no benchmark results"
		);
	}

	return {
		id: reportId,
		title,
		prBenchName: inputs.prBenchName,
		baseBenchName: inputs.baseBenchName,
		actionInfo: actionInfo,
		isRunning,
		// results: benchmarks,
		status: isRunning ? <Status actionInfo={actionInfo} icon={true} /> : null,
		body: (
			<ResultsEntry
				reportId={reportId}
				benchmarks={benchmarks}
				actionInfo={actionInfo}
				commitInfo={commitInfo}
			/>
		),
		summary: (
			<Summary
				reportId={reportId}
				title={title}
				benchmarks={benchmarks}
				prBenchName={inputs.prBenchName}
				baseBenchName={inputs.baseBenchName}
				actionInfo={actionInfo}
				isRunning={isRunning}
			/>
		),
	};
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

/** @type {Partial<import('./global').Inputs>} */
const defaultInputs = {
	reportId: null,
	initialize: null,
	prBenchName: null,
	baseBenchName: null,
	keepOldResults: false,
	defaultOpen: false,
};

/**
 * @param {import('./global').GitHubActionClient} github
 * @param {import('./global').GitHubActionContext} context
 * @param {import('./global').Inputs} inputs
 * @param {import('./global').Logger} [logger]
 * @returns {Promise<import('./global').SerializedReport>}
 */
async function reportTachRunning(
	github,
	context,
	inputs,
	logger = defaultLogger
) {
	/** @type {[ import('./global').ActionInfo, import('./global').CommitInfo ]} */
	const [actionInfo, commitInfo] = await Promise.all([
		getActionInfo(context, github, logger),
		getCommit(context, github),
	]);

	const report = buildReport(commitInfo, actionInfo, inputs, null, true);

	await postOrUpdateComment(
		github,
		createCommentContext(context, actionInfo, report.id, inputs.initialize),
		(comment) => getCommentBody(inputs, report, comment?.body, logger),
		logger
	);

	return {
		...report,
		status: report.status?.toString(),
		body: report.body?.toString(),
		summary: report.summary?.toString(),
	};
}

/**
 * @param {import('./global').GitHubActionClient} github
 * @param {import('./global').GitHubActionContext} context
 * @param {import('./global').Inputs} inputs
 * @param {import('./global').Logger} [logger]
 * @returns {Promise<import('./global').SerializedReport>}
 */
async function reportTachResults(
	github,
	context,
	inputs,
	logger = defaultLogger
) {
	inputs = { ...defaultInputs, ...inputs };

	/** @type {[ import('./global').TachResults, import('./global').ActionInfo, import('./global').CommitInfo ]} */
	const [tachResults, actionInfo, commitInfo] = await Promise.all([
		readFile(inputs.path, "utf8").then((contents) => JSON.parse(contents)),
		getActionInfo(context, github, logger),
		getCommit(context, github),
	]);

	logger.debug(() => "Action Info: " + JSON.stringify(actionInfo, null, 2));
	logger.debug(() => "Commit Info " + JSON.stringify(commitInfo, null, 2));

	const report = buildReport(
		commitInfo,
		actionInfo,
		inputs,
		tachResults,
		false
	);

	await postOrUpdateComment(
		github,
		createCommentContext(context, actionInfo, report.id, inputs.initialize),
		(comment) => getCommentBody(inputs, report, comment?.body, logger),
		logger
	);

	return {
		...report,
		status: report.status?.toString(),
		body: report.body?.toString(),
		summary: report.summary?.toString(),
	};
}

module.exports = {
	buildReport,
	getCommentBody,
	reportTachRunning,
	reportTachResults,
};
