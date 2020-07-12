const {
	formatDifference,
	makeUniqueLabelFn,
	makeDifferenceDimensions,
	browserDimension,
	sampleSizeDimension,
	runtimeConfidenceIntervalDimension,
} = require("./tachometer-utils");

const VOID_ELEMENTS = /^(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/;

const getId = (id) => `tachometer-reporter-action--${id}`;
const getTableId = (id) => getId(`table-${id}`);
const getSummaryId = (id) => getId(`summary-${id}`);

/**
 * @typedef {(props: any) => string} Component
 * @param {string | Component} tag
 * @param {object} attrs
 * @param  {...any} children
 * @returns {string}
 */
function h(tag, attrs, ...children) {
	if (typeof tag == "function") {
		return tag({ ...attrs, children });
	}

	let attrStr = "";
	for (let key in attrs) {
		if (attrs[key] != null) {
			attrStr += ` ${key}="${attrs[key]}"`;
		}
	}

	// @ts-ignore
	const childrenStr = children.flat(Infinity).join("");

	if (tag.match(VOID_ELEMENTS)) {
		return `<${tag}${attrStr} />`;
	} else {
		return `<${tag}${attrStr}>${childrenStr}</${tag}>`;
	}
}

/**
 * @param {{ reportId: string; benchmarks: import('./global').BenchmarkResult[]; open: boolean }} props
 * @returns {string}
 */
function Table({ reportId, benchmarks, open }) {
	// Hard code what dimensions are rendered in the main table since GitHub comments
	// have limited horizontal space

	const labelFn = makeUniqueLabelFn(benchmarks);
	const benchNames = Array.from(new Set(benchmarks.map((b) => b.name)));
	const listDimensions = [browserDimension, sampleSizeDimension];

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
		<div id={getTableId(reportId)}>
			<details open={open ? "open" : null}>
				<summary>
					<strong>{benchNames.join(", ")}</strong>
				</summary>
				<ul>
					{listDimensions.map((dim) => {
						const uniqueValues = new Set(benchmarks.map((b) => dim.format(b)));
						return (
							<li>
								{dim.label}: {Array.from(uniqueValues).join(", ")}
							</li>
						);
					})}
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
			</details>
		</div>
	);
}

/**
 * @param {{ reportId: string; benchmarks: import('./global').BenchmarkResult[]; localVersion: string; baseVersion: string; }} props
 */
function Summary({ reportId, benchmarks, localVersion, baseVersion }) {
	const baseIndex = benchmarks.findIndex((b) => b.version == baseVersion);
	const localResults = benchmarks.find((b) => b.version == localVersion);
	const diff = formatDifference(localResults.differences[baseIndex]);

	return (
		<div id={getSummaryId(reportId)}>
			<a href={"#" + getTableId(reportId)}>{localResults.name}</a>: {diff.label}{" "}
			<em>
				{diff.relative} ({diff.absolute})
			</em>
		</div>
	);
}

/**
 * @param {{ children: string[] }} props
 */
function SummaryList({ children }) {
	// @ts-ignore
	children = children.flat(Infinity);
	return (
		<ul id={getId("summaries")}>
			{children.map((child) => (
				<li>{child}</li>
			))}
		</ul>
	);
}

module.exports = {
	h,
	Table,
	Summary,
	SummaryList,
};
