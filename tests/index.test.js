const path = require("path");
const { readFileSync } = require("fs");
const { readFile, writeFile } = require("fs").promises;
const { suite } = require("uvu");
const assert = require("uvu/assert");
const { parse, HTMLElement } = require("node-html-parser");
const prettier = require("prettier");
const { buildReport, getCommentBody } = require("../lib/index");

const testRoot = (...args) => path.join(__dirname, ...args);
const testResultsPath = testRoot("results/test-results.json");

/** @type {import('../src/global').TachResults} */
const testResults = JSON.parse(readFileSync(testResultsPath, "utf8"));

/** @type {() => import('../src/global').TachResults} */
const copyResults = () => JSON.parse(JSON.stringify(testResults));
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

const prBenchName = "local-framework";
const baseBenchName = "base-framework";
const defaultInputs = Object.freeze({
	path: testRoot("results/test-results.json"),
	reportId: null,
	prBenchName,
	baseBenchName,
	defaultOpen: false,
	keepOldResults: false,
});

/** @type {import('../src/global').Logger} */
const testLogger = {
	debug() {},
	info() {},
	warn() {},
	startGroup() {},
	endGroup() {},
};

/** @type {import('../src/global').WorkflowRunInfo} */
// @ts-ignore
const fakeWorkflowRun = {
	workflowRunName: "Pull Request Test #50",
	jobHtmlUrl:
		"https://github.com/andrewiggins/tachometer-reporter-action/runs/862224869?check_suite_focus=true",
};

/** @type {import('../src/global').CommitInfo} */
const fakeCommit = {
	sha: "626e78c2446b8d1afc917fc9b0059aa65cc9a07d",
	node_id:
		"MDY6Q29tbWl0Mjc4NzIyMjI3OjYyNmU3OGMyNDQ2YjhkMWFmYzkxN2ZjOWIwMDU5YWE2NWNjOWEwN2Q=",
	url:
		"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/git/commits/626e78c2446b8d1afc917fc9b0059aa65cc9a07d",
	html_url:
		"https://github.com/andrewiggins/tachometer-reporter-action/commit/626e78c2446b8d1afc917fc9b0059aa65cc9a07d",
	author: {
		name: "Andre Wiggins",
		email: "author@email.com",
		date: "2020-07-15T07:22:26Z",
	},
	committer: {
		name: "Andre Wiggins",
		email: "committer@email.com",
		date: "2020-07-15T07:22:26Z",
	},
	tree: {
		sha: "860ccb10b8f2866599fb3a1256ce65bfea59589b",
		url:
			"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/git/trees/860ccb10b8f2866599fb3a1256ce65bfea59589b",
	},
	message: "Fill in readme",
	parents: [
		{
			sha: "e14f6dfcaca042ac8fa174d96afa9fabe0e0516b",
			url:
				"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/git/commits/e14f6dfcaca042ac8fa174d96afa9fabe0e0516b",
			// html_url: "https://github.com/andrewiggins/tachometer-reporter-action/commit/e14f6dfcaca042ac8fa174d96afa9fabe0e0516b",
		},
	],
	verification: {
		verified: false,
		reason: "unsigned",
		signature: null,
		payload: null,
	},
};

const getBenchmarkSectionId = (id) =>
	`tachometer-reporter-action--results-${id ? id : ""}`;
const getSummaryId = (id) =>
	`tachometer-reporter-action--summary-${id ? id : ""}`;
const getSummaryListId = () => `tachometer-reporter-action--summaries`;

/**
 * @typedef BuildReportParams
 * @property {import('../src/global').CommitInfo} [commit]
 * @property {import('../src/global').WorkflowRunInfo} [workflow]
 * @property {Partial<import('../src/global').Inputs>} [inputs]
 * @property {import('../src/global').TachResults} [results]
 * @property {boolean} [isRunning]
 * @param {BuildReportParams} params
 */
function invokeBuildReport({
	commit = fakeCommit,
	workflow = fakeWorkflowRun,
	inputs = null,
	results = testResults,
	isRunning = false,
} = {}) {
	const fullInputs = {
		...defaultInputs,
		...inputs,
	};

	return buildReport(commit, workflow, fullInputs, results, isRunning);
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

const buildReportSuite = suite("buildReport");

buildReportSuite("Body snapshot", async () => {
	const report = invokeBuildReport();
	const html = formatHtml(report.body.toString());

	const fixturePath = testRoot("fixtures/test-results-body.html");
	const fixture = await readFile(fixturePath, "utf-8");

	// Uncomment to update fixture
	// await writeFile(fixturePath, html, "utf8");

	assertFixture(html, fixture, "Report body matches fixture");
});

buildReportSuite("Summary snapshot", async () => {
	const report = invokeBuildReport();
	const html = formatHtml(report.summary.toString());

	const fixturePath = testRoot("fixtures/test-results-summary.html");
	const fixture = await readFile(fixturePath, "utf-8");

	// Uncomment to update fixture
	// await writeFile(fixturePath, html, "utf8");

	assertFixture(html, fixture, "Report summary matches fixture");
});

buildReportSuite("Uses input.reportId", () => {
	const reportId = "test-input-id";
	const report = invokeBuildReport({ inputs: { reportId } });

	assert.is(report.id, reportId, "report.id matches input id");
});

buildReportSuite("Generates reportId if not given", () => {
	const expectedId = "l5UdXHMZ2m10Bdp0kqRnW0cWarA";
	const report = invokeBuildReport();

	assert.is(report.id, expectedId, "report.id matches expectation");
});

buildReportSuite("Summarizes one benchmark correctly", () => {
	const singleResult = copyResults().benchmarks[0];
	const results = { benchmarks: [singleResult] };

	const report = invokeBuildReport({ results });

	const summaryText = report.summary.toString();
	assert.ok(
		summaryText.includes("32.09ms - 38.19ms"),
		"Generates interval for single result"
	);
});

buildReportSuite("Default summary if base version is null", () => {
	const report = invokeBuildReport({ inputs: { baseBenchName: null } });
	assert.not.ok(report.baseBenchName, "report.baseBenchName is null");
	assert.ok(report.summary, "report.summary is not null");

	const summaryText = report.summary.toString();
	assert.ok(
		summaryText.includes("local-framework vs fast-framework"),
		"Uses default values for pr bench and base bench"
	);
	assert.ok(
		summaryText.includes("Customize summary"),
		"Includes link to docs to customize summary"
	);
});

buildReportSuite("Default summary if local version is null", () => {
	const report = invokeBuildReport({
		inputs: { baseBenchName: "fast-framework", prBenchName: null },
	});
	assert.not.ok(report.prBenchName, "report.prBenchName is null");
	assert.ok(report.summary, "report.summary is not null");

	const summaryText = report.summary.toString();
	assert.ok(
		summaryText.includes("base-framework vs fast-framework"),
		"Uses default values for pr bench and base bench"
	);
	assert.ok(
		summaryText.includes("Customize summary"),
		"Includes link to docs to customize summary"
	);
});

buildReportSuite("Default summary if base and local version are null", () => {
	const report = invokeBuildReport({
		inputs: { prBenchName: null, baseBenchName: null },
	});
	assert.not.ok(report.prBenchName, "report.prBenchName is null");
	assert.not.ok(report.baseBenchName, "report.baseBenchName is null");
	assert.ok(report.summary, "report.summary is not null");

	const summaryText = report.summary.toString();
	assert.ok(
		summaryText.includes("base-framework vs fast-framework"),
		"Uses default values for pr bench and base bench"
	);
	assert.ok(
		summaryText.includes("Customize summary"),
		"Includes link to docs to customize summary"
	);
});

buildReportSuite(
	"Summary includes error message if can't find pr-bench-name",
	() => {
		const report = invokeBuildReport({
			inputs: { prBenchName: "Bench #1" },
		});
		const summaryText = report.summary.toString();
		assert.ok(
			summaryText.includes(
				"Could not find benchmark matching <code>pr-bench-name</code>"
			),
			"Error message for bad pr-bench-name"
		);
	}
);

buildReportSuite(
	"Summary includes error message if can't find base-bench-name",
	() => {
		const report = invokeBuildReport({
			inputs: { baseBenchName: "Bench #1" },
		});
		const summaryText = report.summary.toString();
		assert.ok(
			summaryText.includes(
				"Could not find benchmark matching <code>base-bench-name</code>"
			),
			"Error message for bad base-bench-name"
		);
	}
);

buildReportSuite(
	"Summary includes error message if base-bench-name and pr-bench-name match same result",
	() => {
		const report = invokeBuildReport({
			inputs: { prBenchName: "fast-framework", baseBenchName: "test_bench" },
		});
		const summaryText = report.summary.toString();
		assert.ok(
			summaryText.includes("matched the same benchmark"),
			"Error message for same pr-bench-name and base-bench-name"
		);
	}
);

buildReportSuite("Supports benchmarks with different names", () => {
	const results = copyResults();
	const otherBenchName = "other-bench";

	results.benchmarks[1].name = otherBenchName;
	const report = invokeBuildReport({ results });
	const bodyDoc =
		report.body instanceof HTMLElement ? report.body : parse(report.body);
	const summaryDoc =
		report.summary instanceof HTMLElement
			? report.summary
			: parse(report.summary);

	// console.log(prettier.format(report.body, { parser: "html" }));

	// Check row and columns include both bench name and version name
	const rowLabels = bodyDoc
		.querySelectorAll("tbody tr")
		.map((row) => row.childNodes[0].text);
	const columnLabels = bodyDoc
		.querySelectorAll("thead th")
		.map((td) => td.text);

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
			columnLabel.includes(bench.version),
			"Column label contains bench.version"
		);
	}

	// Summary should use report title as label, and show both names in "vs." subtext
	// console.log(prettier.format(summaryDoc.toString(), { parser: "html" }));
	const summaryText = summaryDoc.toString();
	assert.ok(
		summaryText.includes(report.title),
		"Summary includes report title"
	);
	assert.ok(
		summaryText.includes("-10% - +12%"),
		"Summary includes expected diff"
	);
	assert.ok(
		summaryText.includes("local-framework vs base-framework"),
		"Summary includes 'vs.' text, still using versions if present"
	);
});

buildReportSuite("Lists all browsers used in details", () => {
	const results = copyResults();

	results.benchmarks[0].browser = {
		name: "firefox",
		headless: false,
		windowSize: { width: 1024, height: 768 },
	};

	const report = invokeBuildReport({ results });
	const bodyDoc =
		report.body instanceof HTMLElement ? report.body : parse(report.body);
	const summaryDoc =
		report.summary instanceof HTMLElement
			? report.summary
			: parse(report.summary);

	// console.log(prettier.format(report.body.toString(), { parser: "html" }));

	// Check details list includes all browsers
	const listItems = bodyDoc.querySelectorAll("ul li").map((li) => li.text);

	results.benchmarks.forEach((bench) => {
		assert.ok(
			listItems.some((text) => text.includes(bench.browser.name)),
			`List items mention "${bench.browser.name}"`
		);
	});

	// Check table rows and columns include browsers
	const rowLabels = bodyDoc
		.querySelectorAll("tbody tr")
		.map((row) => row.childNodes[0].text);
	const columnLabels = bodyDoc
		.querySelectorAll("thead th")
		.map((td) => td.text);

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
			columnLabel.includes(bench.version),
			"Column label contains bench.version"
		);
	}

	// Summary should use report title as label, and show both names in "vs." subtext
	// console.log(prettier.format(summaryDoc.toString(), { parser: "html" }));
	const summaryText = summaryDoc.toString();
	assert.ok(
		summaryText.includes(report.title),
		"Summary includes report title"
	);
	assert.ok(
		summaryText.includes("-10% - +12%"),
		"Summary includes expected diff"
	);
	assert.ok(
		summaryText.includes("local-framework vs base-framework"),
		"Summary includes 'vs.' text, still using versions if present"
	);
});

buildReportSuite(
	"Supports benchmarks with different names and no version fields",
	() => {
		const results = copyResults();
		results.benchmarks = results.benchmarks.map((b, i) => ({
			...b,
			name: `Bench #${i}`,
			version: null,
		}));

		const report = invokeBuildReport({
			results,
			inputs: { prBenchName: "Bench #1", baseBenchName: "Bench #2" },
		});
		const bodyDoc =
			report.body instanceof HTMLElement ? report.body : parse(report.body);
		const summaryDoc =
			report.summary instanceof HTMLElement
				? report.summary
				: parse(report.summary);

		// console.log(prettier.format(report.body, { parser: "html" }));

		// Check row and columns include both bench name and version name
		const rowLabels = bodyDoc
			.querySelectorAll("tbody tr")
			.map((row) => row.childNodes[0].text);
		const columnLabels = bodyDoc
			.querySelectorAll("thead th")
			.map((td) => td.text);

		for (let i = 0; i < results.benchmarks.length; i++) {
			const bench = results.benchmarks[i];
			const rowLabel = rowLabels[i];
			const columnLabel = columnLabels[i + 2];

			assert.ok(rowLabel.includes(bench.name), "Row label contains bench.name");
			assert.ok(
				columnLabel.includes(bench.name),
				"Column label contains bench.name"
			);
		}

		// Summary should use report title as label, and show both names in "vs." subtext
		// console.log(prettier.format(summaryDoc.toString(), { parser: "html" }));
		const summaryText = summaryDoc.toString();
		assert.ok(
			summaryText.includes(report.title),
			"Summary includes report title"
		);
		assert.ok(
			summaryText.includes("-12% - +9%"),
			"Summary includes expected diff"
		);
		assert.ok(
			summaryText.includes("Bench #1 vs Bench #2"),
			"Summary includes 'vs.' text, still using versions if present"
		);
	}
);

buildReportSuite(
	"Throws an error if inputs.reportId not provided without results",
	() => {
		assert.throws(
			() => invokeBuildReport({ isRunning: true, results: null }),
			/Could not determine ID for report/i
		);
	}
);

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

updateCommentSuite(
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
// 	"Updates existing comment that contains matching ID with keep old option and with old content",
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
updateCommentSuite.run();
