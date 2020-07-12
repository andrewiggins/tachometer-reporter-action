const path = require("path");
const { readFileSync } = require("fs");
const { suite } = require("uvu");
const assert = require("uvu/assert");
const { buildReport } = require("../lib/index");

const testResultsPath = path.join(__dirname, "test-results.json");

/** @type {import('../src/global').TachResults} */
const testResults = JSON.parse(readFileSync(testResultsPath, "utf8"));

const localVersion = "local-framework";
const baseVersion = "base-framework";

const buildReportSuite = suite("buildReport");
buildReportSuite("Body snapshot", () => {
	const report = buildReport(testResults, {
		localVersion,
		baseVersion,
		reportId: null,
		defaultOpen: false,
	});
	assert.ok(report, "Returns a report");
	console.log(report);

	// Body has id attribute
});
buildReportSuite("Summary snapshot", () => {});

buildReportSuite("Uses input.reportId", () => {
	// Check property
	// Check body tag
	// Check summary tag
});
buildReportSuite("Generates reportId if not given", () => {
	// Check property
	// Check body tag
	// Check summary tag
});

buildReportSuite("Sets open attribute if defaultOpen is true", () => {});
buildReportSuite(
	"Does not set open attribute if defaultOpen is false or null",
	() => {}
);

buildReportSuite("No summary if base version is null", () => {});
buildReportSuite("No summary if local version is null", () => {});
buildReportSuite("No summary if base and local version are null", () => {});

buildReportSuite("Supports benchmarks with different names", () => {
	// Check <summary> tag includes all names
	// Check table row labels
	// Check table column labels
});
buildReportSuite("Lists all browsers used in details", () => {
	// Check details list includes all browsers
	// Check table rows and columns include browsers
});
buildReportSuite("Supports benchmarks with no version field", () => {
	// TODO: How to do Summary?? Perhaps rename localVersion to localBenchId which
	// can be a benchmark name or version field value?
	// Check <summary> tag includes all names
	// Check table row labels
	// Check table column labels
});

const newCommentSuite = suite("getCommentBody (new)");

newCommentSuite("Generates full comment if comment null", () => {});
newCommentSuite("Generates full comment with no summary", () => {});

// const updateCommentSuite = suite("getCommentBody (update)");
// updateCommentSuite(
// 	"Updates existing comment that doesn't contain matching ID",
// 	() => {
// 		// Add new table in appropriate section
// 	}
// );
// updateCommentSuite(
// 	"Benchmarks always inserted in same order regardless of when they finish",
// 	() => {}
// );
// updateCommentSuite("Updates existing comment that contains matching ID", () => {
// 	// Replace existing content matching ID
// });
// updateCommentSuite(
// 	"Updates existing comment that contains matching ID with keep old option and no old content",
// 	() => {
// 		// Create old results <details> section and put existing table in it
// 	}
// );
// updateCommentSuite(
// 	"Updates existing comment that contains matching ID with keep old option and no old content",
// 	() => {
// 		// Move old table into existing old results <details> section
// 	}
// );
// updateCommentSuite(
// 	"Does not add summary to existing summary section if summary is null",
// 	() => {}
// );

buildReportSuite.run();
newCommentSuite.run();
