const path = require("path");
const { readFileSync } = require("fs");
const { test } = require("uvu");
const assert = require("uvu/assert");
const { buildReport } = require("../index");

const testResultsPath = path.join(__dirname, "test-results.json");
const testResults = JSON.parse(readFileSync(testResultsPath, "utf8"));

const localVersion = "local-version";
const baseVersion = "base-version";

test("Initial test", () => {
	const report = buildReport(testResults, localVersion, baseVersion);
	assert.type(report.summary, "string", "Returns string summary");
	assert.type(report.markdown, "string", "Returns string markdown");
});

test.run();
