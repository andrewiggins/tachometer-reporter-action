const {
	runtimeConfidenceIntervalDimension,
	makeUniqueLabelFn,
	makeDifferenceDimensions,
	browserDimension,
	sampleSizeDimension,
} = require("./tachometer-utils");

const VOID_ELEMENTS = /^(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/;

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
 * @param {{ benchmarks: import('./index').TachResults["benchmarks"] }} props
 * @returns {string}
 */
function Table({ benchmarks }) {
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
		<div id="test-1">
			<details open>
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

module.exports = {
	h,
	Table,
};
