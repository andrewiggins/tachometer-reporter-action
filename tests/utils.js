const path = require("path");
const { readFileSync } = require("fs");
const assert = require("uvu/assert");
const prettier = require("prettier");

const testRoot = (...args) => path.join(__dirname, ...args);

const testResultsPath = testRoot("results/test-results.json");

/** @type {import('../src/global').TachResults} */
const testResults = JSON.parse(readFileSync(testResultsPath, "utf8"));

/** @type {() => import('../src/global').TachResults} */
const copyTestResults = () => JSON.parse(JSON.stringify(testResults));

/** @type {(html: string) => string} */
const formatHtml = (html) =>
	prettier.format(html, { parser: "html", useTabs: true });

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

const getBenchmarkSectionId = (id) =>
	`tachometer-reporter-action--results-${id ? id : ""}`;
const getSummaryId = (id) =>
	`tachometer-reporter-action--summary-${id ? id : ""}`;
const getSummaryListId = () => `tachometer-reporter-action--summaries`;
const getResultsContainerId = () => `tachometer-reporter-action--results`;

module.exports = {
	testRoot,
	copyTestResults,
	formatHtml,
	assertFixture,
	getBenchmarkSectionId,
	getSummaryId,
	getSummaryListId,
	getResultsContainerId,
};
