const { readFile } = require("fs").promises;
const crypto = require("crypto");
const { parse } = require("node-html-parser");
const {
	h,
	Summary,
	SummaryStatus,
	ResultsEntry,
	getSummaryId,
	getBenchmarkSectionId,
	NewCommentBody,
} = require("./html");
const { postOrUpdateComment } = require("./comments");
const { getWorkflowRunInfo, getCommit } = require("./utils/github");

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
 * @param {import('./global').WorkflowRunInfo} workflowRun
 * @param {Pick<import('./global').Inputs, 'prBenchName' | 'baseBenchName' | 'defaultOpen' | 'reportId'>} inputs
 * @param {import('./global').TachResults} tachResults
 * @param {boolean} [isRunning]
 * @returns {import('./global').Report}
 */
function buildReport(
	commitInfo,
	workflowRun,
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
		workflowRun,
		isRunning,
		// results: benchmarks,
		status: isRunning ? (
			<SummaryStatus workflowRun={workflowRun} icon={true} />
		) : null,
		body: (
			<ResultsEntry
				reportId={reportId}
				benchmarks={benchmarks}
				workflowRun={workflowRun}
				commitInfo={commitInfo}
			/>
		),
		summary:
			inputs.baseBenchName && inputs.prBenchName ? (
				<Summary
					reportId={reportId}
					title={title}
					benchmarks={benchmarks}
					prBenchName={inputs.prBenchName}
					baseBenchName={inputs.baseBenchName}
					workflowRun={workflowRun}
					isRunning={isRunning}
				/>
			) : null,
	};
}

/**
 * @param {import('./global').Inputs} inputs
 * @param {import('./global').Report} report
 * @param {string} commentBody
 * @param {import('./global').Logger} logger
 * @returns {string}
 */
function getCommentBody(inputs, report, commentBody, logger) {
	/** @type {JSX.Element} */
	let result;

	if (!commentBody) {
		result = <NewCommentBody report={report} inputs={inputs} />;
	} else if (report.isRunning) {
		// If report is running, just update the status fields
		const commentHtml = parse(commentBody);

		const summaryId = getSummaryId(report.id);
		const summaryStatus = commentHtml.querySelector(`#${summaryId} .status`);

		const bodyId = getBenchmarkSectionId(report.id);
		const bodyStatus = commentHtml.querySelector(`#${bodyId} .status`);

		if (bodyStatus && summaryStatus) {
			summaryStatus.set_content(report.status);
			bodyStatus.set_content(report.status);
		}

		// If bodyStatus or summaryStatus doesn't exist, leave comment unmodified
		result = commentHtml;
	}

	if (!result) {
		// If something failed above, just generate a new comment

		// TODO: Update comment body with new results to support multiple benchmarks
		result = <NewCommentBody report={report} inputs={inputs} />;
	}

	return result.toString();
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
	prBenchName: null,
	baseBenchName: null,
	reportId: null,
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
	/** @type {[ import('./global').WorkflowRunInfo, import('./global').CommitInfo ]} */
	const [workflowRun, commitInfo] = await Promise.all([
		getWorkflowRunInfo(context, github, logger),
		getCommit(context, github),
	]);

	const report = buildReport(commitInfo, workflowRun, inputs, null, true);

	await postOrUpdateComment(
		github,
		context,
		(comment) => {
			const body = getCommentBody(inputs, report, comment?.body, logger);
			logger.debug(
				() => `${comment ? "Updated" : "New"} Comment Body: ${body}`
			);
			return body;
		},
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

	/** @type {[ import('./global').TachResults, import('./global').WorkflowRunInfo, import('./global').CommitInfo ]} */
	const [tachResults, workflowRun, commitInfo] = await Promise.all([
		readFile(inputs.path, "utf8").then((contents) => JSON.parse(contents)),
		getWorkflowRunInfo(context, github, logger),
		getCommit(context, github),
	]);

	const report = buildReport(
		commitInfo,
		workflowRun,
		inputs,
		tachResults,
		false
	);

	await postOrUpdateComment(
		github,
		context,
		(comment) => {
			const body = getCommentBody(inputs, report, comment?.body, logger);
			logger.debug(
				() => `${comment ? "Updated" : "New"} Comment Body: ${body}`
			);
			return body;
		},
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
