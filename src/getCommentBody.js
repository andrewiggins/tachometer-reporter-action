const { parse, HTMLElement, TextNode, NodeType } = require("node-html-parser");
const {
	formatDifference,
	makeUniqueLabelFn,
	makeDifferenceDimensions,
	browserDimension,
	sampleSizeDimension,
	runtimeConfidenceIntervalDimension,
	measurementName,
} = require("./utils/tachometer");
const { defaultMeasure, defaultMeasureId } = require("./utils/hash");

const globalStatusClass = "global-status";
const statusClass = "status";
const resultEntryClass = "result-entry";

/** @type {(id: string) => string} */
const getId = (id) => `tachometer-reporter-action--${id}`;
const getResultsContainerId = () => getId("results");
const getSummaryContainerId = () => getId("summaries");

/** @type {(measurementId: string) => string} */
const getMeasurementSummaryListId = (measurementId) =>
	getId(`summaries::${measurementId}`);

/** @type {(reportId: string) => string} */
const getBenchmarkSectionId = (reportId) => getId(`results-${reportId}`);

/** @type {(measurementId: string, reportId: string) => string} */
const getSummaryId = (measurementId, reportId) =>
	getId(`summary::${measurementId}::${reportId}`);

/** @type {(reportId: string) => string} */
const getSummaryClass = (reportId) => `summary::${reportId}`;

/**
 * @typedef {(props: any) => import('node-html-parser').HTMLElement} Component
 * @param {string | Component} tag
 * @param {object} attrs
 * @param  {...any} children
 * @returns {import('node-html-parser').HTMLElement}
 */
function h(tag, attrs, ...children) {
	if (typeof tag == "function") {
		return tag({ ...attrs, children });
	}

	let id = null;
	let className = null;
	let attrStr = "";
	for (let key in attrs) {
		if (key == "id") {
			id = attrs[key];
		} else if (key == "class") {
			className = attrs[key];
		}

		if (attrs[key] != null) {
			attrStr += `${attrStr ? " " : ""}${key}="${attrs[key]}"`;
		}
	}

	const element = new HTMLElement(tag, { id, class: className }, attrStr);

	children = flattenChildren(children, element);
	element.set_content(children);

	return element;
}

function Fragment({ children }) {
	return children;
}

function flattenChildren(children, parent, flattened) {
	if (!flattened) flattened = [];

	if (!children || typeof children == "boolean") {
		// skip null/undefined/booleans
	} else if (typeof children == "number" || typeof children == "string") {
		flattened.push(new TextNode(children.toString()));
	} else if (children instanceof HTMLElement) {
		children.parentNode = parent;
		flattened.push(children);
	} else if (Array.isArray(children)) {
		for (let child of children) {
			flattenChildren(child, parent, flattened);
		}
	} else {
		flattened.push(children);
	}

	return flattened;
}

/**
 * @typedef ResultsEntryProps
 * @property {string} reportId
 * @property {import('./global').BenchmarkResult[]} benchmarks
 * @property {import('./global').ResultsByMeasurement} resultsByMeasurement
 * @property {import('./global').ActionInfo} actionInfo
 * @property {import('./global').CommitInfo} commitInfo
 *
 * @param {ResultsEntryProps} props
 */
function ResultsEntry({
	reportId,
	benchmarks,
	resultsByMeasurement,
	actionInfo,
	commitInfo,
}) {
	// Hard code what dimensions are rendered in the main table since GitHub comments
	// have limited horizontal space

	if (!Array.isArray(benchmarks)) {
		return (
			<div class={resultEntryClass}>
				<Status actionInfo={actionInfo} icon={false} />
			</div>
		);
	}

	const listDimensions = [browserDimension, sampleSizeDimension];

	const sha = commitInfo.sha.slice(0, 7);

	/** @type {JSX.Element | JSX.Element[]} */
	let table;
	if (resultsByMeasurement.size == 1) {
		const labelFn = makeUniqueLabelFn(benchmarks);
		table = <ResultsTable benchmarks={benchmarks} labelFn={labelFn} />;
	} else {
		table = [];
		for (let group of resultsByMeasurement.values()) {
			const metricName = measurementName(group[0].measurement);
			const labelFn = makeUniqueLabelFn(group);
			table.push(
				<h4>{metricName}</h4>,
				<ResultsTable benchmarks={group} labelFn={labelFn} />
			);
		}
	}

	return (
		<div class={resultEntryClass}>
			<ul>
				{listDimensions.map((dim) => {
					const uniqueValues = new Set(benchmarks.map((b) => dim.format(b)));
					return (
						<li>
							{dim.label}: {Array.from(uniqueValues).join(", ")}
						</li>
					);
				})}
				<li>{`\n\nCommit: ${sha}\n\n`}</li>
				{actionInfo.job.htmlUrl && (
					<li>
						Built by: <a href={actionInfo.job.htmlUrl}>{actionInfo.run.name}</a>
					</li>
				)}
			</ul>
			{table}
		</div>
	);
}

function ResultsTable({ benchmarks, labelFn }) {
	/** @type {import("./global").Dimension[]} */
	const tableDimensions = [
		// Custom dimension that combines Tachometer's benchmark & version dimensions
		{
			label: "Version",
			format: labelFn,
		},
		runtimeConfidenceIntervalDimension,
		...makeDifferenceDimensions(labelFn, benchmarks),
	];

	return (
		<table>
			<thead>
				<tr>
					{tableDimensions.map((d) => (
						<th>{d.label}</th>
					))}
				</tr>
			</thead>
			<tbody>
				{benchmarks.map((b) => {
					return (
						<tr>
							{tableDimensions.map((d, i) => {
								return <td align="center">{d.format(b)}</td>;
							})}
						</tr>
					);
				})}
			</tbody>
		</table>
	);
}

/**
 * @typedef BenchmarkSectionProps
 * @property {import('./global').Report} report
 * @property {boolean} open
 *
 * @param {BenchmarkSectionProps} props
 */
function BenchmarkSection({ report, open }) {
	return (
		<div
			id={getBenchmarkSectionId(report.id)}
			data-run-number={report.actionInfo.run.number.toString()}
			data-sort-key={report.title}
		>
			<details open={open ? "open" : null}>
				<summary>
					<span class={statusClass}>
						{report.isRunning ? (
							<Status actionInfo={report.actionInfo} icon={true} />
						) : null}
					</span>
					<strong>{report.title}</strong>
				</summary>
				{report.body}
			</details>
		</div>
	);
}

/**
 * @param {{ actionInfo: import('./global').ActionInfo; icon: boolean; }} props
 */
function Status({ actionInfo, icon }) {
	const href = actionInfo.job.htmlUrl;
	const label = `Currently running in ${actionInfo.run.name}…`;
	const tag = href ? "a" : "span";
	const props = {
		href,
		title: icon ? label : null,
		"aria-label": icon ? label : null,
	};

	return h(tag, props, icon ? "⏱ " : label);
}

/**
 * @typedef SummaryProps
 * @property {string} reportId
 * @property {string} measurementId
 * @property {string} title
 * @property {import('./global').BenchmarkResult[]} benchmarks
 * @property {string} prBenchName
 * @property {string} baseBenchName
 * @property {import('./global').ActionInfo | null} actionInfo
 * @property {boolean} isRunning
 *
 * @param {SummaryProps} props
 */
function Summary({
	reportId,
	measurementId,
	title,
	benchmarks,
	prBenchName,
	baseBenchName,
	actionInfo,
	isRunning,
}) {
	const benchLength = Array.isArray(benchmarks) ? benchmarks.length : -1;
	let usesDefaults = false;
	let showDiffSubtext = false;

	/** @type {JSX.Element} */
	let summaryBody;

	if (benchLength === 1) {
		const text = runtimeConfidenceIntervalDimension.format(benchmarks[0]);
		summaryBody = <span>: {text}</span>;
	} else if (benchLength > 1) {
		// Show message with instructions how to customize summary if default values used
		usesDefaults = !prBenchName || !baseBenchName;
		showDiffSubtext = true;

		let baseIndex;
		if (baseBenchName) {
			baseIndex = benchmarks.findIndex(
				(b) => b.version == baseBenchName || b.name == baseBenchName
			);
		} else {
			baseIndex = 0;
			baseBenchName = benchmarks[0]?.version ?? benchmarks[0].name;
		}

		let localIndex, localResults;
		if (prBenchName) {
			localIndex = benchmarks.findIndex(
				(b) => b.version == prBenchName || b.name == prBenchName
			);
			localResults = benchmarks[localIndex];
		} else {
			let localIndex = (baseIndex + 1) % benchLength;
			localResults = benchmarks[localIndex];
			prBenchName = localResults?.version ?? localResults.name;
		}

		if (localIndex == -1) {
			summaryBody = (
				<span>
					: Could not find benchmark matching <code>pr-bench-name</code> input:{" "}
					<code>{prBenchName}</code>
				</span>
			);
		} else if (baseIndex == -1) {
			summaryBody = (
				<span>
					: Could not find benchmark matching <code>base-bench-name</code>{" "}
					input: <code>{baseBenchName}</code>
				</span>
			);
		} else if (localIndex == baseIndex) {
			summaryBody = (
				<span>
					: <code>pr-bench-name</code> and <code>base-bench-name</code> inputs
					matched the same benchmark so cannot show comparison.
				</span>
			);
		} else {
			const diff = formatDifference(localResults.differences[baseIndex]);
			summaryBody = (
				<span>
					: {diff.label}{" "}
					<em>
						{diff.relative} ({diff.absolute})
					</em>
				</span>
			);
		}
	}

	const status = isRunning ? (
		<Status actionInfo={actionInfo} icon={true} />
	) : null;

	return (
		<div
			id={getSummaryId(measurementId, reportId)}
			class={getSummaryClass(reportId)}
			data-run-number={actionInfo.run.number.toString()}
		>
			<span class={statusClass}>{status}</span>
			{title}
			{summaryBody}
			{showDiffSubtext && [
				<br />,
				<sup>
					{prBenchName} vs {baseBenchName}
					{usesDefaults && [
						" ",
						<a
							href="https://github.com/andrewiggins/tachometer-reporter-action/blob/master/README.md#summary"
							target="_blank"
						>
							Customize summary
						</a>,
					]}
				</sup>,
			]}
		</div>
	);
}

/**
 * @param {{ title: string; summary: JSX.Element; }} props
 */
function SummaryListItem({ title, summary }) {
	return <li data-sort-key={title}>{summary}</li>;
}

/**
 * @param {{ title: string; summary: import("./global").MeasurementSummary }} props
 */
function SummarySection({ title, summary }) {
	let header = null;
	if (summary.measurement !== defaultMeasure) {
		header = <h4>{summary.measurement.name}</h4>;
	}

	return (
		<div data-sort-key={getMeasurementSortKey(summary.measurement)}>
			{header}
			<ul id={getMeasurementSummaryListId(summary.measurementId)}>
				<SummaryListItem title={title} summary={summary.summary} />
			</ul>
		</div>
	);
}

/**
 * @param {{ inputs: import('./global').Inputs; report: import('./global').Report; }} props
 */
function NewCommentBody({ inputs, report }) {
	return (
		<div>
			<h2>📊 Tachometer Benchmark Results</h2>
			<h3>Summary</h3>
			<p class={globalStatusClass}>
				{report == null &&
					"A summary of the benchmark results will show here once they finish."}
			</p>
			<div id={getSummaryContainerId()}>
				{report != null &&
					report.summaries.map((summary) => (
						<SummarySection title={report.title} summary={summary} />
					))}
			</div>
			<h3>Results</h3>
			<p class={globalStatusClass}>
				{report == null &&
					"The full results of your benchmarks will show here once they finish."}
			</p>
			<div id={getResultsContainerId()}>
				{report != null && (
					<BenchmarkSection report={report} open={inputs.defaultOpen} />
				)}
			</div>
		</div>
	);
}

function Icon() {
	// Argh... SVGs get stripped out of markdown so this doesn't work :(
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="octicon"
		>
			<line x1="18" y1="20" x2="18" y2="10" />
			<line x1="12" y1="20" x2="12" y2="4" />
			<line x1="6" y1="20" x2="6" y2="14" />
		</svg>
	);
}

/**
 * @param {import("./global").Measurement} measurement
 */
function getMeasurementSortKey(measurement) {
	if (measurement == defaultMeasure) {
		return "000-default";
	} else {
		return measurement.name;
	}
}

/**
 * @param {import('node-html-parser').HTMLElement} container
 * @param {string} newSortKey
 * @param {import('node-html-parser').HTMLElement} newNode
 */
function insertNewBenchData(container, newSortKey, newNode) {
	let insertionIndex;
	for (let i = 0; i < container.childNodes.length; i++) {
		/** @type {import('node-html-parser').HTMLElement} */
		// @ts-ignore - We should be able to safely assume these are HTMLElements
		const child = container.childNodes[i];
		if (child.nodeType == NodeType.ELEMENT_NODE) {
			const childSortKey = child.getAttribute("data-sort-key");
			if (childSortKey > newSortKey) {
				insertionIndex = i;
				break;
			}
		}
	}

	if (insertionIndex == null) {
		container.appendChild(newNode);
	} else {
		container.childNodes.splice(insertionIndex, 0, newNode);
	}
}

/**
 * @param {import('./global').Inputs} inputs
 * @param {import('./global').Report} report
 * @param {string} commentBody
 * @param {import('./global').Logger} logger
 * @returns {string}
 */
function getCommentBody(inputs, report, commentBody, logger) {
	if (!commentBody) {
		logger.info("Generating new comment body...");
		const newHtml = <NewCommentBody report={report} inputs={inputs} />;
		return newHtml.toString();
	} else if (!report) {
		logger.info(
			"Comment exists but there is no report to update with so doing nothing."
		);
		return commentBody;
	}

	logger.info("Parsing existing comment...");
	const commentHtml = parse(commentBody);

	// Clear global status messages
	commentHtml
		.querySelectorAll(`.${globalStatusClass}`)
		.forEach((el) => el.set_content(""));

	report.summaries.forEach((summaryData) =>
		updateSummary(inputs, report, summaryData, commentHtml, logger)
	);
	updateResults(inputs, report, commentHtml, logger);

	return commentHtml.toString();
}

/**
 * @param {import('./global').Inputs} inputs
 * @param {import('./global').Report} report
 * @param {import('./global').MeasurementSummary} summaryData
 * @param {import('node-html-parser').HTMLElement} commentHtml
 * @param {import('./global').Logger} logger
 */
function updateSummary(inputs, report, summaryData, commentHtml, logger) {
	if (report.isRunning) {
		// Because this report is currently running, we don't have any results,
		// meaning we don't yet know what measurements this report will generate.
		// Because of this lack of knowledge, let's first check to see if any
		// summary line items exist for this report (by looking for summary line
		// items with a className containing this report id)

		const selector = `.${getSummaryClass(report.id)}`;
		const existingSummaries = commentHtml.querySelectorAll(selector);
		if (existingSummaries && existingSummaries.length > 0) {
			existingSummaries.forEach((summary) => {
				logger.info(`Adding status info to summary with id "${summary.id}"...`);

				const summaryStatus = summary.querySelector(`.${statusClass}`);
				summaryStatus.set_content(report.status);
			});

			return;
		}

		// We did not find any existing summaries. Since we don't know what
		// measurements this summary will go in we'll have to add to the "default"
		// measurement for now. When the real results come in, we'll remove this
		// summary and put the summaries under the right measurement header
		//
		// When the report is running, all of it's summary default to using the
		// defaultMeasure as it's measure so we can rely on the logic below to
		// handle this case.
	}

	if (summaryData.measurement !== defaultMeasure) {
		// Benchmark results can't include default measures and non-default
		// measures, so if this summary's measure is not the defaultMeasure, then
		// any existing defaultMeasures for this report must've been added while the
		// report is running. Let's remove them since that isn't true anymore.
		const defaultId = getSummaryId(defaultMeasureId, report.id);
		const defaultItem = commentHtml.querySelector(`#${defaultId}`);
		if (defaultItem) {
			const defaultListItem = defaultItem.parentNode;
			defaultListItem.parentNode.removeChild(defaultListItem);
		}
	}

	const measurementListId = `#${getMeasurementSummaryListId(
		summaryData.measurementId
	)}`;
	const measurementList = commentHtml.querySelector(measurementListId);

	const summaryId = getSummaryId(summaryData.measurementId, report.id);
	const summary = commentHtml.querySelector(`#${summaryId}`);
	// const summaryStatus = summary?.querySelector(`.${statusClass}`);

	if (summary) {
		const htmlRunNumber = parseInt(summary.getAttribute("data-run-number"), 10);

		// if (report.isRunning) {
		// 	logger.info(`Adding status info to summary with id "${summaryId}"...`);
		// 	summaryStatus.set_content(report.status);
		// } else if (htmlRunNumber > report.actionInfo.run.number) {
		if (htmlRunNumber > report.actionInfo.run.number) {
			logger.info(
				`Existing summary is from a run (#${htmlRunNumber}) that is more recent than the` +
					`current run (#${report.actionInfo.run.number}). Not updating the results.`
			);
		} else {
			logger.info(`Updating summary with id "${summaryId}"...`);
			// @ts-ignore - Can safely assume summary.parentNode is HTMLElement
			summary.parentNode.exchangeChild(summary, summaryData.summary);
		}
	} else if (measurementList) {
		logger.info(
			`No summary found with id "${summaryId}" but found the right measurement section so adding this summary to that section.`
		);

		insertNewBenchData(
			measurementList,
			report.title,
			<SummaryListItem title={report.title} summary={summaryData.summary} />
		);
	} else {
		logger.info(
			`No summary found with id "${summaryId}" and no measurement section with id "${measurementListId}" so creating a new one.`
		);

		const summaryContainerId = getSummaryContainerId();
		const summaryContainer = commentHtml.querySelector(
			`#${summaryContainerId}`
		);

		insertNewBenchData(
			summaryContainer,
			getMeasurementSortKey(summaryData.measurement),
			<SummarySection title={report.title} summary={summaryData} />
		);
	}
}

/**
 * @param {import('./global').Inputs} inputs
 * @param {import('./global').Report} report
 * @param {import('node-html-parser').HTMLElement} commentHtml
 * @param {import('./global').Logger} logger
 */
function updateResults(inputs, report, commentHtml, logger) {
	const resultsContainer = commentHtml.querySelector(
		`#${getResultsContainerId()}`
	);

	const resultsId = getBenchmarkSectionId(report.id);
	const results = commentHtml.querySelector(`#${resultsId}`);
	const resultStatus = results?.querySelector(`.${statusClass}`);

	if (results) {
		const htmlRunNumber = parseInt(results.getAttribute("data-run-number"), 10);

		if (report.isRunning) {
			logger.info(`Adding status info to results with id "${resultsId}"...`);
			resultStatus.set_content(report.status);
		} else if (htmlRunNumber > report.actionInfo.run.number) {
			logger.info(
				`Existing results are from a run (#${htmlRunNumber}) that is more recent than the ` +
					`current run (#${report.actionInfo.run.number}). Not updating the results.`
			);
		} else {
			logger.info(`Updating results with id "${resultsId}"...`);

			// Update result data
			const resultEntry = results.querySelector(`.${resultEntryClass}`);
			// @ts-ignore - Can safely assume results.parentNode is HTMLElement
			resultEntry.parentNode.exchangeChild(resultEntry, report.body);

			// Clear status
			const resultStatus = results.querySelector(`.${statusClass}`);
			resultStatus.set_content("");
		}
	} else {
		logger.info(`No results found with id "${resultsId}" so adding new one.`);
		insertNewBenchData(
			resultsContainer,
			report.title,
			<BenchmarkSection report={report} open={inputs.defaultOpen} />
		);
	}
}

module.exports = {
	h,
	getCommentBody,
	ResultsEntry,
	Summary,
	Status,
};
