const { readFile } = require("fs").promises;
const crypto = require("crypto");
const { parse } = require("node-html-parser");
const {
	h,
	BenchmarkResults,
	ResultEntry,
	Summary,
	SummarySection,
	getBenchmarkResultsId,
	getLatestResultsEntryId,
	getSummaryId,
	ResultsSection,
	resultsContainerId,
	summaryListId,
} = require("./html");
const { postOrUpdateComment } = require("./comments");
const { getWorkflowRun, getCommit } = require("./utils/github");

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
 * @param {import('./global').WorkflowRunData} workflowRun
 * @param {Pick<import('./global').Inputs, 'prBenchName' | 'baseBenchName' | 'defaultOpen' | 'reportId'>} inputs
 * @param {import('./global').TachResults} tachResults
 * @returns {import('./global').Report}
 */
function buildReport(commitInfo, workflowRun, inputs, tachResults) {
	// TODO: Consider improving names (likely needs to happen in runner repo)
	//    - "before" and "this PR"
	//    - Allow different names for local runs and CI runs
	//    - Allowing aliases
	//    - replace `base-bench-name` with `branch@SHA`

	const benchmarks = tachResults.benchmarks;
	const reportId = inputs.reportId ? inputs.reportId : getReportId(benchmarks);

	return {
		id: reportId,
		label: Array.from(new Set(benchmarks.map((b) => b.name))).join(", "),
		body: (
			<ResultEntry
				benchmarks={benchmarks}
				workflowRun={workflowRun}
				commitInfo={commitInfo}
			/>
		).toString(),
		summary:
			inputs.baseBenchName && inputs.prBenchName
				? (
						<Summary
							reportId={reportId}
							benchmarks={benchmarks}
							prBenchName={inputs.prBenchName}
							baseBenchName={inputs.baseBenchName}
						/>
				  ).toString()
				: null,
		results: benchmarks,
		prBenchName: inputs.prBenchName,
		baseBenchName: inputs.baseBenchName,
	};
}

/**
 * @param {import('./global').Inputs} inputs
 * @param {import('./global').Report} report
 * @param {import('./global').CommentData | null} comment
 */
function getCommentBody(inputs, report, comment) {
	// If no previous comment exists, just generate the entire comment
	if (comment == null) {
		/** @type {string[]} */
		let body = ["## 📊 Tachometer Benchmark Results\n"];

		if (report.summary) {
			body.push(
				"### Summary",
				// TODO: Should these be grouped by how they are summarized in case not
				// all benchmarks compare the same?
				`<sub>${report.prBenchName} vs ${report.baseBenchName}</sub>\n`,
				SummarySection({ children: [report.summary] }).toString(),
				""
			);
		}

		body.push(ResultsSection({ children: [report.body] }).toString());

		return body.join("\n");
	}

	// TODO: Update existing comment
	const html = parse(comment.body);
	const results = html.querySelector(`#${resultsContainerId}`);

	const existingBody = results.querySelector(`#${report.bodyId}`);
	if (existingBody) {
		if (inputs.keepOldResults) {
			// TODO: rerender body with old results as string
		} else {
			// TODO: rerender body without old results
		}
	}
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
 * @returns {Promise<import('./global').Report>}
 */
async function reportTachResults(
	github,
	context,
	inputs,
	logger = defaultLogger
) {
	inputs = { ...defaultInputs, ...inputs };

	/** @type {[ any, import('./global').WorkflowRunData, import('./global').CommitInfo ]} */
	const [tachResults, workflowRun, commitInfo] = await Promise.all([
		readFile(inputs.path, "utf8").then((contents) => JSON.parse(contents)),
		getWorkflowRun(context, github),
		getCommit(context, github),
	]);

	const report = buildReport(commitInfo, workflowRun, inputs, tachResults);

	await postOrUpdateComment(
		github,
		context,
		(comment) => {
			const body = getCommentBody(inputs, report, comment);
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
