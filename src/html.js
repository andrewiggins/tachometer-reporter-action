const { HTMLElement, TextNode } = require("node-html-parser");
const {
	formatDifference,
	makeUniqueLabelFn,
	makeDifferenceDimensions,
	browserDimension,
	sampleSizeDimension,
	runtimeConfidenceIntervalDimension,
} = require("./tachometer-utils");

const getId = (id) => `tachometer-reporter-action--${id}`;
const getBenchmarkResultsId = (id) => getId(`results-${id}`);
const getLatestResultsEntryId = (id) => getId(`results-${id}-latest-entry`);
const getSummaryId = (id) => getId(`summary-${id}`);

const resultsContainerId = getId("results");
const summaryListId = getId("summaries");

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
		children.map((c) => {
			if (typeof c == "number" || typeof c == "string") {
				return new TextNode(c.toString());
			} else {
				return c;
			}
		})
	);

	return element;
}

/**
 * @typedef ResultEntryProps
 * @property {import('./global').BenchmarkResult[]} benchmarks
 * @property {import('./global').WorkflowRunData} workflowRun
 * @property {import('./global').CommitInfo} commitInfo
 *
 * @param {ResultEntryProps} props
 */
function ResultEntry({ benchmarks, workflowRun, commitInfo }) {
	// Hard code what dimensions are rendered in the main table since GitHub comments
	// have limited horizontal space

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
		<div>
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
					Built by: <a href={workflowRun.html_url}>{workflowRun.run_name}</a>
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
 * @typedef BenchmarkResultsProps
 * @property {string} reportId
 * @property {string} reportName
 * @property {string} latestEntry
 * @property {string} previousEntries
 * @property {boolean} open
 *
 * @param {BenchmarkResultsProps} props
 */
function BenchmarkResults({
	reportId,
	reportName,
	latestEntry,
	previousEntries,
	open,
}) {
	return (
		<div id={getBenchmarkResultsId(reportId)}>
			<details open={open ? "open" : null}>
				<summary>
					<strong>{reportName}</strong>
				</summary>
				<div id={getLatestResultsEntryId(reportId)}>{latestEntry}</div>
				{previousEntries && (
					<PreviousResults
						reportId={reportId}
						previousEntries={previousEntries}
					/>
				)}
			</details>
		</div>
	);
}

function PreviousResults({ reportId, previousEntries }) {
	return (
		<div>
			<details>
				<summary>Previous results</summary>
				<div id="">{previousEntries}</div>
			</details>
		</div>
	);
}

/**
 * @param {{ children: string[] }} props
 */
function ResultsSection({ children }) {
	return (
		<div id={resultsContainerId}>
			<h3>Results</h3>
			{children}
		</div>
	);
}

/**
 * @typedef SummaryProps
 * @property {string} reportId
 * @property {import('./global').BenchmarkResult[]} benchmarks
 * @property {string} prBenchName
 * @property {string} baseBenchName
 *
 * @param {SummaryProps} props
 */
function Summary({ reportId, benchmarks, prBenchName, baseBenchName }) {
	const baseIndex = benchmarks.findIndex((b) => b.version == baseBenchName);
	const localResults = benchmarks.find((b) => b.version == prBenchName);
	const diff = formatDifference(localResults.differences[baseIndex]);

	return (
		<div id={getSummaryId(reportId)}>
			{"\n\n"}
			{`[${localResults.name}](#${getBenchmarkResultsId(reportId)}): `}
			{`${diff.label} *${diff.relative} (${diff.absolute})*`}
			{"\n\n"}
		</div>
	);
}

/**
 * @param {{ children: string[] }} props
 */
function SummarySection({ children }) {
	// @ts-ignore
	children = children.flat(Infinity);
	return (
		<ul id={summaryListId}>
			{children.map((child) => (
				<li>{child}</li>
			))}
		</ul>
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

module.exports = {
	h,

	resultsContainerId,
	summaryListId,
	getBenchmarkResultsId,
	getLatestResultsEntryId,
	getSummaryId,

	ResultEntry,
	BenchmarkResults,
	ResultsSection,
	Summary,
	SummarySection,
};
