const prettyBytes = require("pretty-bytes");
const { UAParser } = require("ua-parser-js");
const { h } = require("./html");

/** @jsx h */

// Utilities from Tachometer, adapted from: https://github.com/Polymer/tachometer/blob/ac0bc64e4521fb0ba9c78ceea0d382e55724be75/src/format.ts

const lineBreak = <br />;

/**
 * @param {import('./index').TachResults["benchmarks"]} benchmarks
 */
function makeDifferenceDimensions(labelFn, benchmarks) {
	return benchmarks.map((b, i) => {
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

				return formatDifference(diff);
			},
			// tableConfig: {
			// 	alignment: "right",
			// },
		};

		return dimension;
	});
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
	format: (b) => formatConfidenceInterval(b.mean, milli),
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
	// TODO: Determine if we can mimic this behavior with GitHub markdown
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
function formatDifference({ absolute, percentChange: relative }) {
	let word, rel, abs;
	if (absolute.low > 0 && relative.low > 0) {
		word = <strong>slower ❌</strong>; // bold red
		rel = formatConfidenceInterval(relative, percent);
		abs = formatConfidenceInterval(absolute, milli);
	} else if (absolute.high < 0 && relative.high < 0) {
		word = <strong>faster ✔</strong>; // bold green
		rel = formatConfidenceInterval(negate(relative), percent);
		abs = formatConfidenceInterval(negate(absolute), milli);
	} else {
		word = <strong>unsure 🔍</strong>; // bold blue
		rel = formatConfidenceInterval(relative, (n) => colorizeSign(n, percent));
		abs = formatConfidenceInterval(absolute, (n) => colorizeSign(n, milli));
	}

	return [word, rel, abs].join(lineBreak);
}

/**
 * @param {number} n
 * @returns {string}
 */
function percent(n) {
	// return (n * 100).toFixed(0);
	return n.toFixed(0) + "%";
}

/**
 * @param {number} n
 * @returns {string}
 */
function milli(n) {
	return n.toFixed(2) + "ms";
}

/**
 * @param {import('./index').BenchmarkResult["mean"]} ci
 * @returns {import('./index').BenchmarkResult["mean"]}
 */
function negate(ci) {
	return {
		low: -ci.high,
		high: -ci.low,
	};
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

		return fields.join(lineBreak);
	};
}

module.exports = {
	makeUniqueLabelFn,
	makeDifferenceDimensions,
	benchmarkDimension,
	versionDimension,
	browserDimension,
	sampleSizeDimension,
	bytesSentDimension,
	runtimeConfidenceIntervalDimension,
};
