const { readFile } = require("fs").promises;
const glob = require("@actions/glob");
const {
	h,
	getCommentBody,
	Summary,
	Status,
	ResultsEntry,
} = require("./getCommentBody");
const { parseContext } = require("./utils/github");
const { createCommentContext, postOrUpdateComment } = require("./comments");
const { normalizeResults } = require("./utils/tachometer");
const {
	getMeasurementId,
	getReportId,
	defaultMeasure,
	defaultMeasureId,
} = require("./utils/hash");

/**
 * Given an array and a list of indexes into that array, return a new array with
 * just the values from the indexes specified
 * @template T
 * @param {T[]} array
 * @param {number[]} indexes
 * @returns {T[]}
 */
function pickArray(array, indexes) {
	let newArray = [];
	for (let index of indexes) {
		newArray.push(array[index]);
	}
	return newArray;
}

/**
 * @param {string} commitSha
 * @param {import('./global').ActionInfo} benchmarkAction
 * @param {Pick<import('./global').Inputs, 'prBenchName' | 'baseBenchName' | 'defaultOpen' | 'reportId' | 'summarize'>} inputs
 * @param {import('./global').PatchedTachResults} tachResults
 * @param {boolean} [isRunning]
 * @returns {import('./global').Report}
 */
function buildReport(
	commitSha,
	benchmarkAction,
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

	/** @type {import("./global").MeasurementSummary[]} */
	let summaries = [];

	if (tachResults) {
		tachResults = normalizeResults(tachResults);
		benchmarks = tachResults.benchmarks;

		// First, group bench indexes by same measurements
		let measurementIndexes = new Map();
		for (let i = 0; i < benchmarks.length; i++) {
			let bench = benchmarks[i];
			let measurementId =
				bench.measurement === defaultMeasure
					? defaultMeasureId
					: getMeasurementId(bench.measurement);

			if (!measurementIndexes.has(measurementId)) {
				measurementIndexes.set(measurementId, []);
			}

			measurementIndexes.get(measurementId).push(i);
		}

		// Now, group the actual benchmark results by measurement. We modify the
		// "differences" array to only include the differences with other benchmarks
		// of the same measurement, using the indexes we determined in the loop
		// above.
		resultsByMeasurement = new Map();
		for (let [measurementId, benchIndexes] of measurementIndexes.entries()) {
			if (!resultsByMeasurement.has(measurementId)) {
				resultsByMeasurement.set(measurementId, []);
			}

			for (let benchIndex of benchIndexes) {
				let bench = benchmarks[benchIndex];
				resultsByMeasurement.get(measurementId).push({
					...bench,

					// Results of a single benchmark may not have the differences array
					// defined. Leave it as is in that case.
					differences: bench.differences
						? pickArray(bench.differences, benchIndexes)
						: bench.differences,
				});
			}
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

	if (resultsByMeasurement) {
		for (let [measurementId, benches] of resultsByMeasurement) {
			const measurement = benches[0].measurement;
			if (
				inputs.summarize === true ||
				inputs.summarize.includes(measurement.name ?? "")
			) {
				// TODO: Need to adjust benches differences array to accommodate reduced
				// comparisons to just benches of same measurement. Handcrafted test
				// results file doesn't appropriately replicate this scenario
				summaries.push({
					measurementId,
					measurement,
					summary: (
						<Summary
							reportId={reportId}
							measurementId={measurementId}
							title={title}
							benchmarks={benches}
							prBenchName={inputs.prBenchName}
							baseBenchName={inputs.baseBenchName}
							actionInfo={benchmarkAction}
							isRunning={isRunning}
						/>
					),
				});
			}
		}
	} else if (isRunning) {
		// We don't have results meaning we don't know what measurements this report
		// will use, so default to defaultMeasure for now
		summaries.push({
			measurementId: defaultMeasureId,
			measurement: defaultMeasure,
			summary: (
				<Summary
					reportId={reportId}
					measurementId={defaultMeasureId}
					title={title}
					benchmarks={benchmarks}
					prBenchName={inputs.prBenchName}
					baseBenchName={inputs.baseBenchName}
					actionInfo={benchmarkAction}
					isRunning={isRunning}
				/>
			),
		});
	}

	return {
		id: reportId,
		title,
		prBenchName: inputs.prBenchName,
		baseBenchName: inputs.baseBenchName,
		actionInfo: benchmarkAction,
		isRunning,
		status: isRunning ? (
			<Status actionInfo={benchmarkAction} icon={true} />
		) : null,
		body: (
			<ResultsEntry
				reportId={reportId}
				benchmarks={benchmarks}
				resultsByMeasurement={resultsByMeasurement}
				actionInfo={benchmarkAction}
				commitSha={commitSha}
			/>
		),
		summaries,
	};
}

/** @type {Partial<import('./global').Inputs>} */
const defaultInputs = {
	reportId: null,
	initialize: null,
	prBenchName: null,
	baseBenchName: null,
	summarize: true,
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
async function reportTachRunning(github, context, inputs, logger) {
	if (
		context.eventName === "workflow_run" &&
		context.payload.action !== "requested"
	) {
		logger.info(
			`This workflow as trigged by a workflow_run ${context.payload.action} event. Nothing to do at this stage (comment will be updated in main stage).`
		);
		return null;
	}

	const parsedContext = parseContext(context, logger);
	if (parseContext == null) {
		return null;
	}

	const { pr, benchmark: benchmarkAction } = parsedContext;

	let report;
	if (inputs.reportId) {
		report = buildReport(pr.sha, benchmarkAction, inputs, null, true);
	} else if (inputs.initialize !== true) {
		logger.info(
			'No report-id provided and initialize is not set to true. Skipping updating comment with "Running..." status.'
		);

		return null;
	}

	await postOrUpdateComment(
		github,
		createCommentContext(pr, benchmarkAction, report?.id, inputs.initialize),
		(comment) => getCommentBody(inputs, report, comment?.body, logger),
		logger
	);

	if (report) {
		return {
			...report,
			status: report.status?.toString(),
			body: report.body?.toString(),
			summaries: report.summaries?.map((m) => ({
				measurementId: m.measurementId,
				measurement: m.measurement,
				summary: m.summary.toString(),
			})),
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
 * @returns {Promise<import('./global').SerializedReport[] | null>}
 */
async function reportTachResults(github, context, inputs, logger) {
	inputs = { ...defaultInputs, ...inputs };

	if (
		context.eventName === "workflow_run" &&
		context.payload.action !== "completed"
	) {
		logger.info(
			`This workflow as trigged by a workflow_run ${context.payload.action} event. Nothing to do at this stage (comment was initialized in "pre" stage).`
		);
		return null;
	}

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

	const parsedContext = parseContext(context, logger);
	if (parsedContext == null) {
		return null;
	}

	const {
		pr,
		benchmark: benchmarkAction,
		reporting: reportingAction,
	} = parsedContext;

	logger.debug(() => "PR Context: " + JSON.stringify(pr, null, 2));
	logger.debug(
		() => "Benchmark Info: " + JSON.stringify(benchmarkAction, null, 2)
	);
	logger.debug(
		() => "Reporting Info: " + JSON.stringify(reportingAction, null, 2)
	);

	const globber = await glob.create(inputs.path, {
		followSymbolicLinks: inputs.followSymbolicLinks,
	});
	const files = await globber.glob();
	if (files.length == 0) {
		logger.warn(`No files were found matching the pattern "${inputs.path}".`);
		return [];
	}

	const reports = [];
	for (const file of files) {
		/** @type {import('./global').TachResults} */
		const tachResults = await readFile(file, "utf8").then((contents) =>
			JSON.parse(contents)
		);

		let report;
		if (files.length == 1) {
			// Only use report ID if one result file is matched
			report = buildReport(pr.sha, benchmarkAction, inputs, tachResults, false);
		} else {
			// If multiple reports are globbed, then the report-id input should be
			// ignored since all reports will share the same reportId which is used in
			// matching the HTML. In other words, if multiple reports are globbed then
			// each report needs a unique id. As such, the report-id input cannot be
			// used for every globbed result file.
			report = buildReport(
				pr.sha,
				benchmarkAction,
				{ ...inputs, reportId: null },
				tachResults,
				false
			);
		}

		reports.push(report);
	}

	await postOrUpdateComment(
		github,
		createCommentContext(
			pr,
			benchmarkAction,
			inputs.reportId,
			inputs.initialize
		),
		(comment) => {
			let body = comment?.body;
			for (let report of reports) {
				body = getCommentBody(inputs, report, body, logger);
			}

			return body;
		},
		logger
	);

	return reports.map((report) => ({
		...report,
		status: report.status?.toString(),
		body: report.body?.toString(),
		summaries: report.summaries?.map((m) => ({
			measurementId: m.measurementId,
			measurement: m.measurement,
			summary: m.summary.toString(),
		})),
	}));
}

module.exports = {
	buildReport,
	reportTachRunning,
	reportTachResults,
};
