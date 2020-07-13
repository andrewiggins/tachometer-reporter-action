const path = require("path");
const { readFileSync } = require("fs");
const { readFile, writeFile } = require("fs").promises;
const { suite } = require("uvu");
const assert = require("uvu/assert");
const cheerio = require("cheerio");
const prettier = require("prettier");
const { buildReport, getCommentBody } = require("../lib/index");

const testRoot = (...args) => path.join(__dirname, ...args);
const testResultsPath = testRoot("results/test-results.json");

/** @type {import('../src/global').TachResults} */
const testResults = JSON.parse(readFileSync(testResultsPath, "utf8"));

/** @type {() => import('../src/global').TachResults} */
const copyResults = () => JSON.parse(JSON.stringify(testResults));

const localVersion = "local-framework";
const baseVersion = "base-framework";
const defaultInputs = Object.freeze({
	localVersion,
	baseVersion,
	reportId: null,
	defaultOpen: false,
});

/** @type {import('../src/global').WorkflowRunData} */
// @ts-ignore
const fakeWorkflowRun = {
	run_name: "Pull Request Test #50",
	html_url:
		"https://github.com/andrewiggins/tachometer-reporter-action/actions/runs/166208365",
};

/** @type {import('../src/global').GitHubActionContext} */
// @ts-ignore
const fakeContext = {};

const getTableId = (id) => `tachometer-reporter-action--table-${id ? id : ""}`;
const getSummaryId = (id) =>
	`tachometer-reporter-action--summary-${id ? id : ""}`;

const buildReportSuite = suite("buildReport");

buildReportSuite("Body snapshot", async () => {
	const report = buildReport(fakeWorkflowRun, defaultInputs, testResults);
	const html = prettier.format(report.body, { parser: "html" });

	const snapshotPath = testRoot("snapshots/test-results-body.html");
	const snapshot = await readFile(snapshotPath, "utf-8");

	assert.fixture(html, snapshot, "Report body matches snapshot");

	// await writeFile(snapshotPath, html, "utf8");
});

buildReportSuite("Summary snapshot", async () => {
	const report = buildReport(fakeWorkflowRun, defaultInputs, testResults);
	const html = prettier.format(report.summary, { parser: "html" });

	const snapshotPath = testRoot("snapshots/test-results-summary.html");
	const snapshot = await readFile(snapshotPath, "utf-8");

	assert.fixture(html, snapshot, "Report summary matches snapshot");

	// await writeFile(snapshotPath, html, "utf8");
});

buildReportSuite("Uses input.reportId", () => {
	const reportId = "test-input-id";
	const bodyIdRe = new RegExp(`<div id="${getTableId(reportId)}"`);
	const summaryIdRe = new RegExp(`<div id="${getSummaryId(reportId)}"`);

	const inputs = { ...defaultInputs, reportId };
	const report = buildReport(fakeWorkflowRun, inputs, testResults);

	assert.is(report.id, reportId, "report.id matches input id");
	assert.ok(report.body.match(bodyIdRe), "body contains input id");
	assert.ok(report.summary.match(summaryIdRe), "summary contains input id");
});

buildReportSuite("Generates reportId if not given", () => {
	const expectedId = "l5UdXHMZ2m10Bdp0kqRnW0cWarA";
	const bodyIdRe = new RegExp(`<div id="${getTableId(expectedId)}"`);
	const summaryIdRe = new RegExp(`<div id="${getSummaryId(expectedId)}"`);

	const report = buildReport(fakeWorkflowRun, defaultInputs, testResults);

	assert.is(report.id, expectedId, "report.id matches expectation");
	assert.ok(report.body.match(bodyIdRe), "body contains valid id");
	assert.ok(report.summary.match(summaryIdRe), "summary contains valid id");
});

buildReportSuite("Sets open attribute if defaultOpen is true", () => {
	const openRe = /<details open="open">/;

	const inputs = { ...defaultInputs, defaultOpen: true };
	const report = buildReport(fakeWorkflowRun, inputs, testResults);

	assert.ok(report.body.match(openRe), "body contains <details open>");
});

buildReportSuite(
	"Does not set open attribute if defaultOpen is false or null",
	() => {
		const openRe = /<details open/;

		let inputs = { ...defaultInputs, defaultOpen: false };
		let report = buildReport(fakeWorkflowRun, inputs, testResults);

		assert.not.ok(
			report.body.match(openRe),
			"body does not contain <details open> for false"
		);

		inputs = { ...defaultInputs, defaultOpen: null };
		report = buildReport(fakeWorkflowRun, inputs, testResults);

		assert.not.ok(
			report.body.match(openRe),
			"body does not contain <details open> for null"
		);
	}
);

buildReportSuite("No summary if base version is null", () => {
	const inputs = { ...defaultInputs, baseVersion: null };
	const report = buildReport(fakeWorkflowRun, inputs, testResults);
	assert.not.ok(report.baseVersion, "report.baseVersion is null");
	assert.not.ok(report.summary, "report.summary is null");
});

buildReportSuite("No summary if local version is null", () => {
	const inputs = { ...defaultInputs, localVersion: null };
	const report = buildReport(fakeWorkflowRun, inputs, testResults);
	assert.not.ok(report.localVersion, "report.localVersion is null");
	assert.not.ok(report.summary, "report.summary is null");
});

buildReportSuite("No summary if base and local version are null", () => {
	const inputs = { ...defaultInputs, localVersion: null, baseVersion: null };
	const report = buildReport(fakeWorkflowRun, inputs, testResults);
	assert.not.ok(report.localVersion, "report.localVersion is null");
	assert.not.ok(report.baseVersion, "report.baseVersion is null");
	assert.not.ok(report.summary, "report.summary is null");
});

buildReportSuite("Supports benchmarks with different names", () => {
	const results = copyResults();
	const otherBenchName = "other-bench";

	results.benchmarks[0].name = otherBenchName;
	const report = buildReport(fakeWorkflowRun, defaultInputs, results);
	const bodyDoc = cheerio.load(report.body);

	const allBenchNames = results.benchmarks.map((b) => b.name);
	const expectedTitle = Array.from(new Set(allBenchNames)).join(", ");

	// console.log(prettier.format(report.body, { parser: "html" }));

	// Check <summary> tag includes all names
	assert.is(
		bodyDoc("summary").text(),
		expectedTitle,
		"Title includes all bench names"
	);

	// Check row and columns include both bench name and version name
	const rowLabels = Array.from(bodyDoc("tbody td:first-child")).map((td) =>
		bodyDoc(td).text()
	);
	const columnLabels = Array.from(bodyDoc("thead th")).map((td) =>
		bodyDoc(td).text()
	);

	for (let i = 0; i < results.benchmarks.length; i++) {
		const bench = results.benchmarks[i];
		const rowLabel = rowLabels[i];
		const columnLabel = columnLabels[i + 2];

		assert.ok(rowLabel.includes(bench.name), "Row label contains bench.name");
		assert.ok(
			columnLabel.includes(bench.name),
			"Column label contains bench.name"
		);

		assert.ok(
			rowLabel.includes(bench.version),
			"Row label contains bench.version"
		);
		assert.ok(
			rowLabel.includes(bench.version),
			"Row label contains bench.version"
		);
	}

	// TODO: Figure out what summary should do here.
	// const summaryDoc = cheerio.load(report.summary);
	// console.log(prettier.format(report.summary, { parser: "html" }));
});

buildReportSuite("Lists all browsers used in details", () => {
	const results = copyResults();

	results.benchmarks[0].browser = {
		name: "firefox",
		headless: false,
		windowSize: { width: 1024, height: 768 },
	};

	const report = buildReport(fakeWorkflowRun, defaultInputs, results);
	const bodyDoc = cheerio.load(report.body);

	// console.log(prettier.format(report.body, { parser: "html" }));

	// Check details list includes all browsers
	const listItems = Array.from(bodyDoc("ul > li")).map((li) =>
		bodyDoc(li).text()
	);

	results.benchmarks.forEach((bench) => {
		assert.ok(
			listItems.some((text) => text.includes(bench.browser.name)),
			`List items mention "${bench.browser.name}"`
		);
	});

	// Check table rows and columns include browsers
	const rowLabels = Array.from(bodyDoc("tbody td:first-child")).map((td) =>
		bodyDoc(td).text()
	);
	const columnLabels = Array.from(bodyDoc("thead th")).map((td) =>
		bodyDoc(td).text()
	);

	for (let i = 0; i < results.benchmarks.length; i++) {
		const bench = results.benchmarks[i];
		const rowLabel = rowLabels[i];
		const columnLabel = columnLabels[i + 2];

		assert.ok(
			rowLabel.includes(bench.browser.name),
			"Row label contains bench.browser.name"
		);
		assert.ok(
			columnLabel.includes(bench.browser.name),
			"Column label contains bench.browser.name"
		);

		assert.ok(
			rowLabel.includes(bench.version),
			"Row label contains bench.version"
		);
		assert.ok(
			rowLabel.includes(bench.version),
			"Row label contains bench.version"
		);
	}

	// TODO: Figure out summary should do here
	// const summaryDoc = cheerio.load(report.summary);
});

buildReportSuite("Supports benchmarks with no version field", () => {
	// TODO: How to do Summary?? Perhaps rename localVersion to localBenchId which
	// can be a benchmark name or version field value?
	// Check <summary> tag includes all names
	// Check table row labels
	// Check table column labels
});

const newCommentSuite = suite("getCommentBody (new)");

newCommentSuite("Generates full comment if comment null", () => {
	const report = buildReport(fakeWorkflowRun, defaultInputs, testResults);
	const body = getCommentBody(fakeContext, report, null);

	assert.ok(body.includes("Tachometer Benchmark Results"), "Includes title");
	assert.ok(body.includes("### Summary"), "Includes summary title");
	assert.ok(body.includes("### Results"), "Includes results title");
	assert.ok(body.includes(report.summary), "Includes report.summary");
	assert.ok(body.includes(report.body), "Includes report.body");
});

newCommentSuite("Generates full comment with no summary", () => {
	const report = buildReport(fakeWorkflowRun, defaultInputs, testResults);
	report.summary = null;

	const body = getCommentBody(fakeContext, report, null);
	assert.not.ok(
		body.includes("### Summary"),
		"Does not include summary section"
	);
});

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
