const { readFile } = require("fs").promises;
const { suite } = require("uvu");
const assert = require("uvu/assert");
const { parse, HTMLElement } = require("node-html-parser");
const {
	testRoot,
	formatHtml,
	copyTestResults,
	assertFixture,
	shouldAssertFixtures,
	testResultsHashId,
} = require("./utils");
const { invokeBuildReport } = require("./invokeBuildReport");

const buildReportSuite = suite("buildReport");

/**
 * @param {import("../src/global").Report} report
 */
function getSummaryText(report) {
	return report.summaries.map((m) => m.summary.toString()).join("\n");
}

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
	const html = formatHtml(getSummaryText(report));

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
	const report = invokeBuildReport();
	assert.is(report.id, testResultsHashId, "report.id matches expectation");
});

buildReportSuite("Summarizes one benchmark correctly", () => {
	const singleResult = copyTestResults().benchmarks[0];
	const results = { benchmarks: [singleResult] };

	const report = invokeBuildReport({ results });

	const summaryText = getSummaryText(report);
	assert.ok(
		summaryText.includes("32.09ms - 38.19ms"),
		"Generates interval for single result"
	);
});

buildReportSuite("Default summary if base version is null", () => {
	const report = invokeBuildReport({ inputs: { baseBenchName: null } });
	assert.not.ok(report.baseBenchName, "report.baseBenchName is null");
	assert.not.equal(report.summaries.length, 0, "report.summary is not empty");

	const summaryText = getSummaryText(report);
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
	assert.not.equal(report.summaries.length, 0, "report.summary is not empty");

	const summaryText = getSummaryText(report);
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
	assert.not.equal(report.summaries.length, 0, "report.summary is not empty");

	const summaryText = getSummaryText(report);
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
		const summaryText = getSummaryText(report);
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
		const summaryText = getSummaryText(report);
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
		const summaryText = getSummaryText(report);
		assert.ok(
			summaryText.includes("matched the same benchmark"),
			"Error message for same pr-bench-name and base-bench-name"
		);
	}
);

buildReportSuite("Supports benchmarks with different names", () => {
	const results = copyTestResults();
	const otherBenchName = "other-bench";

	results.benchmarks[2].name = otherBenchName;
	const report = invokeBuildReport({ results, inputs: {} });
	const bodyDoc =
		report.body instanceof HTMLElement ? report.body : parse(report.body);

	assert.equal(
		report.summaries.length,
		1,
		`Expected only one summary. Got ${report.summaries.length} instead.`
	);

	const summaryDoc =
		report.summaries[0].summary instanceof HTMLElement
			? report.summaries[0].summary
			: parse(report.summaries[0].summary);

	// console.log(formatHtml(report.body.toString()));

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
	// console.log(formatHtml(summaryDoc.toString()));
	const summaryText = summaryDoc.toString();
	assert.ok(
		summaryText.includes(report.title),
		"Summary includes report title"
	);
	assert.ok(
		summaryText.includes("local-framework vs base-framework"),
		"Summary includes 'vs.' text, still using versions if present"
	);

	if (shouldAssertFixtures) {
		assert.ok(
			summaryText.includes("-10% - +12%"),
			"Summary includes expected diff"
		);
	}
});

buildReportSuite("Lists all browsers used in details", () => {
	const results = copyTestResults();

	results.benchmarks[0].browser = {
		name: "firefox",
		headless: false,
		windowSize: { width: 1024, height: 768 },
	};

	const report = invokeBuildReport({ results });
	const bodyDoc =
		report.body instanceof HTMLElement ? report.body : parse(report.body);

	assert.equal(
		report.summaries.length,
		1,
		`Expected only one summary. Got ${report.summaries.length} instead.`
	);

	const summaryDoc =
		report.summaries[0].summary instanceof HTMLElement
			? report.summaries[0].summary
			: parse(report.summaries[0].summary);

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
		summaryText.includes("local-framework vs base-framework"),
		"Summary includes 'vs.' text, still using versions if present"
	);

	if (shouldAssertFixtures) {
		assert.ok(
			summaryText.includes("-10% - +12%"),
			"Summary includes expected diff"
		);
	}
});

buildReportSuite(
	"Supports benchmarks with different names and no version fields",
	() => {
		const results = copyTestResults();
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

		assert.equal(
			report.summaries.length,
			1,
			`Expected only one summary. Got ${report.summaries.length} instead.`
		);

		const summaryDoc =
			report.summaries[0].summary instanceof HTMLElement
				? report.summaries[0].summary
				: parse(report.summaries[0].summary);

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
			"Summary includes 'vs.' text, falling back to benchmark names since versions are missing"
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

buildReportSuite.run();
