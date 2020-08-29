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
const { patchResults } = require("./utils/tachometer");

function hash(s) {
	return crypto
		.createHash("sha1")
		.update(s)
		.digest("base64")
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=*$/, "");
}

/**
 * @param {import('./global').Measurement} measurement
 */
function getMeasurementId(measurement) {
	let otherData = "";
	if (measurement.mode == "expression") {
		otherData = measurement.expression;
	} else if (measurement.mode == "performance") {
		otherData = measurement.entryName;
	}

	return hash(`${measurement.name}::${measurement.mode}::${otherData}`);
}

/**
 * @param {import('./global').PatchedBenchmarkResult[]} benchmarks
 */
function getReportId(benchmarks) {
	/** @type {(b: import('./global').BenchmarkResult) => string} */
	const getBrowserKey = (b) =>
		b.browser.name + (b.browser.headless ? "-headless" : "");

	const benchKeys = benchmarks.map((b) => {
		const measureId = getMeasurementId(b.measurement);
		return [b.name, b.version, measureId, getBrowserKey(b)].join(",");
	});

	return hash(benchKeys.join("::"));
}

/**
 * @param {import("./global").CommitInfo} commitInfo
 * @param {import('./global').ActionInfo} actionInfo
 * @param {Pick<import('./global').Inputs, 'prBenchName' | 'baseBenchName' | 'defaultOpen' | 'reportId'>} inputs
 * @param {import('./global').PatchedTachResults} tachResults
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

	/** @type {import("./global").PatchedBenchmarkResult[]} */
	let benchmarks;

	/** @type {import('./global').ResultsByMeasurement} */
	let resultsByMeasurement;

	if (tachResults) {
		tachResults = patchResults(tachResults);
		benchmarks = tachResults.benchmarks;

		resultsByMeasurement = new Map();
		for (let bench of benchmarks) {
			let measurementId = getMeasurementId(bench.measurement);
			if (!resultsByMeasurement.has(measurementId)) {
				resultsByMeasurement.set(measurementId, []);
			}

			resultsByMeasurement.get(measurementId).push(bench);
		}
	}

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
				resultsByMeasurement={resultsByMeasurement}
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
 * @returns {Promise<import('./global').SerializedReport | null>}
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

	let report;
	if (inputs.reportId) {
		report = buildReport(commitInfo, actionInfo, inputs, null, true);
	} else if (inputs.initialize !== true) {
		logger.info(
			'No report-id provided and initialize is not set to true. Skipping updating comment with "Running..." status.'
		);

		return null;
	}

	await postOrUpdateComment(
		github,
		createCommentContext(context, actionInfo, report?.id, inputs.initialize),
		(comment) => getCommentBody(inputs, report, comment?.body, logger),
		logger
	);

	if (report) {
		return {
			...report,
			status: report.status?.toString(),
			body: report.body?.toString(),
			summary: report.summary?.toString(),
		};
	} else {
		return null;
	}
}

/**
 * @param {import('./global').GitHubActionClient} github
 * @param {import('./global').GitHubActionContext} context
 * @param {import('./global').Inputs} inputs
 * @param {import('./global').Logger} [logger]
 * @returns {Promise<import('./global').SerializedReport | null>}
 */
async function reportTachResults(
	github,
	context,
	inputs,
	logger = defaultLogger
) {
	inputs = { ...defaultInputs, ...inputs };

	if (inputs.path == null) {
		if (inputs.initialize == true) {
			logger.info(
				`No path option was provided and initialize was set to true. Nothing to do at this stage (comment was initialized in "pre" stage).`
			);
			return null;
		} else {
			throw new Error(
				`Either a path option must be provided or initialize must be set to "true". Path option was not provided and initialize was not set to true.`
			);
		}
	}

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
	reportTachRunning,
	reportTachResults,
};
