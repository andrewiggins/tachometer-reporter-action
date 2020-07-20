const { parse, HTMLElement, TextNode } = require("node-html-parser");
const {
	formatDifference,
	makeUniqueLabelFn,
	makeDifferenceDimensions,
	browserDimension,
	sampleSizeDimension,
	runtimeConfidenceIntervalDimension,
} = require("./utils/tachometer");

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
		} else if (attrs[key] != null) {
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
 * @property {import('./global').WorkflowRunInfo} workflowRun
 * @property {import('./global').CommitInfo} commitInfo
 *
 * @param {ResultsEntryProps} props
 */
function ResultsEntry({ reportId, benchmarks, workflowRun, commitInfo }) {
	// Hard code what dimensions are rendered in the main table since GitHub comments
	// have limited horizontal space

	if (!Array.isArray(benchmarks)) {
		return (
			<div class={resultEntryClass}>
				<SummaryStatus workflowRun={workflowRun} icon={false} />
			</div>
		);
	}

	const labelFn = makeUniqueLabelFn(benchmarks);
	const listDimensions = [browserDimension, sampleSizeDimension];

	const sha = <tt>{commitInfo.sha.slice(0, 7)}</tt>;
	const commitHtml = commitInfo.html_url ? (
		<a href={commitInfo.html_url}>{sha}</a>
	) : (
		sha
	);

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
				<li>Commit: {commitHtml}</li>
				<li>
					Built by:{" "}
					<a href={workflowRun.jobHtmlUrl}>{workflowRun.workflowRunName}</a>
				</li>
			</ul>
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
		</div>
	);
}

/**
 * @typedef BenchmarkSectionProps
 * @property {import('./global').Report} report
 * @property {boolean} open
 * @property {JSX.Element | string} children
 *
 * @param {BenchmarkSectionProps} props
 */
function BenchmarkSection({ report, open, children }) {
	return (
		<div id={getBenchmarkSectionId(report.id)}>
			<details open={open ? "open" : null}>
				<summary>
					<span class={statusClass}>
						{report.isRunning ? (
							<SummaryStatus workflowRun={report.workflowRun} icon={true} />
						) : null}
					</span>
					<strong>{report.title}</strong>
				</summary>
				{children}
			</details>
		</div>
	);
}

/**
 * @param {{ workflowRun: import('./global').WorkflowRunInfo; icon: boolean; }} props
 */
function SummaryStatus({ workflowRun, icon }) {
	const label = `Currently running in ${workflowRun.workflowRunName}…`;
	return (
		<a
			href={workflowRun.jobHtmlUrl}
			title={icon ? label : null}
			aria-label={icon ? label : null}
		>
			{icon ? "⏱ " : label}
		</a>
	);
}

/**
 * @typedef SummaryProps
 * @property {string} reportId
 * @property {string} title
 * @property {import('./global').BenchmarkResult[]} benchmarks
 * @property {string} prBenchName
 * @property {string} baseBenchName
 * @property {import('./global').WorkflowRunInfo | null} workflowRun
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
	workflowRun,
	isRunning,
}) {
	const benchLength = Array.isArray(benchmarks) ? benchmarks.length : -1;
	let usesDefaults = false;
	let showDiff = false;

	/** @type {JSX.Element} */
	let summaryBody;

	if (benchLength === 1) {
		const text = runtimeConfidenceIntervalDimension.format(benchmarks[0]);
		summaryBody = <span>: {text}</span>;
	} else if (benchLength > 1) {
		// Show message with instructions how to customize summary if default values used
		usesDefaults = !prBenchName || !baseBenchName;

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

		showDiff = true;
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
		<SummaryStatus workflowRun={workflowRun} icon={true} />
	) : null;

	return (
		<div id={getSummaryId(reportId)}>
			<span class={statusClass}>{status}</span>
			{title}
			{summaryBody}
			{showDiff && [
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
 * @param {{ inputs: import('./global').Inputs; report: import('./global').Report; }} props
 */
function NewCommentBody({ inputs, report }) {
	return (
		<div>
			<h2>📊 Tachometer Benchmark Results</h2>
			<h3>Summary</h3>
			<ul id={getSummaryListId()}>
				<li>{report.summary}</li>
			</ul>
			<h3>Results</h3>
			<div id={getResultsContainerId()}>
				<BenchmarkSection report={report} open={inputs.defaultOpen}>
					{report.body}
				</BenchmarkSection>
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
 * @param {import('./global').Inputs} inputs
 * @param {import('./global').Report} report
 * @param {string} commentBody
 * @param {import('./global').Logger} logger
 * @returns {string}
 */
function getCommentBody(inputs, report, commentBody, logger) {
	if (!commentBody) {
		const newHtml = <NewCommentBody report={report} inputs={inputs} />;
		return newHtml.toString();
	}

	const commentHtml = parse(commentBody);
	const summaryContainer = commentHtml.querySelector(`#${getSummaryListId()}`);
	const resultsContainer = commentHtml.querySelector(
		`#${getResultsContainerId()}`
	);

	const summaryId = getSummaryId(report.id);
	const summary = commentHtml.querySelector(`#${summaryId}`);

	const resultsId = getBenchmarkSectionId(report.id);
	const results = commentHtml.querySelector(`#${resultsId}`);

	const summaryStatus = summary.querySelector(`.${statusClass}`);
	const resultStatus = results.querySelector(`.${statusClass}`);

	// TODO: Consider inserting markup so the results are always ordered by
	// report.workflowRun.jobIndex. Same jobIndex should be inserted at the end of
	// all the same numbers to maintain order they report results (since steps
	// inside of a job run sequentially).

	if (report.isRunning) {
		// If benchmarks are running, just update or add the status fields

		if (summaryStatus) {
			summaryStatus.set_content(report.status);
		} else {
			summaryContainer.appendChild(<li>{report.summary}</li>);
		}

		if (resultStatus) {
			resultStatus.set_content(report.status);
		} else {
			resultsContainer.appendChild(
				<BenchmarkSection report={report} open={inputs.defaultOpen}>
					{report.body}
				</BenchmarkSection>
			);
		}
	} else {
		// Benchmark finished, update existing results or add new results
		if (summary) {
			// @ts-ignore - Can safely assume summary.parentNode is HTMLElement
			summary.parentNode.exchangeChild(summary, report.summary);
		} else {
			summaryContainer.appendChild(<li>{report.summary}</li>);
		}

		if (results) {
			const resultEntry = results.querySelector(`.${resultEntryClass}`);
			// @ts-ignore - Can safely assume results.parentNode is HTMLElement
			resultEntry.parentNode.exchangeChild(resultEntry, report.body);

			const resultStatus = results.querySelector(`.${statusClass}`);
			resultStatus.set_content("");
		} else {
			resultsContainer.appendChild(
				<BenchmarkSection report={report} open={inputs.defaultOpen}>
					{report.body}
				</BenchmarkSection>
			);
		}
	}

	return commentHtml.toString();
}

module.exports = {
	h,
	getCommentBody,
	ResultsEntry,
	Summary,
	SummaryStatus,
};
