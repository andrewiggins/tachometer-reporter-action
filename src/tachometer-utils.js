const prettyBytes = require("pretty-bytes");
const { UAParser } = require("ua-parser-js");
const { h } = require("./html");

/** @jsx h */

// Utilities from Tachometer, adapted from: https://github.com/Polymer/tachometer/blob/ac0bc64e4521fb0ba9c78ceea0d382e55724be75/src/format.ts

/**
 * @typedef {ReturnType<typeof buildTableData>} TableData
 * @param {import('./index').TachResults["benchmarks"]} results
 */
function buildTableData(results) {
	// Typically most dimensions for a set of results share the same value (e.g
	// because we're only running one benchmark, one browser, etc.). To save
	// horizontal space and make the results easier to read, we first show the
	// fixed values in one table, then the unfixed values in another.

	/** @type {import("./global").Dimension[]} */
	const fixed = [];

	/** @type {import("./global").Dimension[]} */
	const unfixed = [];

	const possiblyFixed = [
		benchmarkDimension,
		versionDimension,
		browserDimension,
		sampleSizeDimension,
		bytesSentDimension,
	];

	for (const dimension of possiblyFixed) {
		const values = new Set();
		for (const res of results) {
			values.add(dimension.format(res));
		}

		if (values.size === 1) {
			fixed.push(dimension);
		} else {
			unfixed.push(dimension);
		}
	}

	// These are the primary observed results, so they always go in the main
	// result table, even if they happen to be the same in one run.
	unfixed.push(runtimeConfidenceIntervalDimension);

	if (results.length > 1) {
		// Create an NxN matrix comparing every result to every other result.
		const labelFn = makeUniqueLabelFn(results);
		for (let i = 0; i < results.length; i++) {
			unfixed.push({
				label: `vs ${labelFn(results[i])}`,
				format: (b) => {
					if (b.differences === undefined) {
						return "";
					}

					const diff = b.differences[i];
					if (diff === null) {
						// return ansi.format("\n[gray]{-}       ");
						return "-";
					}

					return formatDifference(diff);
				},
			});
		}
	}

	const fixedData = { dimensions: fixed, results: [results[0]] };
	const unfixedData = { dimensions: unfixed, results };
	return { fixed: fixedData, unfixed: unfixedData };
}

/** @type {import("./global").Dimension} */
const benchmarkDimension = {
	label: "Benchmark",
	format: (b) => b.name,
};

/** @type {import("./global").Dimension} */
const versionDimension = {
	label: "Version",
	format: (b) => b.version,
};

/** @type {import("./global").Dimension} */
const browserDimension = {
	label: "Browser",
	format: (b) => {
		const browser = b.browser;
		let s = browser.name;
		if (browser.headless) {
			s += "-headless";
		}

		// if (browser.remoteUrl) {
		// 	s += `\n@${browser.remoteUrl}`;
		// }

		// if (browser.userAgent !== "") {
		// 	const ua = new UAParser(browser.userAgent).getBrowser();
		// 	s += `\n${ua.version}`;
		// }

		if (browser.userAgent) {
			const ua = new UAParser(browser.userAgent).getBrowser();
			s += ` ${ua.version}`;
		}

		return s;
	},
};

/** @type {import("./global").Dimension} */
const sampleSizeDimension = {
	label: "Sample size",
	format: (b) => b.samples.length.toString(),
};

/** @type {import("./global").Dimension} */
const bytesSentDimension = {
	label: "Bytes",
	format: (b) => prettyBytes(b.bytesSent),
};

/** @type {import("./global").Dimension} */
const runtimeConfidenceIntervalDimension = {
	label: "Avg time",
	format: (b) => formatConfidenceInterval(b.mean, (n) => n.toFixed(2) + "ms"),
	// tableConfig: {
	// 	alignment: "right",
	// },
};

/**
 * Format a confidence interval as "[low, high]".
 * @param {import('./index').BenchmarkResult["mean"]} ci Confidence interval
 * @param {(n: number) => string} format
 * @returns {string}
 */
function formatConfidenceInterval(ci, format) {
	return `${format(ci.low)} - ${format(ci.high)}`;
}

/**
 * Prefix positive numbers with a red "+" and negative ones with a green "-".
 * @param {number} n
 * @param {(n: number) => string} format
 */
const colorizeSign = (n, format) => {
	if (n > 0) {
		// return ansi.format(`[red bold]{+}${format(n)}`);
		return `+${format(n)}`;
	} else if (n < 0) {
		// Negate the value so that we don't get a double negative sign.
		// return ansi.format(`[green bold]{-}${format(-n)}`);
		return `-${format(-n)}`;
	} else {
		return format(n);
	}
};

/**
 * @param {import('./index').BenchmarkResult["differences"][0]} difference
 * @returns {string}
 */
function formatDifference({ absolute, percentChange }) {
	let word, rel, abs;
	if (absolute.low > 0 && percentChange.low > 0) {
		word = `slower 🏗`; // bold red
		rel = `${percent(percentChange.low)}% - ${percent(percentChange.high)}%`;
		abs = `${absolute.low.toFixed(2)}ms - ${absolute.high.toFixed(2)}ms`;
	} else if (absolute.high < 0 && percentChange.high < 0) {
		word = `faster 🔥`; // bold green
		rel = `${percent(-percentChange.high)}% - ${percent(-percentChange.low)}%`;
		abs = `${-absolute.high.toFixed(2)}ms - ${-absolute.low.toFixed(2)}ms`;
	} else {
		word = `unsure 🔍`; // bold blue
		rel = `${colorizeSign(percentChange.low, percent)}% - ${colorizeSign(
			percentChange.high,
			percent
		)}%`;
		abs = `${colorizeSign(absolute.low, (n) =>
			n.toFixed(2)
		)}ms - ${colorizeSign(absolute.high, (n) => n.toFixed(2))}ms`;
	}
	return `${word}\n${rel}\n${abs}`;
}

/**
 * @param {number} n
 * @returns {string}
 */
function percent(n) {
	// return (n * 100).toFixed(0);
	return n.toFixed(0);
}

/**
 * Create a function that will return the shortest unambiguous label for a
 * result, given the full array of results.
 * @param {import('./index').TachResults["benchmarks"]} results
 * @returns {(result: import('./index').BenchmarkResult) => string}
 */
function makeUniqueLabelFn(results) {
	const names = new Set();
	const versions = new Set();
	const browsers = new Set();

	for (const result of results) {
		names.add(result.name);
		versions.add(result.version);
		browsers.add(result.browser.name);
	}

	return (result) => {
		/** @type {string[]} */
		const fields = [];
		if (names.size > 1) {
			fields.push(result.name);
		}

		if (versions.size > 1) {
			fields.push(result.version);
		}

		if (browsers.size > 1) {
			fields.push(result.browser.name);
		}

		return fields.join("\n");
	};
}

/**
 * @param {{ benchmarks: import('./index').TachResults["benchmarks"] }} props
 */
function renderTable3({ benchmarks }) {
	// Hard code what dimensions are rendered in the main table since GitHub comments
	// have limited horizontal space

	const benchNames = Array.from(new Set(benchmarks.map((b) => b.name)));

	const listDimensions = [browserDimension, sampleSizeDimension];

	const labelFn = makeUniqueLabelFn(benchmarks);

	/** @type {import("./global").Dimension[]} */
	const tableDimensions = [
		{
			label: "Version",
			format(r) {
				return labelFn(r)
					.split("\n")
					.join(<br />);
			},
		},
		runtimeConfidenceIntervalDimension,
		...benchmarks.map((b, i) => {
			/** @type {import('./global').Dimension} */
			const dimension = {
				label: `vs ${labelFn(b)}`,
				format: (b) => {
					if (b.differences === undefined) {
						return "";
					}

					const diff = b.differences[i];
					if (diff === null) {
						// return ansi.format("\n[gray]{-}       ");
						return "-";
					}

					return formatDifference(diff)
						.split("\n")
						.join(<br />);
				},
				// tableConfig: {
				// 	alignment: "right",
				// },
			};

			return dimension;
		}),
	];

	return (
		<div id="test-1">
			<h3>{benchNames.join(", ")}</h3>
			{"\n\n"}
			:red_circle: :orange_circle: :yellow_circle: :green_circle:
			:large_blue_circle: :red_square: :orange_square: :yellow_square:
			:green_square: :blue_square: :large_orange_diamond: :large_blue_diamond:
			:heavy_check_mark: :x: :part_alternation_mark: :question: :exclamation:
			:left_right_arrow: :arrow_upper_right: :arrow_lower_right:
			:arrow_lower_left: :arrow_upper_left: :arrow_heading_up:
			:arrow_heading_down: :warning: :no_entry: :no_entry_sign:
			:hammer_and_wrench: :fire: :mag: :fireworks: :sparkles: :tada: :star2:
			:rocket: :racing_car: :stop_sign: :construction: :building_construction:
			:thinking:
			{"\n\n"}
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
									// const alignment =
									// 	b.differences[i] == null
									// 		? "center"
									// 		: d.tableConfig?.alignment;

									// const style = alignment ? `text-align: ${alignment}` : null;
									// return <td style={style}>{d.format(b)}</td>;

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

module.exports = {
	// benchmarkDimension,
	// versionDimension,
	// browserDimension,
	// sampleSizeDimension,
	// bytesSentDimension,
	// runtimeConfidenceIntervalDimension,
	buildTableData,
	renderTable3,
};
