const { readFile, writeFile } = require("fs/promises");
const { suite } = require("uvu");
const assert = require("uvu/assert");
const fakeTimers = require("@sinonjs/fake-timers");
const { reportTachRunning, reportTachResults } = require("../lib/index");
const { fakeGitHubContext, defaultInputs } = require("./mocks/actions");
const { createGitHubClient, defaultActionInfo } = require("./mocks/github");
const { assertFixture, testRoot, formatHtml, skipSuite } = require("./utils");
const { createCommentContext } = require("../lib/comments");

const DEBUG = {
	debug: false,
	info: false,
	testTrace: false,
};

/** @type {import('@sinonjs/fake-timers').InstalledClock} */
let clock;
function setupClock(suite) {
	suite.before.each(() => {
		clock = fakeTimers.install();
	});

	suite.after.each(() => {
		clock.uninstall();
		clock = null;
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
 * @returns {import('../src/global').Logger}
 */
function createTestLogger() {
	return {
		debug(getMsg) {
			debug("debug", getMsg());
		},
		info(msg) {
			debug("info", msg);
		},
		warn(msg) {
			throw new Error("Unexpected warning in test: " + msg);
		},
		startGroup(name) {
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

async function readFixture(fixtureName) {
	const path = testRoot("fixtures/" + fixtureName);
	return formatHtml(addFooter(await readFile(path, "utf8")));
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
// const runningCreateSuite = skipSuite();
setupClock(runningCreateSuite);

runningCreateSuite(
	"Does nothing if report id and initialize are null",
	async () => {
		const github = createGitHubClient();
		const completion = invokeReportTachRunning({
			github,
			inputs: { reportId: null, initialize: null },
		});

		await clock.runAllAsync();
		await completion;

		const comments = (await github.issues.listComments()).data;
		assert.is(comments.length, 0, "Should not create any comments");
	}
);

runningCreateSuite(
	"Creates generic in progress comment if report id is null and initialize is true",
	async () => {
		const github = createGitHubClient();
		const completion = invokeReportTachRunning({
			github,
			inputs: { reportId: null, initialize: true },
		});

		await clock.runAllAsync();
		await completion;

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
		const completion = invokeReportTachRunning({
			github,
			inputs: { reportId: null, initialize: false },
		});

		await clock.runAllAsync();
		await completion;

		const comments = (await github.issues.listComments()).data;
		assert.is(comments.length, 0, "Should not create any comments");
	}
);

runningCreateSuite(
	"Creates new comment with running status if report id is non-null and initialize is null",
	async () => {
		const github = createGitHubClient();
		const completion = invokeReportTachRunning({
			github,
			inputs: { reportId: "test-results", initialize: null },
		});

		await clock.runAllAsync();
		await completion;

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
		const completion = invokeReportTachRunning({
			github,
			inputs: { reportId: "test-results", initialize: true },
		});

		await clock.runAllAsync();
		await completion;

		const comments = (await github.issues.listComments()).data;
		assert.is(comments.length, 1, "Should create a comment");

		const actualBody = formatHtml(comments[0].body);
		const fixture = await readFixture("new-comment-running.html");
		assertFixture(actualBody, fixture, "Comment body matches fixture");
	}
);

const runningUpdateSuite = suite("reportTachRunning (update comment)");
// const runningUpdateSuite = skipSuite();
setupClock(runningUpdateSuite);

/**
 * @param {Partial<import('../src/global').Inputs>} inputs
 */
async function runRunningUpdateDoNothingScenario(inputs) {
	const commentPath = testRoot("fixtures/test-results-new-comment.html");
	const body = addFooter(await readFile(commentPath, "utf8"));

	const github = createGitHubClient();
	await github.issues.createComment({ body });

	const completion = invokeReportTachRunning({ github, inputs });

	await clock.runAllAsync();
	await completion;

	const comments = (await github.issues.listComments()).data;
	assert.is(comments.length, 1, "Should not create any new comments");
	assert.is(comments[0].body, body, "Body of comment should not change");
}

runningUpdateSuite(
	"Does nothing if report id and initialize are null",
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
		// TODO: Hmm in this case we still acquire a lock on the comment even though
		// there is nothing to update. Could we detect this and skip acquiring
		// comment lock?
		await runRunningUpdateDoNothingScenario({
			reportId: null,
			initialize: true,
		});
	}
);

runningUpdateSuite(
	"Does nothing if report id is null and initialize is false",
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
		const commentPath = testRoot("fixtures/test-results-existing-comment.html");
		const body = addFooter(await readFile(commentPath, "utf8"));

		const github = createGitHubClient();
		await github.issues.createComment({ body });

		const completion = invokeReportTachRunning({
			github,
			inputs: { reportId: "report-id", initialize: null },
		});

		await clock.runAllAsync();
		await completion;

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
		const commentPath = testRoot("fixtures/test-results-existing-comment.html");
		const body = addFooter(await readFile(commentPath, "utf8"));

		const github = createGitHubClient();
		await github.issues.createComment({ body });

		const completion = invokeReportTachRunning({
			github,
			inputs: { reportId: "report-id", initialize: true },
		});

		await clock.runAllAsync();
		await completion;

		const comments = (await github.issues.listComments()).data;
		assert.is(comments.length, 1, "Should not create a new comment");

		const actualBody = formatHtml(comments[0].body);
		const fixture = await readFixture("test-results-existing-running.html");
		assertFixture(actualBody, fixture, "Comment body matches fixture");
	}
);

const newResultsSuite = suite("reportTachResults (new comment)");
// const newResultsSuite = skipSuite();
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
		const completion = invokeReportTachResults({
			github,
			inputs: { path: null, initialize: true },
		});

		await clock.runAllAsync();
		await completion;

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
		const completion = invokeReportTachResults({
			github,
			inputs: { initialize: null },
		});

		await clock.runAllAsync();
		await completion;

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
		const completion = invokeReportTachResults({
			github,
			inputs: { initialize: true },
		});

		await clock.runAllAsync();
		await completion;

		const comments = (await github.issues.listComments()).data;

		assert.is(comments.length, 1, "Should create a new comment");

		const actualBody = formatHtml(comments[0].body);
		const fixture = await readFixture("test-results-new-comment.html");
		assertFixture(actualBody, fixture, "Comment body matches fixture");
	}
);

let originalSetTimeout;
const updatedResultsSuite = suite("reportTachResults (update comment)");
updatedResultsSuite.before(() => {
	// Sinon fake timers don't work with this suite of tests for some reason, so
	// manually mocking setTimeout here.

	const p = Promise.resolve();

	originalSetTimeout = global.setTimeout;
	// @ts-ignore
	global.setTimeout = function (fn) {
		p.then(() => fn());
	};
});

updatedResultsSuite.after(() => {
	global.setTimeout = originalSetTimeout;
});

/**
 * @param {Partial<import('../src/global').Inputs>} inputs
 */
async function runUpdatedResultsUpdateScenario(inputs) {
	const commentPath = testRoot("fixtures/test-results-new-comment.html");
	const body = addFooter(await readFile(commentPath, "utf8"));

	const github = createGitHubClient();
	await github.issues.createComment({ body });

	inputs = {
		path: testRoot("results/test-results-2.json"),
		...inputs,
	};

	await invokeReportTachResults({ github, inputs });

	const comments = (await github.issues.listComments()).data;
	assert.is(comments.length, 1, "Should not create any new comments");

	const actualBody = formatHtml(comments[0].body);
	const fixtureName = "test-results-2-updated-comment.html";
	const fixture = await readFixture(fixtureName);

	// Uncomment to update fixture
	// await writeFile(testRoot(`fixtures/${fixtureName}`), actualBody, "utf8");

	assert.is(actualBody, fixture, "Body of comment should not change");
}

updatedResultsSuite(
	"Updates a comment when path is non null and initialize is null",
	async () => {
		await runUpdatedResultsUpdateScenario({ initialize: null });
	}
);

updatedResultsSuite(
	"Updates a comment when path is non null and initialize is true",
	async () => {
		await runUpdatedResultsUpdateScenario({ initialize: true });
	}
);

updatedResultsSuite(
	"Updates a comment when path is non null and initialize is false",
	async () => {
		await runUpdatedResultsUpdateScenario({ initialize: false });
	}
);

runningCreateSuite.run();
runningUpdateSuite.run();
newResultsSuite.run();
updatedResultsSuite.run();
