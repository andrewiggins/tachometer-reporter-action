const prettyBytes = require("pretty-bytes");
const { UAParser } = require("ua-parser-js");
const { defaultMeasure } = require("./hash");

// Utilities from Tachometer, adapted from: https://github.com/Polymer/tachometer/blob/ff284b0329aa24249aa5ebce8bb009d88d0b057a/src/format.ts

const lineBreak = "<br />";

/**
 * @param {(b: import('../global').BenchmarkResult) => string} labelFn
 * @param {import('../global').BenchmarkResult[]} benchmarks
 * @returns {import('../global').Dimension[]}
 */
function makeDifferenceDimensions(labelFn, benchmarks) {
	return benchmarks.map((b, i) => {
		return {
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

				const { label, relative, absolute } = formatDifference(diff);
				return [label, relative, absolute].join(lineBreak);
			},
			// tableConfig: {
			// 	alignment: "right",
			// },
		};
	});
}

// /** @type {import("../global").Dimension} */
// const benchmarkDimension = {
// 	label: "Benchmark",
// 	format: (b) => b.name,
// };

// /** @type {import("../global").Dimension} */
// const versionDimension = {
// 	label: "Version",
// 	format: (b) => b.version,
// };

/** @type {import("../global").Dimension} */
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

/** @type {import("../global").Dimension} */
const sampleSizeDimension = {
	label: "Sample size",
	format: (b) => b.samples.length.toString(),
};

/** @type {import("../global").Dimension} */
const bytesSentDimension = {
	label: "Bytes",
	format: (b) => prettyBytes(b.bytesSent),
};

/** @type {import("../global").Dimension} */
const runtimeConfidenceIntervalDimension = {
	label: "Avg time",
	format: (b) => formatConfidenceInterval(b.mean, milli),
	// tableConfig: {
	// 	alignment: "right",
	// },
};

/**
 * Format a confidence interval as "[low, high]".
 * @param {import('../global').BenchmarkResult["mean"]} ci Confidence interval
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
	// Argh, it appears we can't color text using inline styes :(
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
 * @param {import('../global').BenchmarkResult["differences"][0]} difference
 * @returns {{ label: string; relative: string; absolute: string }}
 */
function formatDifference({ absolute, percentChange: relative }) {
	let word, rel, abs;
	if (Math.round(relative.low) == 0 && Math.round(relative.high) == 0) {
		// Our formatting for percents uses `.toFixed(0)`. In cases where we would
		// show 0% - 0% but the actual result is actually not zero (i.e. -0.5 - 0.4)
		// let's still show the result as unsure to avoid a situation where we would
		// display something like "slower ❌ 0% - 0% (0.00ms - 0.00ms)"
		word = `<strong>unsure 🔍</strong>`; // bold blue
		rel = formatConfidenceInterval(relative, (n) => colorizeSign(n, percent));
		abs = formatConfidenceInterval(absolute, (n) => colorizeSign(n, milli));
	}
	if (absolute.low > 0 && relative.low > 0) {
		word = `<strong>slower ❌</strong>`; // bold red
		rel = formatConfidenceInterval(relative, percent);
		abs = formatConfidenceInterval(absolute, milli);
	} else if (absolute.high < 0 && relative.high < 0) {
		word = `<strong>faster ✔</strong>`; // bold green
		rel = formatConfidenceInterval(negate(relative), percent);
		abs = formatConfidenceInterval(negate(absolute), milli);
	} else {
		word = `<strong>unsure 🔍</strong>`; // bold blue
		rel = formatConfidenceInterval(relative, (n) => colorizeSign(n, percent));
		abs = formatConfidenceInterval(absolute, (n) => colorizeSign(n, milli));
	}

	return {
		label: word,
		relative: rel,
		absolute: abs,
	};
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
 * @param {import('../global').ConfidenceInterval} ci
 * @returns {import('../global').ConfidenceInterval}
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
 * @param {import('../global').BenchmarkResult[]} results
 * @returns {(result: import('../global').BenchmarkResult) => string}
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

/**
 * Return a good-enough label for the given measurement, to disambiguate cases
 * where there are multiple measurements on the same page.
 * @param {import("../global").Measurement} measurement
 * @returns {string}
 */
function measurementName(measurement) {
	if (measurement.name) {
		return measurement.name;
	}

	switch (measurement.mode) {
		case "callback":
			return "callback";
		case "expression":
			return measurement.expression;
		case "performance":
			return measurement.entryName === "first-contentful-paint"
				? "fcp"
				: measurement.entryName;
	}
	throw new Error(
		`Internal error: unknown measurement type ` + JSON.stringify(measurement)
	);
}

/**
 * Patch tachometer results to include a `measurement` field parsed from the
 * benchmark name. Ensure all measurement fields have a name if they exist.
 * @param {import("../global").PatchedTachResults} tachResults
 * @returns {import('../global').PatchedTachResults}
 */
function normalizeResults(tachResults) {
	const nameRe = /(.+?)(?: \[(.+)\])?$/;

	/** @type {import('../global').PatchedTachResults} */
	const patchedResults = { benchmarks: [] };
	for (let bench of tachResults.benchmarks) {
		let match = bench.name.match(nameRe);

		/** @type {import('../global').Measurement} */
		let measurement;

		// Ensure every measurement has a name field
		if (bench.measurement) {
			measurement = {
				name: measurementName(bench.measurement),
				...bench.measurement,
			};
		} else if (match[2]) {
			// @ts-ignore - Can't determine measurement.mode in this case
			measurement = {
				name: match[2],
			};
		} else {
			measurement = defaultMeasure;
		}

		const name = match[1];
		patchedResults.benchmarks.push({
			...bench,
			name,
			measurement,
		});
	}

	return patchedResults;
}

module.exports = {
	formatDifference,
	makeUniqueLabelFn,
	makeDifferenceDimensions,
	browserDimension,
	sampleSizeDimension,
	bytesSentDimension,
	runtimeConfidenceIntervalDimension,
	measurementName,
	normalizeResults,
};
