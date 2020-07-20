const { readFile } = require("fs").promises;
const { suite } = require("uvu");
const assert = require("uvu/assert");
const { parse } = require("node-html-parser");
const {
	testRoot,
	formatHtml,
	copyResults,
	assertFixture,
	getBenchmarkSectionId,
	getSummaryId,
} = require("./utils");
const { defaultInputs, invokeBuildReport } = require("./invokeBuildReport");
const { getCommentBody } = require("../lib/index");

/** @type {import('../src/global').Logger} */
const testLogger = {
	debug() {},
	info() {},
	warn() {},
	startGroup() {},
	endGroup() {},
};

/**
 * @typedef GetCommentBodyParams
 * @property {Partial<import('../src/global').Inputs>} [inputs]
 * @property {import('../src/global').Report} [report]
 * @property {string} [commentBody]
 * @param {GetCommentBodyParams} params
 */
function invokeGetCommentBody({
	inputs = null,
	report = null,
	commentBody = null,
} = {}) {
	const fullInputs = {
		...defaultInputs,
		...inputs,
	};

	if (!report) {
		report = invokeBuildReport({ inputs: fullInputs });
	}

	return getCommentBody(fullInputs, report, commentBody, testLogger);
}

const newCommentSuite = suite("getCommentBody (new)");

newCommentSuite("New comment snapshot in running state", async () => {
	const inputs = { reportId: "test-results" };
	const body = invokeGetCommentBody({
		inputs,
		report: invokeBuildReport({ inputs, isRunning: true, results: null }),
	});
	const html = formatHtml(body.toString());

	const fixturePath = testRoot("fixtures/new-comment-running.html");
	const fixture = await readFile(fixturePath, "utf-8");

	// Uncomment to update fixture
	// await writeFile(fixturePath, html, "utf8");

	assertFixture(html, fixture, "Report body matches fixture");
});

newCommentSuite("New comment snapshot with results", async () => {
	const body = invokeGetCommentBody();
	const html = formatHtml(body.toString());

	const fixturePath = testRoot("fixtures/test-results-new-comment.html");
	const fixture = await readFile(fixturePath, "utf-8");

	// Uncomment to update fixture
	// await writeFile(fixturePath, html, "utf8");

	assertFixture(html, fixture, "Report body matches fixture");
});

newCommentSuite("Uses input.reportId", () => {
	const reportId = "test-input-id";
	const bodyIdRe = new RegExp(`<div id="${getBenchmarkSectionId(reportId)}"`);
	const summaryIdRe = new RegExp(`<div id="${getSummaryId(reportId)}"`);

	const body = invokeGetCommentBody({ inputs: { reportId } });

	assert.ok(body.match(bodyIdRe), "body contains input id");
	assert.ok(body.match(summaryIdRe), "summary contains input id");
});

newCommentSuite("Generates reportId if not given", () => {
	const expectedId = "l5UdXHMZ2m10Bdp0kqRnW0cWarA";
	const bodyIdRe = new RegExp(`<div id="${getBenchmarkSectionId(expectedId)}"`);
	const summaryIdRe = new RegExp(`<div id="${getSummaryId(expectedId)}"`);

	const body = invokeGetCommentBody();

	assert.ok(body.match(bodyIdRe), "body contains valid id");
	assert.ok(body.match(summaryIdRe), "summary contains valid id");
});

newCommentSuite("Sets open attribute if defaultOpen is true", () => {
	const openRe = /<details open="open">/;
	const body = invokeGetCommentBody({ inputs: { defaultOpen: true } });

	assert.ok(body.match(openRe), "body contains <details open>");
});

newCommentSuite(
	"Does not set open attribute if defaultOpen is false or null",
	() => {
		let body;
		const openRe = /<details open/;

		body = invokeGetCommentBody({ inputs: { defaultOpen: false } });

		assert.not.ok(
			body.match(openRe),
			"body does not contain <details open> for false"
		);

		body = invokeGetCommentBody({ inputs: { defaultOpen: null } });

		assert.not.ok(
			body.match(openRe),
			"body does not contain <details open> for null"
		);
	}
);

newCommentSuite("Generates full comment if comment null", () => {
	const report = invokeBuildReport();
	const body = invokeGetCommentBody({ report });

	assert.ok(body.includes("Tachometer Benchmark Results"), "Includes title");
	assert.ok(body.includes("<h3>Summary</h3>"), "Includes summary title");
	assert.ok(body.includes("<h3>Results</h3>"), "Includes results title");
	assert.ok(
		body.includes(report.summary.toString()),
		"Includes report.summary"
	);
	assert.ok(body.includes(report.body.toString()), "Includes report.body");
});

newCommentSuite("Supports benchmarks with different names", () => {
	const results = copyResults();
	const otherBenchName = "other-bench";

	results.benchmarks[0].name = otherBenchName;
	const report = invokeBuildReport({ results });
	const body = invokeGetCommentBody({ report });

	const allBenchNames = results.benchmarks.map((b) => b.name);
	const expectedTitle = Array.from(new Set(allBenchNames)).join(", ");

	// console.log(prettier.format(body, { parser: "html" }));

	const benchSectionId = getBenchmarkSectionId(report.id);
	const bodyDoc = parse(body);
	const actualTitle = bodyDoc.querySelector(`#${benchSectionId} summary`).text;

	// Check <summary> tag includes all names
	assert.is(actualTitle, expectedTitle, "Title includes all bench names");
});

const updateCommentSuite = suite("getCommentBody (update)");
const testReportId = "report-id";

updateCommentSuite("Updates existing comment with running status", async () => {
	const commentBodyPath = testRoot(
		"fixtures/test-results-existing-comment.html"
	);
	const commentBody = await readFile(commentBodyPath, "utf-8");
	const report = invokeBuildReport({
		inputs: { reportId: testReportId },
		results: null,
		isRunning: true,
	});

	const bodyHtml = parse(invokeGetCommentBody({ report, commentBody }));

	const summaryId = getSummaryId(testReportId);
	const summaryStatus = bodyHtml.querySelector(`#${summaryId} .status a`);
	const summaryData = bodyHtml.querySelector(`#${summaryId} em`);

	const resultId = getBenchmarkSectionId(testReportId);
	const resultStatus = bodyHtml.querySelector(`#${resultId} .status a`);
	const resultData = bodyHtml.querySelector(`#${resultId} table`);

	assert.ok(summaryStatus, "Summary status link exists");
	assert.ok(resultStatus, "Result status link exists");
	assert.ok(summaryStatus.text.includes("⏱"), "Summary status link has text");
	assert.ok(resultStatus.text.includes("⏱"), "Result status link has text");
	assert.ok(summaryData, "Summary data is still present");
	assert.ok(resultData, "Result data is still present");

	// Uncomment to update fixture
	// await writeFile(
	// 	testRoot("fixtures/test-results-existing-running.html"),
	// 	formatHtml(bodyHtml.toString()),
	// 	"utf-8"
	// );
});

updateCommentSuite(
	"Remove running status from existing comment when results come in",
	async () => {
		const commentBodyPath = testRoot(
			"fixtures/test-results-existing-running.html"
		);
		const commentBody = await readFile(commentBodyPath, "utf-8");
		const report = invokeBuildReport({
			inputs: { reportId: testReportId },
		});

		const bodyHtml = parse(invokeGetCommentBody({ report, commentBody }));

		const summaryId = getSummaryId(testReportId);
		const summaryStatus = bodyHtml.querySelector(`#${summaryId} .status a`);
		const summaryData = bodyHtml.querySelector(`#${summaryId} em`);

		const resultId = getBenchmarkSectionId(testReportId);
		const resultStatus = bodyHtml.querySelector(`#${resultId} .status a`);
		const resultData = bodyHtml.querySelector(`#${resultId} table`);

		// console.log(formatHtml(bodyHtml.toString()));

		assert.not.ok(summaryStatus, "Summary status link does not exist");
		assert.not.ok(resultStatus, "Result status link does not exist");
		assert.ok(summaryData, "Summary data is still present");
		assert.ok(resultData, "Result data is still present");
	}
);

// TODO: This test should be updated to reflect adding a new item. Might be
// duplicative of other tests below.
updateCommentSuite.skip(
	"Leave comment unmodified if can't find status elements",
	async () => {
		const newId = "new-id";
		const commentBodyPath = testRoot(
			"fixtures/test-results-existing-comment.html"
		);
		const commentBody = await readFile(commentBodyPath, "utf-8");
		const report = invokeBuildReport({
			inputs: { reportId: newId },
			results: null,
			isRunning: true,
		});

		const bodyHtml = parse(invokeGetCommentBody({ report, commentBody }));

		const summaryStatus = bodyHtml.querySelector(
			`#${getSummaryId(newId)} .status a`
		);
		const resultStatus = bodyHtml.querySelector(
			`#${getBenchmarkSectionId(newId)} .status a`
		);

		const summaryData = bodyHtml.querySelector(
			`#${getSummaryId(testReportId)} em`
		);
		const resultData = bodyHtml.querySelector(
			`#${getBenchmarkSectionId(testReportId)} table`
		);

		// console.log(formatHtml(bodyHtml.toString()));

		assert.not.ok(summaryStatus, "Summary status link does not exist");
		assert.not.ok(resultStatus, "Result status link does not exist");
		assert.ok(summaryData, "Summary data is still present");
		assert.ok(resultData, "Result data is still present");
	}
);

// TODO: Fill in tests

// TODO: Have tests for updating status and tests for updating summary/results

// updateCommentSuite(
// 	"Updates existing comment with results that doesn't contain matching ID",
// 	() => {
// 		// Add new table in appropriate section
// 	}
// );
// updateCommentSuite(
// 	"Benchmarks always inserted in same order regardless of when they finish",
// 	() => {
// 		// TODO: Consider using job-index for insertion order
// 	}
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
// 	"Updates existing comment that contains matching ID with keep old option and with old content",
// 	() => {
// 		// Move old table into existing old results <details> section
// 	}
// );

newCommentSuite.run();
updateCommentSuite.run();
