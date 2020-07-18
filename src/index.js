const { readFile } = require("fs").promises;
const crypto = require("crypto");
const {
	h,
	BenchmarkSection,
	Summary,
	SummaryList,
	ResultsEntry,
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
 * @param {import('./global').CommentData | null} comment
 */
function getCommentBody(inputs, report, comment) {
	// TODO: Update comment body

	/** @type {string[]} */
	let body = ["<h2>📊 Tachometer Benchmark Results</h2>\n"];

	if (report.summary) {
		body.push(
			"<h3>Summary</h3>\n",
			// TODO: Should these be grouped by how they are summarized in case not
			// all benchmarks compare the same?
			`<sub>${report.prBenchName} vs ${report.baseBenchName}</sub>\n`,
			(<SummaryList>{[report.summary]}</SummaryList>).toString(),
			""
		);
	}

	// TODO: Consider modifying report to return a ResultEntry (just the <ul> and
	// <table>) and generate the BenchmarkSection here. That way the "pre" action can
	// just generate a fake report with a body and summary property that says something
	// like "Running in <a>Main #13</a>..."
	body.push("<h3>Results</h3>\n");
	body.push(
		(
			<BenchmarkSection report={report} open={inputs.defaultOpen}>
				{report.body}
			</BenchmarkSection>
		).toString()
	);

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
			const body = getCommentBody(inputs, report, comment);
			logger.debug(
				() => `${comment ? "Updated" : "New"} Comment Body: ${body}`
			);
			return body;
		},
		logger
	);

	return {
		...report,
		body: report.body.toString(),
		summary: report.summary.toString(),
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
			const body = getCommentBody(inputs, report, comment);
			logger.debug(
				() => `${comment ? "Updated" : "New"} Comment Body: ${body}`
			);
			return body;
		},
		logger
	);

	return {
		...report,
		body: report.body.toString(),
		summary: report.summary.toString(),
	};
}

module.exports = {
	buildReport,
	getCommentBody,
	reportTachRunning,
	reportTachResults,
};
