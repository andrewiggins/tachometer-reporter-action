const { readFile, writeFile } = require("fs").promises;
const { suite } = require("uvu");
const assert = require("uvu/assert");
const { parse } = require("node-html-parser");
const {
	testReportId,
	testRoot,
	formatHtml,
	copyTestResults,
	getMultiMeasureResults,
	readFixture,
	assertFixture,
	getBenchmarkSectionId,
	getSummaryId,
	getSummaryListId,
	getResultsContainerId,
	skipSuite,
} = require("./utils");
const { invokeBuildReport } = require("./invokeBuildReport");
const { defaultInputs, testLogger } = require("./mocks/actions");
const { defaultActionInfo } = require("./mocks/github");
const { getCommentBody } = require("../lib/getCommentBody");
const { defaultMeasureId } = require("../lib/utils/hash");

function generateNewTestResults() {
	const results = copyTestResults();

	const baseFrameworkIndex = results.benchmarks.findIndex(
		(b) => b.version == "base-framework"
	);
	const localFramework = results.benchmarks.find(
		(b) => b.version == "local-framework"
	);

	localFramework.differences[baseFrameworkIndex] = {
		absolute: {
			low: -12.768235849180819,
			high: -3.5470975408067247,
		},
		percentChange: {
			low: -28.411804797038677,
			high: -9.269181809727653,
		},
	};

	return results;
}

function generateNewMultiMeasureResults() {
	const results = getMultiMeasureResults();

	const baseFrameworkIndexes = [];
	const localFrameworkIndexes = [];
	for (let i = 0; i < results.benchmarks.length; i++) {
		const bench = results.benchmarks[i];
		if (bench.version == "base-framework") {
			baseFrameworkIndexes.push(i);
		} else if (bench.version == "local-framework") {
			localFrameworkIndexes.push(i);
		}
	}

	if (baseFrameworkIndexes.length !== localFrameworkIndexes.length) {
		throw new Error(
			"In multi-measure test data, base-framework & local-framework do not have the same number benches"
		);
	}

	for (let i = 0; i < baseFrameworkIndexes.length; i++) {
		const baseIndex = baseFrameworkIndexes[i];
		const localIndex = localFrameworkIndexes[i];

		if (i % 2 == 0) {
			results.benchmarks[localIndex].differences[baseIndex] = {
				absolute: {
					low: 23.256604270048058,
					high: 31.061395727826664,
				},
				percentChange: {
					low: 16.49161379979324,
					high: 22.385266772819442,
				},
			};
		} else {
			results.benchmarks[localIndex].differences[baseIndex] = {
				absolute: {
					low: -3.2463580441722373,
					high: -3.2604495558277637,
				},
				percentChange: {
					low: -91.05899662476533,
					high: -91.49058751908188,
				},
			};
		}
	}

	return results;
}

/**
 * @typedef GetCommentBodyParams
 * @property {Partial<import('../src/global').Inputs>} [inputs]
 * @property {import('../src/global').Report} [report]
 * @property {string} [commentBody]
 * @param {GetCommentBodyParams} params
 */
function invokeGetCommentBody({
	inputs = null,
	report = undefined,
	commentBody = null,
} = {}) {
	const fullInputs = {
		...defaultInputs,
		...inputs,
	};

	if (report === undefined) {
		report = invokeBuildReport({ inputs: fullInputs });
	}

	return getCommentBody(fullInputs, report, commentBody, testLogger);
}

/**
 * @param {string} label
 * @param {import('node-html-parser').HTMLElement} body
 * @param {{ isRunning?: boolean; hasResults?: boolean; }} [options]
 * @param {{ reportId?: string; measurementId?: string; }} [ids]
 */
function assertUIState(
	label,
	body,
	{ isRunning = false, hasResults = true } = {},
	{ reportId = testReportId, measurementId = defaultMeasureId } = {}
) {
	let summaryId = getSummaryId({ reportId, measurementId });
	let summaryStatus = body.querySelector(`#${summaryId} .status a`);
	let summaryData = body.querySelector(`#${summaryId} em`);

	let resultId = getBenchmarkSectionId(reportId);
	let resultStatus = body.querySelector(`#${resultId} .status a`);
	let resultData = body.querySelector(
		`#${resultId} table.results::${measurementId}`
	);

	const msg = (message) => `${label}: ${message}`;

	if (isRunning) {
		assert.ok(summaryStatus, msg(`Summary running status link should exist`));
		assert.ok(resultStatus, msg(`Result running link should exist`));

		let summaryText = summaryStatus?.text.includes("⏱");
		let resultText = resultStatus?.text.includes("⏱");

		assert.ok(summaryText, msg(`Summary running status link has text`));
		assert.ok(resultText, msg(`Result running status link has text`));
	} else {
		assert.not.ok(summaryStatus, msg(`summary status link should not exist`));
		assert.not.ok(resultStatus, msg(`result status link should not exist`));
	}

	if (hasResults) {
		assert.ok(summaryData, msg(`summary results should exist`));
		assert.ok(resultData, msg(`result data should exist`));
	} else {
		assert.not.ok(summaryData, msg(`summary results should not exist`));
		assert.not.ok(resultData, msg(`result data should not exist`));
	}
}

//#region New Comment Suite

const newCommentSuite = suite("getCommentBody (new)");

newCommentSuite("New comment snapshot in initialized state", async () => {
	// Should renders generic comment body if report is null
	const body = invokeGetCommentBody({ report: null });
	const html = formatHtml(body.toString());

	const fixture = await readFixture("new-comment-initialized.html");
	assertFixture(html, fixture, "Comment body matches fixture");
});

newCommentSuite("New comment snapshot in running state", async () => {
	const inputs = { reportId: testReportId };
	const report = invokeBuildReport({ inputs, results: null, isRunning: true });
	const body = invokeGetCommentBody({ inputs, report });

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

newCommentSuite("Uses input.reportId", async () => {
	const body = invokeGetCommentBody({ inputs: { reportId: testReportId } });
	const html = formatHtml(body.toString());

	const fixturePath = testRoot("fixtures/test-results-existing-comment.html");
	const fixture = await readFile(fixturePath, "utf-8");

	// Uncomment to update fixture
	// await writeFile(fixturePath, html, "utf8");

	assertFixture(html, fixture, "Report body matches fixture");
});

newCommentSuite("Generates reportId if not given", () => {
	const bodyIdRe = new RegExp(`<div id="${getBenchmarkSectionId()}"`);
	const summaryIdRe = new RegExp(`<div id="${getSummaryId()}"`);

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
	report.summaries.forEach((m, i) => {
		assert.ok(
			body.includes(m.summary.toString()),
			`Includes report.summaries[${i}]`
		);
	});
	assert.ok(body.includes(report.body.toString()), "Includes report.body");
});

newCommentSuite("Supports benchmarks with different names", () => {
	const results = copyTestResults();
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

newCommentSuite(
	"Still renders status even if job.html_url and run.html_url is falsey",
	async () => {
		const report = invokeBuildReport({
			inputs: { reportId: testReportId },
			actionInfo: {
				...defaultActionInfo,
				run: {
					...defaultActionInfo.run,
					htmlUrl: null,
				},
				job: {
					id: undefined,
					index: undefined,
					htmlUrl: undefined,
					name: defaultActionInfo.job.name,
				},
			},
			results: null,
			isRunning: true,
		});

		const bodyHtml = parse(invokeGetCommentBody({ report }));

		const summaryId = getSummaryId({ reportId: testReportId });
		const summaryStatus = bodyHtml.querySelector(`#${summaryId} .status`);
		const summaryStatusLink = bodyHtml.querySelector(`#${summaryId} .status a`);

		const resultId = getBenchmarkSectionId(testReportId);
		const resultStatus = bodyHtml.querySelector(`#${resultId} .status`);
		const resultStatusLink = bodyHtml.querySelector(`#${resultId} .status a`);

		assert.ok(summaryStatus, "Summary status span exists");
		assert.ok(resultStatus, "Result status span exists");

		assert.ok(summaryStatus.text.includes("⏱"), "Summary status span has text");
		assert.ok(resultStatus.text.includes("⏱"), "Result status span has text");

		assert.not.ok(summaryStatusLink, "Summary status is not a link");
		assert.not.ok(resultStatusLink, "Result status is not a link");
	}
);

newCommentSuite("Renders expected body for single results", async () => {
	const results = JSON.parse(
		await readFile(testRoot("results/single-results.json"), "utf8")
	);

	const report = invokeBuildReport({ results });
	const body = invokeGetCommentBody({ report });
	const html = formatHtml(body.toString());

	const fixturePath = testRoot("fixtures/single-results.html");
	const fixture = await readFile(fixturePath, "utf-8");

	// Uncomment to update fixture
	// await writeFile(fixturePath, html, "utf8");

	assertFixture(html, fixture, "Report body matches fixture");
});

newCommentSuite("Shows unsure if change is 0% - 0%", async () => {
	const results = JSON.parse(
		await readFile(testRoot("results/zero-percent-change.json"), "utf8")
	);

	const reportId = "report-id";
	const report = invokeBuildReport({ results, inputs: { reportId } });
	const body = invokeGetCommentBody({ report, inputs: { reportId } });
	const html = parse(body.toString());

	const summaryId = getSummaryId({ reportId });
	const actual = html.querySelector(`#${summaryId}`).text;
	const expected =
		"report-id: unsure 🔍 -0% - -0% (-0.00ms - -0.00ms)local-framework vs base-framework";
	assert.equal(
		actual,
		expected,
		"Expected unsure to show for rounded 0% difference"
	);
});

//#endregion

//#region Update Comment Suite

const updateCommentSuite = suite("getCommentBody (update)");
const otherReportId = "test-results-new-id";

updateCommentSuite("Update from initialized to running", async () => {
	// Should add running status to initialized comment

	const commentBody = await readFixture("new-comment-initialized.html");
	const report = invokeBuildReport({
		inputs: { reportId: testReportId },
		results: null,
		isRunning: true,
	});

	const bodyHtml = parse(invokeGetCommentBody({ report, commentBody }));

	assertUIState("Updated with running", bodyHtml, {
		isRunning: true,
		hasResults: false,
	});

	const actualHtml = formatHtml(bodyHtml.toString());
	const fixture = await readFixture("new-comment-running.html");
	assertFixture(actualHtml, fixture, "Updating from initialized to running");
});

updateCommentSuite("Update from initialized to results", async () => {
	// Should clear global status when results come in

	const commentBody = await readFixture("new-comment-initialized.html");

	const body = invokeGetCommentBody({ commentBody });
	const html = formatHtml(body.toString());

	const fixture = await readFixture("test-results-new-comment.html");
	assertFixture(html, fixture, "Report body matches fixture");
});

updateCommentSuite("Update from running to results", async () => {
	const commentBody = await readFixture("new-comment-running.html");
	const report = invokeBuildReport({
		inputs: { reportId: testReportId },
	});

	const bodyHtml = parse(invokeGetCommentBody({ report, commentBody }));

	assertUIState("Updated", bodyHtml, { isRunning: false, hasResults: true });

	const actualHtml = formatHtml(bodyHtml.toString());
	const expectedHtml = await readFixture("test-results-existing-comment.html");

	assertFixture(
		actualHtml,
		expectedHtml,
		"Updating status with results fixture"
	);
});

updateCommentSuite("Update from results to running + results", async () => {
	// Update status for existing comment with old results

	const commentBody = await readFixture("test-results-existing-comment.html");
	const report = invokeBuildReport({
		inputs: { reportId: testReportId },
		results: null,
		isRunning: true,
	});

	const bodyHtml = parse(invokeGetCommentBody({ report, commentBody }));

	assertUIState("Updated results", bodyHtml, {
		isRunning: true,
		hasResults: true,
	});

	const actualHtml = formatHtml(bodyHtml.toString());

	const fixturePath = testRoot("fixtures/test-results-existing-running.html");
	const expectedHtml = await readFile(fixturePath, "utf-8");

	// Uncomment to update fixture
	// await writeFile(fixturePath, actualHtml, "utf-8");

	assertFixture(
		actualHtml,
		expectedHtml,
		"Updating status with results fixture"
	);
});

updateCommentSuite("Update from running + results to results", async () => {
	// Should remove running status from existing comment when results come in

	const newResults = generateNewTestResults();
	const commentBody = await readFixture("test-results-existing-running.html");

	// Assert original body html is what we expect
	let origBodyHtml = parse(commentBody);
	let resultTableCell = origBodyHtml
		.querySelectorAll(`tbody tr`)[2]
		.querySelectorAll("td")[3];
	assert.ok(
		resultTableCell.text.includes("unsure"),
		"Result table includes expected initial data"
	);

	const report = invokeBuildReport({
		inputs: { reportId: testReportId },
		results: newResults,
	});

	const bodyHtml = parse(invokeGetCommentBody({ report, commentBody }));

	assertUIState("Updated", bodyHtml, { isRunning: false, hasResults: true });

	resultTableCell = bodyHtml
		.querySelectorAll(`tbody tr`)[2]
		.querySelectorAll("td")[3];

	assert.ok(
		resultTableCell.text.includes("faster"),
		"Result table is updated to show new results"
	);
});

updateCommentSuite("Update from results to new results", async () => {
	// Should update summary/results when new results for existing benchmark come in"

	const newResults = generateNewTestResults();

	const commentBody = await readFixture("test-results-existing-comment.html");
	const origBodyHtml = parse(commentBody);

	// Assert original body html is what we expect
	let resultTableCell = origBodyHtml
		.querySelectorAll(`tbody tr`)[2]
		.querySelectorAll("td")[3];
	assert.ok(
		resultTableCell.text.includes("unsure"),
		"Result table includes expected initial data"
	);

	const report = invokeBuildReport({
		inputs: { reportId: testReportId },
		results: newResults,
	});

	const newBodyHtml = parse(invokeGetCommentBody({ report, commentBody }));
	// console.log(formatHtml(bodyHtml.toString()));

	assertUIState("New results", newBodyHtml, {
		isRunning: false,
		hasResults: true,
	});

	resultTableCell = newBodyHtml
		.querySelectorAll(`tbody tr`)[2]
		.querySelectorAll("td")[3];

	assert.ok(
		resultTableCell.text.includes("faster"),
		"Result table is updated to show new results"
	);
});

updateCommentSuite(
	"Add new running status to comment with another job's running status",
	async () => {
		const commentBody = await readFixture("new-comment-running.html");
		const report = invokeBuildReport({
			inputs: { reportId: otherReportId },
			results: null,
			isRunning: true,
		});

		const bodyHtml = parse(invokeGetCommentBody({ report, commentBody }));

		assertUIState("Other job data", bodyHtml, {
			isRunning: true,
			hasResults: false,
		});

		assertUIState(
			"This job data",
			bodyHtml,
			{ isRunning: true, hasResults: false },
			{ reportId: otherReportId }
		);
	}
);

updateCommentSuite(
	"Add new running status to comment with another job's results",
	async () => {
		// Should Add new summary/results entry when new report with status comes in

		const commentBody = await readFixture("test-results-existing-comment.html");
		const report = invokeBuildReport({
			inputs: { reportId: otherReportId },
			results: null,
			isRunning: true,
		});

		const bodyHtml = parse(invokeGetCommentBody({ report, commentBody }));

		assertUIState("Other job data", bodyHtml, {
			isRunning: false,
			hasResults: true,
		});

		assertUIState(
			"This job data",
			bodyHtml,
			{ isRunning: true, hasResults: false },
			{ reportId: otherReportId }
		);
	}
);

updateCommentSuite(
	"Add new results to comment with another job's running status",
	async () => {
		// Should add new summary/results entry when new report with just results comes in

		const newResults = JSON.parse(
			await readFile(testRoot("results/other-results.json"), "utf8")
		);

		const commentBody = await readFixture("new-comment-running.html");
		const report = invokeBuildReport({
			inputs: { reportId: otherReportId },
			results: newResults,
		});

		const bodyHtml = parse(invokeGetCommentBody({ report, commentBody }));
		// console.log(formatHtml(bodyHtml.toString()));

		assertUIState("Other job data", bodyHtml, {
			isRunning: true,
			hasResults: false,
		});

		assertUIState(
			"This job data",
			bodyHtml,
			{ isRunning: false, hasResults: true },
			{ reportId: otherReportId }
		);
	}
);

updateCommentSuite(
	"Add new results to comment with another job's results",
	async () => {
		// Should add new summary/results entry when new report with just results comes in

		const newResults = JSON.parse(
			await readFile(testRoot("results/other-results.json"), "utf8")
		);

		const commentBody = await readFixture("test-results-existing-comment.html");
		const report = invokeBuildReport({
			inputs: { reportId: otherReportId },
			results: newResults,
		});

		const bodyHtml = parse(invokeGetCommentBody({ report, commentBody }));
		// console.log(formatHtml(bodyHtml.toString()));

		assertUIState("Other job data", bodyHtml, {
			isRunning: false,
			hasResults: true,
		});

		assertUIState(
			"This job data",
			bodyHtml,
			{ isRunning: false, hasResults: true },
			{ reportId: otherReportId }
		);

		const html = formatHtml(bodyHtml.toString());
		const fixturePath = testRoot("fixtures/multiple-entries.html");
		const fixture = await readFile(fixturePath, "utf-8");

		// Uncomment to update fixture
		// await writeFile(fixturePath, html, "utf8");

		assertFixture(html, fixture, "Multiple results snapshot");
	}
);

updateCommentSuite(
	"Update status for existing comment when no job.html_url or run.html_url is present",
	async () => {
		const commentBody = await readFixture("test-results-existing-comment.html");
		const report = invokeBuildReport({
			inputs: { reportId: testReportId },
			actionInfo: {
				...defaultActionInfo,
				run: {
					...defaultActionInfo.run,
					htmlUrl: null,
				},
				job: {
					id: undefined,
					index: undefined,
					htmlUrl: undefined,
					name: defaultActionInfo.job.name,
				},
			},
			results: null,
			isRunning: true,
		});

		const bodyHtml = parse(invokeGetCommentBody({ report, commentBody }));

		const summaryId = getSummaryId({ reportId: testReportId });
		const summaryStatus = bodyHtml.querySelector(`#${summaryId} .status`);
		const summaryStatusLink = bodyHtml.querySelector(`#${summaryId} .status a`);
		const summaryData = bodyHtml.querySelector(`#${summaryId} em`);

		const resultId = getBenchmarkSectionId(testReportId);
		const resultStatus = bodyHtml.querySelector(`#${resultId} .status`);
		const resultStatusLink = bodyHtml.querySelector(`#${resultId} .status a`);
		const resultData = bodyHtml.querySelector(`#${resultId} table`);

		assert.ok(summaryStatus, "Summary status span exists");
		assert.ok(resultStatus, "Result status span exists");

		assert.ok(summaryStatus.text.includes("⏱"), "Summary status span has text");
		assert.ok(resultStatus.text.includes("⏱"), "Result status span has text");

		assert.not.ok(summaryStatusLink, "Summary status is not a link");
		assert.not.ok(resultStatusLink, "Result status is not a link");

		assert.ok(summaryData, "Summary data is still present");
		assert.ok(resultData, "Result data is still present");
	}
);

updateCommentSuite(
	"Insert a benchmark with a lower report title at the front",
	async () => {
		const newId = "another-new-id";
		const newResults = JSON.parse(
			await readFile(testRoot("results/other-results.json"), "utf8")
		);

		const commentBody = await readFixture("multiple-entries.html");
		const report = invokeBuildReport({
			inputs: { reportId: newId },
			results: newResults,
		});

		const bodyHtml = parse(invokeGetCommentBody({ report, commentBody }));

		const summaries = bodyHtml.querySelectorAll(
			`#${getSummaryListId()} li div`
		);
		const results = bodyHtml.querySelectorAll(
			`#${getResultsContainerId()} div`
		);

		// console.log(formatHtml(bodyHtml.toString()));

		assert.equal(
			summaries[0].getAttribute("id"),
			getSummaryId({ reportId: newId }),
			"First summary should be new report"
		);
		assert.equal(
			summaries[1].getAttribute("id"),
			getSummaryId({ reportId: testReportId }),
			"Second summary should be test results"
		);
		assert.equal(
			summaries[2].getAttribute("id"),
			getSummaryId({ reportId: otherReportId }),
			"Third summary should be other test results"
		);

		assert.equal(
			results[0].getAttribute("id"),
			getBenchmarkSectionId(newId),
			"First result entry should be new report"
		);
		assert.equal(
			results[1].getAttribute("id"),
			getBenchmarkSectionId(testReportId),
			"Second result entry should be test results"
		);
		assert.equal(
			results[2].getAttribute("id"),
			getBenchmarkSectionId(otherReportId),
			"Third result entry should be other test results"
		);
	}
);

updateCommentSuite(
	"Insert a benchmark with the higher report title at the end of the benchmarks",
	async () => {
		const newId = "zz-another-new-id";
		const newResults = JSON.parse(
			await readFile(testRoot("results/other-results.json"), "utf8")
		);

		const commentBody = await readFixture("multiple-entries.html");
		const report = invokeBuildReport({
			inputs: { reportId: newId },
			results: newResults,
		});

		const bodyHtml = parse(invokeGetCommentBody({ report, commentBody }));

		const summaries = bodyHtml.querySelectorAll(
			`#${getSummaryListId()} li div`
		);
		const results = bodyHtml.querySelectorAll(
			`#${getResultsContainerId()} div`
		);

		// console.log(formatHtml(bodyHtml.toString()));

		assert.equal(
			summaries[0].getAttribute("id"),
			getSummaryId({ reportId: testReportId }),
			"First summary should be test results"
		);
		assert.equal(
			summaries[1].getAttribute("id"),
			getSummaryId({ reportId: otherReportId }),
			"Second summary should be other test results"
		);
		assert.equal(
			summaries[2].getAttribute("id"),
			getSummaryId({ reportId: newId }),
			"Third summary should be new results"
		);

		assert.equal(
			results[0].getAttribute("id"),
			getBenchmarkSectionId(testReportId),
			"First result entry should be test results"
		);
		assert.equal(
			results[1].getAttribute("id"),
			getBenchmarkSectionId(otherReportId),
			"Third result entry should be other test results"
		);
		assert.equal(
			results[2].getAttribute("id"),
			getBenchmarkSectionId(newId),
			"Third result entry should be new results"
		);
	}
);

updateCommentSuite(
	"Updates benchmark results if run number is higher than the run number in HTML",
	async () => {
		const newResults = generateNewTestResults();

		const commentBody = await readFixture("test-results-existing-comment.html");
		const report = invokeBuildReport({
			inputs: { reportId: testReportId },
			results: newResults,
			actionInfo: {
				...defaultActionInfo,
				run: {
					...defaultActionInfo.run,
					number: defaultActionInfo.run.number + 1,
				},
			},
		});

		const bodyHtml = parse(invokeGetCommentBody({ report, commentBody }));
		const resultTableCell = bodyHtml
			.querySelectorAll(`tbody tr`)[2]
			.querySelectorAll("td")[3];

		assert.ok(
			resultTableCell.text.includes("faster"),
			"Result table is updated to show new results"
		);
	}
);

updateCommentSuite(
	"Updates benchmark results if run number is the same as the run number in HTML",
	async () => {
		const newResults = generateNewTestResults();

		const commentBody = await readFixture("test-results-existing-comment.html");
		const report = invokeBuildReport({
			inputs: { reportId: testReportId },
			results: newResults,
			actionInfo: {
				...defaultActionInfo,
				run: {
					...defaultActionInfo.run,
					number: defaultActionInfo.run.number,
				},
			},
		});

		const bodyHtml = parse(invokeGetCommentBody({ report, commentBody }));
		const resultTableCell = bodyHtml
			.querySelectorAll(`tbody tr`)[2]
			.querySelectorAll("td")[3];

		assert.ok(
			resultTableCell.text.includes("faster"),
			"Result table is updated to show new results"
		);
	}
);

updateCommentSuite(
	"Does not update benchmark results if run number is the lower than the run number in HTML",
	async () => {
		const newResults = generateNewTestResults();

		const commentBody = await readFixture("test-results-existing-comment.html");
		const report = invokeBuildReport({
			inputs: { reportId: testReportId },
			results: newResults,
			actionInfo: {
				...defaultActionInfo,
				run: {
					...defaultActionInfo.run,
					number: defaultActionInfo.run.number - 1,
				},
			},
		});

		const bodyHtml = parse(invokeGetCommentBody({ report, commentBody }));
		const resultTableCell = bodyHtml
			.querySelectorAll(`tbody tr`)[2]
			.querySelectorAll("td")[3];

		assert.ok(
			resultTableCell.text.includes("unsure"),
			"Result table is updated to show new results"
		);
	}
);

updateCommentSuite(
	"Renders unmodified comment body report is null",
	async () => {
		const commentBody = await readFixture("test-results-existing-comment.html");

		const body = invokeGetCommentBody({
			commentBody,
			report: null,
		});
		const html = formatHtml(body.toString());

		assertFixture(html, commentBody, "Report body matches fixture");
	}
);

// keep-old-results option
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

//#endregion

//#region Multi-measure tests
const multiMeasure = suite("Multiple measures in one benchmark");

const multiMeasureReportId = "multi-measure-report-id";
const otherMultiMeasureReportId = "other-multi-measure-report-id";
const multiMeasureIds = [
	"R-VSUDBIvX9oa7OhG2Td6w-LuY4", // duration
	"AmH0KOJP8BUNrat2VaC_V3DY9mI", // window.usedJSHeapSize
];

// Create/add with results
// ==============================

multiMeasure("New comment with multi-measure results", async () => {
	const results = getMultiMeasureResults();
	const report = invokeBuildReport({
		results,
		inputs: { reportId: multiMeasureReportId },
	});

	const body = parse(invokeGetCommentBody({ report }));

	assertUIState(
		"No default measures",
		body,
		{ isRunning: false, hasResults: false },
		{ reportId: multiMeasureReportId, measurementId: defaultMeasureId }
	);

	assertUIState(
		"Measure 1 results",
		body,
		{ isRunning: false, hasResults: true },
		{ reportId: multiMeasureReportId, measurementId: multiMeasureIds[0] }
	);

	assertUIState(
		"Measure 2 results",
		body,
		{ isRunning: false, hasResults: true },
		{ reportId: multiMeasureReportId, measurementId: multiMeasureIds[1] }
	);

	const actualHtml = formatHtml(body.toString());
	const fixturePath = testRoot("fixtures/multi-measure-results.html");
	const fixture = await readFile(fixturePath, "utf-8");

	// Uncomment to update fixture
	// await writeFile(fixturePath, actualHtml, "utf-8");

	assertFixture(actualHtml, fixture, "Comment body matches fixture");
});

multiMeasure("Adds multi-measure results to initialized comment", async () => {
	const commentBody = await readFixture("new-comment-initialized.html");
	const results = getMultiMeasureResults();
	const report = invokeBuildReport({
		results,
		inputs: { reportId: multiMeasureReportId },
	});

	const body = invokeGetCommentBody({ commentBody, report });

	const actualHtml = formatHtml(body.toString());
	const fixture = await readFixture("multi-measure-results.html");

	assertFixture(actualHtml, fixture, "Comment body matches fixture");
});

multiMeasure(
	"Adds multi-measure results to comment with another job's running status",
	async () => {
		const commentBody = await readFixture("new-comment-running.html");
		const results = getMultiMeasureResults();
		const report = invokeBuildReport({
			results,
			inputs: { reportId: multiMeasureReportId },
		});

		const body = parse(invokeGetCommentBody({ report, commentBody }));

		assertUIState("Other job data", body, {
			isRunning: true,
			hasResults: false,
		});

		assertUIState(
			"This job measure 1",
			body,
			{ isRunning: false, hasResults: true },
			{
				reportId: multiMeasureReportId,
				measurementId: multiMeasureIds[0],
			}
		);

		assertUIState(
			"This job measure 2",
			body,
			{ isRunning: false, hasResults: true },
			{
				reportId: multiMeasureReportId,
				measurementId: multiMeasureIds[1],
			}
		);
	}
);

multiMeasure(
	"Adds multi-measure results to comment with another job's results",
	async () => {
		const commentBody = await readFixture("test-results-existing-comment.html");
		const results = getMultiMeasureResults();
		const report = invokeBuildReport({
			results,
			inputs: { reportId: multiMeasureReportId },
		});

		const body = parse(invokeGetCommentBody({ report, commentBody }));

		assertUIState("Other job data", body, {
			isRunning: false,
			hasResults: true,
		});

		assertUIState(
			"This job measure 1",
			body,
			{ isRunning: false, hasResults: true },
			{
				reportId: multiMeasureReportId,
				measurementId: multiMeasureIds[0],
			}
		);

		assertUIState(
			"This job measure 2",
			body,
			{ isRunning: false, hasResults: true },
			{
				reportId: multiMeasureReportId,
				measurementId: multiMeasureIds[1],
			}
		);
	}
);

// Create/add with running status
// ==============================

multiMeasure("New comment with multi-measure running status", async () => {
	const inputs = { reportId: multiMeasureReportId };
	const report = invokeBuildReport({ inputs, results: null, isRunning: true });
	const body = parse(invokeGetCommentBody({ inputs, report }));

	assertUIState(
		"Multi-measure running",
		body,
		{ isRunning: true, hasResults: false },
		{ reportId: multiMeasureReportId, measurementId: defaultMeasureId }
	);

	const actualHtml = formatHtml(body.toString());
	const fixturePath = testRoot("fixtures/multi-measure-running.html");
	const fixture = await readFile(fixturePath, "utf-8");

	// Uncomment to update fixture
	// await writeFile(fixturePath, html, "utf8");

	assertFixture(actualHtml, fixture, "Report body matches fixture");
});

multiMeasure(
	"Add running status to comment with another job's multi-measure results",
	async () => {
		const commentBody = await readFixture("multi-measure-results.html");
		const report = invokeBuildReport({
			inputs: { reportId: testReportId },
			results: null,
			isRunning: true,
		});

		const body = parse(invokeGetCommentBody({ report, commentBody }));

		assertUIState(
			"Other job, measure 1",
			body,
			{ isRunning: false, hasResults: true },
			{
				reportId: multiMeasureReportId,
				measurementId: multiMeasureIds[0],
			}
		);

		assertUIState(
			"Other job, measure 2",
			body,
			{ isRunning: false, hasResults: true },
			{
				reportId: multiMeasureReportId,
				measurementId: multiMeasureIds[1],
			}
		);

		assertUIState("This job running", body, {
			isRunning: true,
			hasResults: false,
		});
	}
);

// Update where comment already includes info about this job
// ==============================

multiMeasure(
	"Update from new running comment to multi-measure results",
	async () => {
		// Status starts off in default section
		// Code should remove it and put results in grouped section

		const results = getMultiMeasureResults();
		const commentBody = await readFixture("multi-measure-running.html");

		assertUIState(
			"Multi-measure is running",
			parse(commentBody),
			{ isRunning: true, hasResults: false },
			{ reportId: multiMeasureReportId, measurementId: defaultMeasureId }
		);

		const report = invokeBuildReport({
			inputs: { reportId: multiMeasureReportId },
			results,
		});

		const body = parse(invokeGetCommentBody({ report, commentBody }));

		assertUIState(
			"Multi-measure not running",
			body,
			{ isRunning: false, hasResults: false },
			{ reportId: multiMeasureReportId, measurementId: defaultMeasureId }
		);

		assertUIState(
			"Measure 1 results",
			body,
			{ isRunning: false, hasResults: true },
			{ reportId: multiMeasureReportId, measurementId: multiMeasureIds[0] }
		);

		assertUIState(
			"Measure 2 results",
			body,
			{ isRunning: false, hasResults: true },
			{ reportId: multiMeasureReportId, measurementId: multiMeasureIds[1] }
		);

		const actualHtml = formatHtml(body.toString());
		const fixture = await readFixture("multi-measure-results.html");
		assertFixture(actualHtml, fixture, "Comment matches fixture");
	}
);

multiMeasure(
	"Update from multi-measure results to multi-measure running + results",
	async () => {
		const commentBody = await readFixture("multi-measure-results.html");

		const initialHtml = parse(commentBody);
		assertUIState(
			"Default measure not initially running",
			initialHtml,
			{ isRunning: false, hasResults: false },
			{ reportId: multiMeasureReportId, measurementId: defaultMeasureId }
		);

		assertUIState(
			"Measure 1 initial results",
			initialHtml,
			{ isRunning: false, hasResults: true },
			{ reportId: multiMeasureReportId, measurementId: multiMeasureIds[0] }
		);

		assertUIState(
			"Measure 2 initial results",
			initialHtml,
			{ isRunning: false, hasResults: true },
			{ reportId: multiMeasureReportId, measurementId: multiMeasureIds[1] }
		);

		const report = invokeBuildReport({
			inputs: { reportId: multiMeasureReportId },
			results: null,
			isRunning: true,
		});

		const body = parse(invokeGetCommentBody({ report, commentBody }));

		let defaultSummary = getSummaryId({
			reportId: multiMeasureReportId,
			measurementId: defaultMeasureId,
		});

		assert.not.ok(
			body.querySelector(defaultSummary),
			"Default summary should not exist"
		);

		assertUIState(
			"Measure 1 results + running",
			body,
			{ isRunning: true, hasResults: true },
			{ reportId: multiMeasureReportId, measurementId: multiMeasureIds[0] }
		);

		assertUIState(
			"Measure 2 results + running",
			body,
			{ isRunning: true, hasResults: true },
			{ reportId: multiMeasureReportId, measurementId: multiMeasureIds[1] }
		);

		const actualHtml = formatHtml(body.toString());
		const fixturePath = testRoot("fixtures/multi-measure-results-running.html");
		const fixture = await readFile(fixturePath, "utf-8");

		// Uncomment to update fixture
		// await writeFile(fixturePath, actualHtml, "utf-8");

		assertFixture(actualHtml, fixture, "Comment body matches fixture");
	}
);

async function runResultsToResultsScenario(initiallyRunning) {
	let initialFixture;
	if (initiallyRunning) {
		// Status is in existing measurement entries. Should be cleared here
		initialFixture = "multi-measure-results-running.html";
	} else {
		initialFixture = "multi-measure-results.html";
	}

	const resultId = getBenchmarkSectionId(multiMeasureReportId);
	const commentBody = await readFixture(initialFixture);

	// Assert initial data is what we expect
	const initialHtml = parse(commentBody);

	assertUIState(
		"Measure 1 initial results",
		initialHtml,
		{ isRunning: initiallyRunning, hasResults: true },
		{ reportId: multiMeasureReportId, measurementId: multiMeasureIds[0] }
	);

	let resultTableCell = initialHtml
		.querySelector(`#${resultId} table.results::${multiMeasureIds[0]}`)
		.querySelectorAll(`tbody tr`)[2]
		.querySelectorAll("td")[3];

	assert.ok(
		resultTableCell.text.includes("faster"),
		"Measure 1 result table shows initial results"
	);

	assertUIState(
		"Measure 2 initial results",
		initialHtml,
		{ isRunning: initiallyRunning, hasResults: true },
		{ reportId: multiMeasureReportId, measurementId: multiMeasureIds[1] }
	);

	resultTableCell = initialHtml
		.querySelector(`#${resultId} table.results::${multiMeasureIds[1]}`)
		.querySelectorAll(`tbody tr`)[2]
		.querySelectorAll("td")[3];

	assert.ok(
		resultTableCell.text.includes("slower"),
		"Measure 2 result table shows initial results"
	);

	const report = invokeBuildReport({
		inputs: { reportId: multiMeasureReportId },
		results: generateNewMultiMeasureResults(),
	});

	const body = parse(invokeGetCommentBody({ report, commentBody }));

	let defaultSummary = getSummaryId({
		reportId: multiMeasureReportId,
		measurementId: defaultMeasureId,
	});

	assert.not.ok(
		body.querySelector(defaultSummary),
		"Default summary should not exist"
	);

	assertUIState(
		"Measure 1 new results",
		body,
		{ isRunning: false, hasResults: true },
		{ reportId: multiMeasureReportId, measurementId: multiMeasureIds[0] }
	);

	resultTableCell = body
		.querySelector(`#${resultId} table.results::${multiMeasureIds[0]}`)
		.querySelectorAll(`tbody tr`)[2]
		.querySelectorAll("td")[3];

	assert.ok(
		resultTableCell.text.includes("slower"),
		"Measure 1 result table is updated to show new results"
	);

	assertUIState(
		"Measure 2 new results",
		body,
		{ isRunning: false, hasResults: true },
		{ reportId: multiMeasureReportId, measurementId: multiMeasureIds[1] }
	);

	resultTableCell = body
		.querySelector(`#${resultId} table.results::${multiMeasureIds[1]}`)
		.querySelectorAll(`tbody tr`)[2]
		.querySelectorAll("td")[3];

	assert.ok(
		resultTableCell.text.includes("faster"),
		"Measure 2 result table is updated to show new results"
	);
}

multiMeasure(
	"Update from multi-measure running + results to multi-measure results",
	async () => {
		await runResultsToResultsScenario(true);
	}
);

multiMeasure(
	"Update from multi-measure results to new multi-measure results",
	async () => {
		await runResultsToResultsScenario(false);
	}
);

// Multiple multi-measurement jobs
// ==============================

multiMeasure(
	"Summary should add new multi-measure results to another job's existing measurement groups",
	async () => {
		const commentBody = await readFixture("multi-measure-results.html");
		const initialHtml = parse(commentBody);

		assertUIState(
			"Measure 1 initial results",
			initialHtml,
			{ isRunning: false, hasResults: true },
			{ reportId: multiMeasureReportId, measurementId: multiMeasureIds[0] }
		);

		assertUIState(
			"Measure 2 initial results",
			initialHtml,
			{ isRunning: false, hasResults: true },
			{ reportId: multiMeasureReportId, measurementId: multiMeasureIds[1] }
		);

		const otherResults = JSON.parse(
			await readFile(
				testRoot("results/multi-measure-other-results.json"),
				"utf8"
			)
		);

		const report = invokeBuildReport({
			inputs: { reportId: otherMultiMeasureReportId },
			results: otherResults,
		});

		const body = parse(invokeGetCommentBody({ report, commentBody }));

		let defaultSummary = getSummaryId({
			reportId: multiMeasureReportId,
			measurementId: defaultMeasureId,
		});

		assert.not.ok(
			body.querySelector(defaultSummary),
			"Default summary should not exist"
		);

		assertUIState(
			"Report 1, Measure 1 results",
			body,
			{ isRunning: false, hasResults: true },
			{ reportId: multiMeasureReportId, measurementId: multiMeasureIds[0] }
		);

		assertUIState(
			"Report 1, Measure 2 results",
			body,
			{ isRunning: false, hasResults: true },
			{ reportId: multiMeasureReportId, measurementId: multiMeasureIds[1] }
		);

		assertUIState(
			"Report 2, Measure 1 results",
			body,
			{ isRunning: false, hasResults: true },
			{ reportId: otherMultiMeasureReportId, measurementId: multiMeasureIds[0] }
		);

		assertUIState(
			"Report 2, Measure 2 results",
			body,
			{ isRunning: false, hasResults: true },
			{ reportId: otherMultiMeasureReportId, measurementId: multiMeasureIds[1] }
		);

		const actualHtml = formatHtml(body.toString());
		const fixturePath = testRoot("fixtures/multi-measure-multi-results.html");
		const fixture = await readFile(fixturePath, "utf-8");

		// Uncomment to update fixture
		// await writeFile(fixturePath, actualHtml, "utf-8");

		assertFixture(actualHtml, fixture, "Comment body matches fixture");
	}
);

multiMeasure(
	"Summary should add new multi-measure results to another job's existing measurement groups and create new groups if necessary",
	async () => {
		const commentBody = await readFixture("multi-measure-results.html");
		const initialHtml = parse(commentBody);

		assertUIState(
			"Measure 1 initial results",
			initialHtml,
			{ isRunning: false, hasResults: true },
			{ reportId: multiMeasureReportId, measurementId: multiMeasureIds[0] }
		);

		assertUIState(
			"Measure 2 initial results",
			initialHtml,
			{ isRunning: false, hasResults: true },
			{ reportId: multiMeasureReportId, measurementId: multiMeasureIds[1] }
		);

		const otherResults = JSON.parse(
			await readFile(
				testRoot("results/multi-measure-other-results.json"),
				"utf8"
			)
		);

		// Create a third measure for this test
		const thirdMeasureId = "SQIqX848acP4ZVitvlzcH9axFM8";
		for (let i = 1; i < otherResults.benchmarks.length; i += 2) {
			otherResults.benchmarks[i].name = "test_bench_2 [other-measure]";
		}

		const report = invokeBuildReport({
			inputs: { reportId: otherMultiMeasureReportId },
			results: otherResults,
		});

		const body = parse(invokeGetCommentBody({ report, commentBody }));

		let defaultSummary = getSummaryId({
			reportId: multiMeasureReportId,
			measurementId: defaultMeasureId,
		});

		assert.not.ok(
			body.querySelector(defaultSummary),
			"Default summary should not exist"
		);

		assertUIState(
			"Report 1, Measure 1 results",
			body,
			{ isRunning: false, hasResults: true },
			{ reportId: multiMeasureReportId, measurementId: multiMeasureIds[0] }
		);

		assertUIState(
			"Report 1, Measure 2 results",
			body,
			{ isRunning: false, hasResults: true },
			{ reportId: multiMeasureReportId, measurementId: multiMeasureIds[1] }
		);

		assertUIState(
			"Report 2, Measure 1 results",
			body,
			{ isRunning: false, hasResults: true },
			{ reportId: otherMultiMeasureReportId, measurementId: multiMeasureIds[0] }
		);

		assertUIState(
			"Report 2, Measure 2 results",
			body,
			{ isRunning: false, hasResults: true },
			{ reportId: otherMultiMeasureReportId, measurementId: thirdMeasureId }
		);
	}
);

// Other measure options
// ==============================

multiMeasure("Multi-measures with name fields", async () => {
	const resultPath = testRoot("results/multi-measure-names.json");
	const results = JSON.parse(await readFile(resultPath, "utf8"));
	const reportId = "multi-measure-names";

	const multiMeasureIds = [
		"Bq0B3-8_UWt48DqpmNB3lNnwTd4",
		"gN4D636F9Ua7c6W5IuuBZhQaUoU",
		"MBkGEFvQqNyyN0MCAmJK9BTIAxU",
	];

	/** @type {Partial<import('../src/global').Inputs>} */
	const inputs = {
		reportId,
		baseBenchName: "tip-of-tree",
		prBenchName: "this-change",
	};
	const report = invokeBuildReport({ results, inputs });
	const body = parse(invokeGetCommentBody({ report, inputs }));

	assertUIState(
		"No default measures",
		body,
		{ isRunning: false, hasResults: false },
		{ reportId, measurementId: defaultMeasureId }
	);

	assertUIState(
		"Measure 1 results",
		body,
		{ isRunning: false, hasResults: true },
		{ reportId, measurementId: multiMeasureIds[0] }
	);

	assertUIState(
		"Measure 2 results",
		body,
		{ isRunning: false, hasResults: true },
		{ reportId, measurementId: multiMeasureIds[1] }
	);

	assertUIState(
		"Measure 3 results",
		body,
		{ isRunning: false, hasResults: true },
		{ reportId, measurementId: multiMeasureIds[2] }
	);

	const actualHtml = formatHtml(body.toString());
	const fixturePath = testRoot("fixtures/multi-measure-names.html");
	const fixture = await readFile(fixturePath, "utf-8");

	// Uncomment to update fixture
	// await writeFile(fixturePath, actualHtml, "utf-8");

	assertFixture(actualHtml, fixture, "Comment body matches fixture");
});

multiMeasure("Multi-measures without name fields", async () => {
	const resultPath = testRoot("results/multi-measure-no-names.json");
	const results = JSON.parse(await readFile(resultPath, "utf8"));
	const reportId = "multi-measure-names";

	const multiMeasureIds = [
		{ id: "t8znIBA9KrQYNSyoz-4Jna9YCrQ", title: "callback" }, // callback
		{ id: "12YIarwIZuZ5QWn8qfJ55ROrszY", title: "fcp" }, // fcp
		{ id: "wiSX3EZEDoywSN8002Cnpy2_BjU", title: "window.expression" }, // expression
		{ id: "hf-lVNr-03D24D1OXrvskvegFkM", title: "duration" }, // perf entry
	];

	/** @type {Partial<import('../src/global').Inputs>} */
	const inputs = {
		reportId,
		baseBenchName: "tip-of-tree",
		prBenchName: "this-change",
	};
	const report = invokeBuildReport({ results, inputs });
	const body = parse(invokeGetCommentBody({ report, inputs }));

	assertUIState(
		"No default measures",
		body,
		{ isRunning: false, hasResults: false },
		{ reportId, measurementId: defaultMeasureId }
	);

	for (let { id, title } of multiMeasureIds) {
		// TODO: Complete the results file to match the perf entry measure
		if (id !== "hf-lVNr-03D24D1OXrvskvegFkM") {
			assertUIState(
				`${title} measure results`,
				body,
				{ isRunning: false, hasResults: true },
				{ reportId, measurementId: id }
			);
		}

		const summaryId = getSummaryListId(id);
		const summary = body.querySelector(`#${summaryId}`);
		const parent = summary.parentNode;
		assert.ok(
			parent.attributes["data-sort-key"] == title,
			`${title} has expected title`
		);
	}
});

//#endregion

newCommentSuite.run();
updateCommentSuite.run();
multiMeasure.run();
