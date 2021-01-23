const { writeFile } = require("fs/promises");
const { suite } = require("uvu");
const assert = require("uvu/assert");
const { parse } = require("node-html-parser");
const { reportTachRunning, reportTachResults } = require("../lib/index");
const { fakeGitHubContext, defaultInputs } = require("./mocks/actions");
const { createGitHubClient, defaultActionInfo } = require("./mocks/github");
const {
	assertFixture,
	testRoot,
	testReportId,
	formatHtml,
	readFixture: readRawFixture,
	getSummaryId,
	getBenchmarkSectionId,
	multiMeasureReportId,
} = require("./utils");
const { createCommentContext } = require("../lib/comments");

const DEBUG = {
	debug: false,
	info: false,
	testTrace: false,
};

function setupClock(suite) {
	suite.before.each((context) => {
		// Sinon fake timers don't work with this suite of tests for some reason, so
		// manually mocking setTimeout here. Likely because it results in a race
		// condition between sinon fake timers and actual promise resolution. NodeJS
		// won't continue the promise chains (await calls) until needed (some parent
		// promise is awaited) but after that happens the inner function then calls
		// setTimeout, which is faked by sinon and needs runAllAsync to be called.
		// However the code that needs to call runAllAsync is currently awaiting the
		// promise so that the setTImeout code be reached. Sigh... a deadlock.

		context.originalSetTimeout = global.setTimeout;

		const p = Promise.resolve();
		// @ts-ignore
		global.setTimeout = function (fn) {
			p.then(() => fn());
		};
	});

	suite.after.each((context) => {
		global.setTimeout = context.originalSetTimeout;
	});
}

/**
 * @param {keyof DEBUG | null} namespace
 * @param {string} msg
 */
function debug(namespace, msg) {
	if (DEBUG[namespace]) {
		console.log(msg);
	}
}

/**
 * @returns {import('../src/global').Logger & { logs: { debug: string[]; info: string[]; }}}
 */
function createTestLogger() {
	return {
		logs: {
			debug: [],
			info: [],
		},
		debug(getMsg) {
			let msg = getMsg();
			this.logs.debug.push(msg);
			debug("debug", msg);
		},
		info(msg) {
			this.logs.info.push(msg);
			debug("info", msg);
		},
		warn(msg) {
			throw new Error("Unexpected warning in test: " + msg);
		},
		startGroup(name) {
			this.logs.info.push(name);
			debug("info", name);
		},
		endGroup() {},
	};
}

/**
 * @typedef CommentContextParams
 * @property {Pick<import('../src/global').GitHubActionContext, "repo" | "issue">} context
 * @property {import('../src/global').ActionInfo} actionInfo
 * @property {string} customId
 * @property {boolean} initialize
 *
 * @param {string} body
 * @param {Partial<CommentContextParams>} params
 */
function addFooter(
	body,
	{
		context = fakeGitHubContext,
		actionInfo = defaultActionInfo,
		customId = null,
		initialize = null,
	} = {}
) {
	const { footer } = createCommentContext(
		context,
		actionInfo,
		customId,
		initialize
	);
	return body + "\n" + footer;
}

/**
 * @param {string} fixtureName
 * @param {boolean} [addDefaultFooter]
 */
async function readFixture(fixtureName, addDefaultFooter = true) {
	let fixture = await readRawFixture(fixtureName);

	if (addDefaultFooter) {
		fixture = formatHtml(addFooter(fixture));
	}

	return fixture;
}

/**
 * @typedef ReportTachRunningParams
 * @property {ReturnType<createGitHubClient>} [github]
 * @property {import('../src/global').GitHubActionContext} [context]
 * @property {Partial<import('../src/global').Inputs>} [inputs]
 * @property {import('../src/global').Logger} [logger]
 * @param {ReportTachRunningParams} params
 * @returns {Promise<import('../src/global').SerializedReport | null>}
 */
function invokeReportTachRunning({
	github = createGitHubClient(),
	context = fakeGitHubContext,
	inputs = null,
	logger = createTestLogger(),
} = {}) {
	const fullInputs = {
		...defaultInputs,
		...inputs,
	};

	// @ts-ignore
	return reportTachRunning(github, context, fullInputs, logger);
}

/**
 * @typedef ReportTachResultsParams
 * @property {ReturnType<createGitHubClient>} [github]
 * @property {import('../src/global').GitHubActionContext} [context]
 * @property {Partial<import('../src/global').Inputs>} [inputs]
 * @property {import('../src/global').Logger} [logger]
 * @param {ReportTachRunningParams} params
 * @returns {Promise<import('../src/global').SerializedReport | null>}
 */
function invokeReportTachResults({
	github = createGitHubClient(),
	context = fakeGitHubContext,
	inputs = null,
	logger = createTestLogger(),
} = {}) {
	const fullInputs = {
		...defaultInputs,
		...inputs,
	};

	// @ts-ignore
	return reportTachResults(github, context, fullInputs, logger);
}

const runningCreateSuite = suite("reportTachRunning (new comment)");
setupClock(runningCreateSuite);

runningCreateSuite(
	"Does nothing if report id and initialize are null",
	async () => {
		const github = createGitHubClient();
		await invokeReportTachRunning({
			github,
			inputs: { reportId: null, initialize: null },
		});

		const comments = (await github.issues.listComments()).data;
		assert.is(comments.length, 0, "Should not create any comments");
	}
);

runningCreateSuite(
	"Creates generic in progress comment if report id is null and initialize is true",
	async () => {
		const github = createGitHubClient();
		await invokeReportTachRunning({
			github,
			inputs: { reportId: null, initialize: true },
		});

		const comments = (await github.issues.listComments()).data;
		assert.is(comments.length, 1, "Should create a comment");

		const actualBody = formatHtml(comments[0].body);
		const fixture = await readFixture("new-comment-initialized.html");
		assertFixture(actualBody, fixture, "Comment body matches fixture");
	}
);

runningCreateSuite(
	"Does nothing if report id is null and initialize is false",
	async () => {
		const github = createGitHubClient();
		await invokeReportTachRunning({
			github,
			inputs: { reportId: null, initialize: false },
		});

		const comments = (await github.issues.listComments()).data;
		assert.is(comments.length, 0, "Should not create any comments");
	}
);

runningCreateSuite(
	"Creates new comment with running status if report id is non-null and initialize is null",
	async () => {
		const github = createGitHubClient();
		await invokeReportTachRunning({
			github,
			inputs: { reportId: testReportId, initialize: null },
		});

		const comments = (await github.issues.listComments()).data;
		assert.is(comments.length, 1, "Should create a comment");

		const actualBody = formatHtml(comments[0].body);
		const fixture = await readFixture("new-comment-running.html");
		assertFixture(actualBody, fixture, "Comment body matches fixture");
	}
);

runningCreateSuite(
	"Creates new comment with running status if report id is non-null and initialize is true",
	async () => {
		const github = createGitHubClient();
		await invokeReportTachRunning({
			github,
			inputs: { reportId: testReportId, initialize: true },
		});

		const comments = (await github.issues.listComments()).data;
		assert.is(comments.length, 1, "Should create a comment");

		const actualBody = formatHtml(comments[0].body);
		const fixture = await readFixture("new-comment-running.html");
		assertFixture(actualBody, fixture, "Comment body matches fixture");
	}
);

runningCreateSuite(
	"Create new comment with running status if no matching job is found",
	async () => {
		const github = createGitHubClient({
			workflowData: null,
			runData: null,
			runJobs: [],
		});

		await invokeReportTachRunning({
			github,
			inputs: { reportId: testReportId, initialize: true },
		});

		const comments = (await github.issues.listComments()).data;
		assert.is(comments.length, 1, "Should create a comment");

		const bodyHtml = parse(comments[0].body);

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

const runningUpdateSuite = suite("reportTachRunning (update comment)");
setupClock(runningUpdateSuite);

/**
 * @param {Partial<import('../src/global').Inputs>} inputs
 */
async function runRunningUpdateDoNothingScenario(inputs) {
	const body = addFooter(
		await readFixture("test-results-new-comment.html", false)
	);

	const github = createGitHubClient();
	await github.issues.createComment({ body });

	await invokeReportTachRunning({ github, inputs });

	const comments = (await github.issues.listComments()).data;
	assert.is(comments.length, 1, "Should not create any new comments");

	const actualBody = formatHtml(comments[0].body);
	const expectedBody = formatHtml(body);
	assertFixture(actualBody, expectedBody, "Body of comment should not change");
}

runningUpdateSuite(
	"Does nothing if comment exists and report id and initialize are null",
	async () => {
		await runRunningUpdateDoNothingScenario({
			reportId: null,
			initialize: null,
		});
	}
);

runningUpdateSuite(
	"Does nothing if comment exists and report id is null and initialize is true",
	async () => {
		const body = addFooter(
			await readFixture("test-results-existing-comment.html", false)
		);

		const github = createGitHubClient();
		await github.issues.createComment({ body });

		await invokeReportTachRunning({
			github,
			inputs: { reportId: null, initialize: true },
		});

		const comments = (await github.issues.listComments()).data;
		assert.is(comments.length, 1, "Should not create a new comment");

		const actualBody = formatHtml(comments[0].body);
		const fixture = await readFixture("test-results-existing-running.html");
		const fixtureHtml = parse(fixture);
		fixtureHtml.querySelectorAll(".status").forEach((el) => el.set_content(""));
		const expectedBody = formatHtml(fixtureHtml.toString());

		assertFixture(actualBody, expectedBody, "Comment body matches fixture");
	}
);

runningUpdateSuite(
	"Does nothing if comment exists and report id is null and initialize is false",
	async () => {
		// TODO: Hmm in this case we still acquire a lock on the comment even though
		// there is nothing to update. Could we detect this and skip acquiring
		// comment lock?
		await runRunningUpdateDoNothingScenario({
			reportId: null,
			initialize: false,
		});
	}
);

runningUpdateSuite(
	"Updates comment with running status if report id is non-null and initialize is null",
	async () => {
		const body = addFooter(
			await readFixture("test-results-existing-comment.html", false)
		);

		const github = createGitHubClient();
		await github.issues.createComment({ body });

		await invokeReportTachRunning({
			github,
			inputs: { reportId: "report-id", initialize: null },
		});

		const comments = (await github.issues.listComments()).data;
		assert.is(comments.length, 1, "Should not create a new comment");

		const actualBody = formatHtml(comments[0].body);
		const fixture = await readFixture("test-results-existing-running.html");
		assertFixture(actualBody, fixture, "Comment body matches fixture");
	}
);

runningUpdateSuite(
	"Updates comment with running status if report id is non-null and initialize is true",
	async () => {
		const body = addFooter(
			await readFixture("test-results-existing-comment.html", false)
		);

		const github = createGitHubClient();
		await github.issues.createComment({ body });

		await invokeReportTachRunning({
			github,
			inputs: { reportId: "report-id", initialize: true },
		});

		const comments = (await github.issues.listComments()).data;
		assert.is(comments.length, 1, "Should not create a new comment");

		const actualBody = formatHtml(comments[0].body);
		const fixture = await readFixture("test-results-existing-running.html");
		assertFixture(actualBody, fixture, "Comment body matches fixture");
	}
);

runningUpdateSuite(
	"Updates comment with status even if no matching job is found",
	async () => {
		const body = addFooter(
			await readFixture("test-results-existing-comment.html", false)
		);

		const github = createGitHubClient({
			workflowData: null,
			runData: null,
			runJobs: [],
		});

		await github.issues.createComment({ body });

		await invokeReportTachRunning({
			github,
			inputs: { reportId: "report-id", initialize: true },
		});

		const comments = (await github.issues.listComments()).data;
		assert.is(comments.length, 1, "Should create a comment");

		const bodyHtml = parse(comments[0].body);

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

const newResultsSuite = suite("reportTachResults (new comment)");
setupClock(newResultsSuite);

newResultsSuite("Errors if path and initialize are null", async () => {
	/** @type {Error} */
	let error;
	await invokeReportTachResults({
		inputs: { path: null, initialize: null },
	}).catch((e) => (error = e));

	assert.ok(error, "Should throw an error");
	assert.ok(
		error.message.includes(
			`path option must be provided or initialize must be set to "true"`
		),
		"Throws expected error"
	);
});

newResultsSuite("Errors if path is null and initialize is false", async () => {
	/** @type {Error} */
	let error;
	await invokeReportTachResults({
		inputs: { path: null, initialize: null },
	}).catch((e) => (error = e));

	assert.ok(error, "Should throw an error");
	assert.ok(
		error.message.includes(
			`path option must be provided or initialize must be set to "true"`
		),
		"Throws expected error"
	);
});

newResultsSuite(
	"Does nothing if path is null and initialize is true",
	async () => {
		const github = createGitHubClient();
		await invokeReportTachResults({
			github,
			inputs: { path: null, initialize: true },
		});

		const comments = (await github.issues.listComments()).data;

		// Presumably the pre-action should have already created the comment so this
		// main function should not
		assert.is(comments.length, 0, "Should not create any new comments");
	}
);

newResultsSuite(
	"Creates a new comment if path is not null and initialize is null",
	async () => {
		const github = createGitHubClient();
		await invokeReportTachResults({
			github,
			inputs: { initialize: null },
		});

		const comments = (await github.issues.listComments()).data;

		assert.is(comments.length, 1, "Should create a new comment");

		const actualBody = formatHtml(comments[0].body);
		const fixture = await readFixture("test-results-new-comment.html");
		assertFixture(actualBody, fixture, "Comment body matches fixture");
	}
);

newResultsSuite(
	"Creates a new comment if path is not null and initialize is true",
	async () => {
		const github = createGitHubClient();
		await invokeReportTachResults({
			github,
			inputs: { initialize: true },
		});

		const comments = (await github.issues.listComments()).data;

		assert.is(comments.length, 1, "Should create a new comment");

		const actualBody = formatHtml(comments[0].body);
		const fixture = await readFixture("test-results-new-comment.html");
		assertFixture(actualBody, fixture, "Comment body matches fixture");
	}
);

newResultsSuite(
	"Creates a new comment with results even if workflow run API fails",
	async () => {
		const logger = createTestLogger();
		const error = new Error("Test error: workflowRun request fails");
		const github = createGitHubClient({ runData: error });

		await invokeReportTachResults({ github, logger });

		const comments = (await github.issues.listComments()).data;

		assert.is(comments.length, 1, "Should create a new comment");

		const actualBody = formatHtml(comments[0].body);
		const fixture = await readFixture("test-results-new-comment.html");
		assertFixture(actualBody, fixture, "Comment body matches fixture");

		const infoLogs = logger.logs.info.join("\n");
		assert.ok(infoLogs.includes(error.message), "Logs contain error message");
	}
);

newResultsSuite(
	"Creates a new comment with results even if workflow data API fails",
	async () => {
		const logger = createTestLogger();
		const error = new Error("Test error: workflow data request fails");
		const github = createGitHubClient({ workflowData: error });

		await invokeReportTachResults({ github, logger });

		const comments = (await github.issues.listComments()).data;

		assert.is(comments.length, 1, "Should create a new comment");

		const actualBody = formatHtml(comments[0].body);
		const fixture = await readFixture("test-results-new-comment.html");
		assertFixture(actualBody, fixture, "Comment body matches fixture");

		const infoLogs = logger.logs.info.join("\n");
		assert.ok(infoLogs.includes(error.message), "Logs contain error message");
	}
);

newResultsSuite(
	"Creates a new comment with results even if workflowRun jobs API fails",
	async () => {
		const logger = createTestLogger();
		const error = new Error("Test error: workflowRun jobs request fails");
		const github = createGitHubClient({ runJobs: error });

		await invokeReportTachResults({ github, logger });

		const comments = (await github.issues.listComments()).data;

		assert.is(comments.length, 1, "Should create a new comment");

		const actualBody = formatHtml(comments[0].body);
		let fixture = await readFixture("test-results-new-comment.html");
		// Replace the job URL with the workflow run URL since this test tests the
		// job API failing
		fixture = fixture.replace(
			"https://github.com/andrewiggins/tachometer-reporter-action/runs/862215228",
			"https://github.com/andrewiggins/tachometer-reporter-action/actions/runs/166203010"
		);
		assertFixture(actualBody, fixture, "Comment body matches fixture");

		const infoLogs = logger.logs.info.join("\n");
		assert.ok(infoLogs.includes(error.message), "Logs contain error message");
	}
);

newResultsSuite(
	"Errors if results contains invalid measure mode with no name",
	async () => {
		/** @type {Error} */
		let error;
		await invokeReportTachResults({
			inputs: { path: testRoot("results/bad-measure-mode.json") },
		}).catch((e) => (error = e));

		assert.ok(error, "Should throw an error");
		assert.ok(
			error.message.includes(`unknown measurement type`),
			"Throws expected error"
		);
	}
);

newResultsSuite(
	"Creates a new comment if path is a glob and a report-id is provided",
	async () => {
		const github = createGitHubClient();
		await invokeReportTachResults({
			github,
			inputs: {
				path: testRoot("results/glob-results-*.json"),
				reportId: multiMeasureReportId,
			},
		});

		const comments = (await github.issues.listComments()).data;

		assert.is(comments.length, 1, "Should create a new comment");

		const actualBody = formatHtml(comments[0].body);
		const fixture = await readFixture("glob-results.html");
		assertFixture(actualBody, fixture, "Comment body matches fixture");
	}
);

newResultsSuite(
	"Does not create a new comment and instead prints a warning if path doesn't match any files",
	async () => {
		let warnCalled = false;

		/** @type {ReturnType<typeof createTestLogger>} */
		const logger = {
			...createTestLogger(),
			warn(msg) {
				warnCalled = true;
			},
		};

		const github = createGitHubClient();
		await invokeReportTachResults({
			github,
			logger,
			inputs: {
				path: testRoot("results/does-not-exist-*.json"),
			},
		});

		const comments = (await github.issues.listComments()).data;

		assert.is(comments.length, 0, "Should not create a new comment");
		assert.ok(warnCalled, "logger.warn should be called");
	}
);

const updatedResultsSuite = suite("reportTachResults (update comment)");
setupClock(updatedResultsSuite);

/**
 * @param {Partial<import('../src/global').Inputs>} inputs
 */
async function runUpdatedResultsUpdateScenario(
	inputs,
	initialFixture = "test-results-new-comment.html",
	expectedFixture = "test-results-2-updated-comment.html",
	logger = undefined
) {
	const body = addFooter(await readFixture(initialFixture, false));

	const github = createGitHubClient();
	await github.issues.createComment({ body });

	await invokeReportTachResults({ github, inputs, logger });

	const comments = (await github.issues.listComments()).data;
	assert.is(comments.length, 1, "Should not create any new comments");

	const actualBody = formatHtml(comments[0].body);
	const fixture = await readFixture(expectedFixture);

	// Uncomment to update fixture
	// await writeFile(testRoot(`fixtures/${expectedFixture}`), actualBody, "utf8");

	assertFixture(actualBody, fixture, "Body of comment should match fixture");
}

updatedResultsSuite(
	"Updates a comment when path is non null and initialize is null",
	async () => {
		await runUpdatedResultsUpdateScenario({
			path: testRoot("results/test-results-2.json"),
			initialize: null,
		});
	}
);

updatedResultsSuite(
	"Updates a comment when path is non null and initialize is true",
	async () => {
		await runUpdatedResultsUpdateScenario({
			path: testRoot("results/test-results-2.json"),
			initialize: true,
		});
	}
);

updatedResultsSuite(
	"Updates a comment when path is non null and initialize is false",
	async () => {
		await runUpdatedResultsUpdateScenario({
			path: testRoot("results/test-results-2.json"),
			initialize: false,
		});
	}
);

updatedResultsSuite(
	"Updates a comment when path is glob and a report-id is provided",
	async () => {
		await runUpdatedResultsUpdateScenario(
			{
				path: testRoot("results/glob-results2-*"),
				reportId: multiMeasureReportId,
			},
			"glob-results.html",
			"glob-results2.html"
		);
	}
);

updatedResultsSuite(
	"Does not update a comment when path doesn't match any files",
	async () => {
		let warnCalled = false;

		/** @type {ReturnType<typeof createTestLogger>} */
		const logger = {
			...createTestLogger(),
			warn(msg) {
				warnCalled = true;
			},
		};

		await runUpdatedResultsUpdateScenario(
			{
				path: "results/does-not-exist-*.json",
			},
			"test-results-new-comment.html",
			"test-results-new-comment.html",
			logger
		);

		assert.ok(warnCalled, "Warning should be printed to console");
	}
);

runningCreateSuite.run();
runningUpdateSuite.run();
newResultsSuite.run();
updatedResultsSuite.run();
