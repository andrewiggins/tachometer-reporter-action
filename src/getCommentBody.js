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

const globalStatusClass = "global-status";
const statusClass = "status";
const resultEntryClass = "result-entry";

const getId = (id) => `tachometer-reporter-action--${id}`;
const getResultsContainerId = () => getId("results");
const getSummaryListId = () => getId("summaries");

const getBenchmarkSectionId = (id) => getId(`results-${id}`);
const getSummaryId = (id) => getId(`summary-${id}`);

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

	// @ts-ignore
	children = children.flat(Infinity);

	const element = new HTMLElement(tag, { id, class: className }, attrStr);
	element.set_content(
		children.filter(Boolean).map((c) => {
			if (typeof c == "number" || typeof c == "string") {
				return new TextNode(c.toString());
			} else if (c instanceof HTMLElement) {
				c.parentNode = element;
				return c;
			} else {
				return c;
			}
		})
	);

	return element;
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
			id={getSummaryId(reportId)}
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
 * @param {{ report: import('./global').Report; }} props
 */
function SummaryListItem({ report }) {
	return <li data-sort-key={report.title}>{report.summary}</li>;
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
			<ul id={getSummaryListId()}>
				{report != null && <SummaryListItem report={report} />}
			</ul>
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
	const summaryContainer = commentHtml.querySelector(`#${getSummaryListId()}`);
	const resultsContainer = commentHtml.querySelector(
		`#${getResultsContainerId()}`
	);

	const summaryId = getSummaryId(report.id);
	const summary = commentHtml.querySelector(`#${summaryId}`);

	const resultsId = getBenchmarkSectionId(report.id);
	const results = commentHtml.querySelector(`#${resultsId}`);

	const summaryStatus = summary?.querySelector(`.${statusClass}`);
	const resultStatus = results?.querySelector(`.${statusClass}`);

	// Clear global status messages
	commentHtml
		.querySelectorAll(`.${globalStatusClass}`)
		.forEach((el) => el.set_content(""));

	// Update summary
	if (summary) {
		const htmlRunNumber = parseInt(results.getAttribute("data-run-number"), 10);

		if (report.isRunning) {
			logger.info(`Adding status info to summary with id "${summaryId}"...`);
			summaryStatus.set_content(report.status);
		} else if (htmlRunNumber > report.actionInfo.run.number) {
			logger.info(
				`Existing summary is from a run (#${htmlRunNumber}) that is more recent than the` +
					`current run (#${report.actionInfo.run.number}). Not updating the results.`
			);
		} else {
			logger.info(`Updating summary with id "${summaryId}"...`);
			// @ts-ignore - Can safely assume summary.parentNode is HTMLElement
			summary.parentNode.exchangeChild(summary, report.summary);
		}
	} else {
		logger.info(`No summary found with id "${summaryId}" so adding new one.`);
		insertNewBenchData(
			summaryContainer,
			report.title,
			<SummaryListItem report={report} />
		);
	}

	// Update results entry
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

	return commentHtml.toString();
}

module.exports = {
	h,
	getCommentBody,
	ResultsEntry,
	Summary,
	Status,
};
