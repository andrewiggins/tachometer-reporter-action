const path = require("path");
const { readFileSync } = require("fs");
const { readFile } = require("fs/promises");
const assert = require("uvu/assert");
const prettier = require("prettier");

const testRoot = (...args) => path.join(__dirname, ...args);

const testResultsPath = testRoot("results/test-results.json");
const multiMeasureResultsPath = testRoot("results/multi-measure-results.json");

/** @type {import('../src/global').TachResults} */
const testResults = JSON.parse(readFileSync(testResultsPath, "utf8"));

/** @type {() => import('../src/global').TachResults} */
const copyTestResults = () => JSON.parse(JSON.stringify(testResults));

const multiMeasureResults = JSON.parse(
	readFileSync(multiMeasureResultsPath, "utf8")
);

/** @type {() => import('../src/global').TachResults} */
const getMultiMeasureResults = () =>
	JSON.parse(JSON.stringify(multiMeasureResults));

/** @type {(html: string) => string} */
const formatHtml = (html) =>
	prettier.format(html, { parser: "html", useTabs: true });

/**
 * @param {string} fixtureName
 */
async function readFixture(fixtureName) {
	const path = testRoot("fixtures/" + fixtureName);
	return await readFile(path, "utf8");
}

const shouldAssertFixtures =
	process.env.TACH_REPORTER_SKIP_SNAPSHOT_TESTS !== "true";

if (!shouldAssertFixtures) {
	console.log("Skipping asserting fixtures");
}

function assertFixture(actual, expected, message) {
	if (shouldAssertFixtures) {
		assert.fixture(actual, expected, message);
	}
}

const testResultsHashId = "JQx4P-VUyiFWEMlMIUU5w9uyy6s";
const defaultMeasurementId = "vLpvdPi0hOozeUB9NMaWIJ9oUSA";

const getBenchmarkSectionId = (id = testResultsHashId) =>
	`tachometer-reporter-action--results-${id}`;
const getResultsContainerId = () => `tachometer-reporter-action--results`;

/**
 * @param {{ measurementId?: string; reportId?: string; }} [params]
 */
function getSummaryId({
	reportId = testResultsHashId,
	measurementId = defaultMeasurementId,
} = {}) {
	return `tachometer-reporter-action--summary::${measurementId}::${reportId}`;
}

/**
 * @param {string} [measurementId]
 */
function getSummaryListId(measurementId = defaultMeasurementId) {
	return `tachometer-reporter-action--summaries::${measurementId}`;
}

/**
 * @template T
 * @template K
 * @param {T} obj
 * @param {K} keys
 * @returns {Pick<T, K>}
 */
function pick(obj, keys) {
	let newObj = {};

	// @ts-ignore
	for (let key of keys) {
		newObj[key] = obj[key];
	}

	// @ts-ignore
	return newObj;
}

function skipSuite(suite) {
	function fakeSuite(...params) {}
	fakeSuite.run = function fakeRun(...params) {};
	fakeSuite.before = function fakeBefore(...params) {};
	fakeSuite.before.each = function fakeBeforeEach(...params) {};
	fakeSuite.after = function fakeAfter(...params) {};
	fakeSuite.after.each = function fakeAfterEach(...params) {};

	return fakeSuite;
}

module.exports = {
	pick,
	skipSuite,
	testRoot,
	copyTestResults,
	getMultiMeasureResults,
	formatHtml,
	readFixture,
	shouldAssertFixtures,
	assertFixture,
	getBenchmarkSectionId,
	testResultsHashId,
	defaultMeasurementId,
	getSummaryId,
	getSummaryListId,
	getResultsContainerId,
};
