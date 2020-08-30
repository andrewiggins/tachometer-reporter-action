const crypto = require("crypto");

function hash(s) {
	return crypto
		.createHash("sha1")
		.update(s)
		.digest("base64")
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=*$/, "");
}

/** @type {import("../global").Measurement} */
const defaultMeasure = {
	name: "default",
	// @ts-ignore Invent a fake mode to signify this is the default measure we
	// made up
	mode: hash(JSON.stringify({ name: "default" })),
};

const defaultMeasureId = getMeasurementId(defaultMeasure);

/**
 * @param {import('../global').Measurement} measurement
 */
function getMeasurementId(measurement) {
	let otherData = "";
	if (measurement.mode == "expression") {
		otherData = measurement.expression;
	} else if (measurement.mode == "performance") {
		otherData = measurement.entryName;
	}

	return hash(`${measurement.name}::${measurement.mode}::${otherData}`);
}

/**
 * @param {import('../global').PatchedBenchmarkResult[]} benchmarks
 */
function getReportId(benchmarks) {
	/** @type {(b: import('../global').BenchmarkResult) => string} */
	const getBrowserKey = (b) =>
		b.browser.name + (b.browser.headless ? "-headless" : "");

	const benchKeys = benchmarks.map((b) => {
		const measureId = getMeasurementId(b.measurement);
		return [b.name, b.version, measureId, getBrowserKey(b)].join(",");
	});

	return hash(benchKeys.join("::"));
}

module.exports = {
	defaultMeasure,
	defaultMeasureId,
	getMeasurementId,
	getReportId,
};
