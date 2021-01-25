const { writeFile } = require("fs/promises");
const { suite } = require("uvu");
const assert = require("uvu/assert");
const { parse } = require("node-html-parser");
/** @type {import('clean-set').default} */
// @ts-ignore
const cleanSet = require("clean-set");
const { reportTachRunning, reportTachResults } = require("../lib/index");
const {
	fakePullRequestContext,
	defaultInputs,
	fakePRContext,
	fakeRequestedWorkflowRunContext,
	fakeCompletedWorkflowRunContext,
	fakePushContext,
} = require("./mocks/actions");
const {
	createGitHubClient,
	defaultActionInfo,
	fakeWorkflowRun,
} = require("./mocks/github");
const {
	assertFixture,
	testRoot,
	testReportId,
	formatHtml,
	readFixture: readRawFixture,
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
 * @property {import('../src/global').PRContext} prContext
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
		prContext = fakePRContext,
		actionInfo = defaultActionInfo,
		customId = null,
		initialize = null,
	} = {}
) {
	const { footer } = createCommentContext(
		prContext,
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
	context = fakePullRequestContext,
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
 * @param {ReportTachResultsParams} params
 * @returns {Promise<import('../src/global').SerializedReport | null>}
 */
function invokeReportTachResults({
	github = createGitHubClient(),
	context = fakePullRequestContext,
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
	"Does not create a new comment and instead prints a message if context.eventName isn't supported",
	async () => {
		let infoCalled = false;

		/** @type {ReturnType<typeof createTestLogger>} */
		const logger = {
			...createTestLogger(),
			info(msg) {
				infoCalled = true;
			},
		};

		const github = createGitHubClient();
		await invokeReportTachRunning({ github, logger, context: fakePushContext });

		const comments = (await github.issues.listComments()).data;

		assert.is(comments.length, 0, "Should not create a new comment");
		assert.ok(infoCalled, "logger.info should be called");
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

newResultsSuite(
	"Does not create a new comment and instead prints a message if context.eventName isn't supported",
	async () => {
		let infoCalled = false;

		/** @type {ReturnType<typeof createTestLogger>} */
		const logger = {
			...createTestLogger(),
			info(msg) {
				infoCalled = true;
			},
		};

		const github = createGitHubClient();
		await invokeReportTachResults({ github, logger, context: fakePushContext });

		const comments = (await github.issues.listComments()).data;

		assert.is(comments.length, 0, "Should not create a new comment");
		assert.ok(infoCalled, "logger.info should be called");
	}
);

const updatedResultsSuite = suite("reportTachResults (update comment)");
setupClock(updatedResultsSuite);

/**
 * @param {ReportTachResultsParams} params
 */
async function runUpdatedResultsUpdateScenario(
	params,
	initialFixture = null,
	expectedFixture = null
) {
	if (initialFixture == null) {
		initialFixture = await readFixture("test-results-new-comment.html", false);
	}

	if (expectedFixture == null) {
		expectedFixture = await readFixture("test-results-2-updated-comment.html");
	}

	const body = addFooter(initialFixture);

	const github = createGitHubClient();
	await github.issues.createComment({ body });

	await invokeReportTachResults({ github, ...params });

	const comments = (await github.issues.listComments()).data;
	assert.is(comments.length, 1, "Should not create any new comments");

	const actualBody = formatHtml(comments[0].body);

	// Uncomment to update fixture
	// await writeFile(testRoot(`fixtures/${expectedFixture}`), actualBody, "utf8");

	assertFixture(
		actualBody,
		expectedFixture,
		"Body of comment should match fixture"
	);
}

updatedResultsSuite(
	"Updates a comment when path is non null and initialize is null",
	async () => {
		await runUpdatedResultsUpdateScenario({
			inputs: {
				path: testRoot("results/test-results-2.json"),
				initialize: null,
			},
		});
	}
);

updatedResultsSuite(
	"Updates a comment when path is non null and initialize is true",
	async () => {
		await runUpdatedResultsUpdateScenario({
			inputs: {
				path: testRoot("results/test-results-2.json"),
				initialize: true,
			},
		});
	}
);

updatedResultsSuite(
	"Updates a comment when path is non null and initialize is false",
	async () => {
		await runUpdatedResultsUpdateScenario({
			inputs: {
				path: testRoot("results/test-results-2.json"),
				initialize: false,
			},
		});
	}
);

updatedResultsSuite(
	"Updates a comment when path is glob and a report-id is provided",
	async () => {
		await runUpdatedResultsUpdateScenario(
			{
				inputs: {
					path: testRoot("results/glob-results2-*"),
					reportId: multiMeasureReportId,
				},
			},
			await readFixture("glob-results.html", false),
			await readFixture("glob-results2.html")
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
				inputs: {
					path: "results/does-not-exist-*.json",
				},
				logger,
			},
			await readFixture("test-results-new-comment.html", false),
			await readFixture("test-results-new-comment.html")
		);

		assert.ok(warnCalled, "Warning should be printed to console");
	}
);

const runningWorkflowRun = suite("reportTachRunning (workflow_run)");
setupClock(runningWorkflowRun);

/**
 * @param {ReturnType<typeof import('uvu').suite>} suite
 * @param {typeof invokeReportTachResults} invoker
 * @param {ReportTachRunningParams & { context: import('../src/global').WorkflowRunGitHubActionContext; }} baseParams
 */
function runPullRequestAPISuite(suite, invoker, baseParams) {
	suite("Uses payload PRs if only 1 is matches", async () => {
		// 1. Set payload.workflow_run.pull_requests to a list with 1 PR
		// 2. Set GitHub client to return an empty list
		// 3. Should still work

		/** @type {import('../src/global').WorkflowRunGitHubActionContext} */
		const context = cleanSet(
			baseParams.context,
			"payload.workflow_run.pull_requests",
			[fakeWorkflowRun.pull_requests[0]]
		);

		const github = createGitHubClient({ pullRequests: [] });
		await invoker({ ...baseParams, github, context });

		const comments = (await github.issues.listComments()).data;

		assert.is(comments.length, 1, "Should create a new comment");
	});

	suite("Filters payload PRs by head_sha", async () => {
		// 1. Set payload.workflow_run.pull_requests to a list with two PRs with
		//    different head.sha. One of them should match
		// 2. Set GitHub client to return an empty list
		// 3. Should still work

		const pr1 = fakeWorkflowRun.pull_requests[0];
		let pr2 = cleanSet(fakeWorkflowRun.pull_requests[0], "head.sha", "abcdef");
		pr2 = cleanSet(pr2, "number", 1);

		/** @type {import('../src/global').WorkflowRunGitHubActionContext} */
		const context = cleanSet(
			baseParams.context,
			"payload.workflow_run.pull_requests",
			[pr1, pr2]
		);

		const github = createGitHubClient({ pullRequests: [] });
		await invoker({ ...baseParams, github, context });

		const comments = (await github.issues.listComments()).data;

		assert.is(comments.length, 1, "Should create a new comment");
	});

	suite("Searches PR API if payload pull_requests are empty", async () => {
		// 1. Set payload.workflow_run.pull_requests to an empty list
		// 2. Set GitHub client to return a list with one PR
		// 3. Should still work

		/** @type {import('../src/global').WorkflowRunGitHubActionContext} */
		const context = cleanSet(
			baseParams.context,
			"payload.workflow_run.pull_requests",
			[]
		);

		const github = createGitHubClient({
			pullRequests: [fakeWorkflowRun.pull_requests[0]],
		});

		await invoker({ ...baseParams, github, context });

		const comments = (await github.issues.listComments()).data;

		assert.is(comments.length, 1, "Should create a new comment");
	});

	suite(
		"Throws an error no PRs are associated with a workflow run",
		async () => {
			// 1. Set payload.workflow_run.pull_requests to an empty list
			// 2. Set GitHub client to return an empty list
			// 3. Should throw an error

			/** @type {import('../src/global').WorkflowRunGitHubActionContext} */
			const context = cleanSet(
				baseParams.context,
				"payload.workflow_run.pull_requests",
				[]
			);

			const github = createGitHubClient({ pullRequests: [] });

			/** @type {Error} */
			let error;
			await invoker({ ...baseParams, github, context }).catch(
				(e) => (error = e)
			);

			assert.ok(error, "Should throw an error");
			assert.ok(
				error.message.includes(`does not match any PRs`),
				"Throws expected error"
			);
		}
	);

	suite(
		"Throws an error multiple PRs are associated with a workflow run",
		async () => {
			// 1. Set payload.workflow_run.pull_requests to a list with two PRs
			// 2. Set GitHub client to return a list with two PRs
			// 3. Should throw an error

			const pr1 = fakeWorkflowRun.pull_requests[0];
			let pr2 = cleanSet(
				fakeWorkflowRun.pull_requests[0],
				"head.sha",
				"abcdef"
			);
			pr2 = cleanSet(pr2, "number", 1);

			/** @type {import('../src/global').WorkflowRunGitHubActionContext} */
			const context = cleanSet(
				baseParams.context,
				"payload.workflow_run.pull_requests",
				[]
			);

			const github = createGitHubClient({ pullRequests: [pr1, pr2] });

			/** @type {Error} */
			let error;
			await invoker({ ...baseParams, github, context }).catch(
				(e) => (error = e)
			);

			assert.ok(error, "Should throw an error");
			assert.ok(
				error.message.includes(`matches more than one pull requests`),
				"Throws expected error"
			);
		}
	);

	suite("Throws an error if PR API fails", async () => {
		// 1. Set payload.workflow_run.pull_requests to an empty list
		// 2. Set GitHub client to an Error
		// 3. Should throw an error

		/** @type {import('../src/global').WorkflowRunGitHubActionContext} */
		const context = cleanSet(
			baseParams.context,
			"payload.workflow_run.pull_requests",
			[]
		);

		const github = createGitHubClient({
			pullRequests: new Error(`Fake error pull request API error`),
		});

		/** @type {Error} */
		let error;
		await invoker({ ...baseParams, github, context }).catch((e) => (error = e));

		assert.ok(error, "Should throw an error");
		assert.ok(
			error.message.includes(`pull request API error`),
			"Throws expected error"
		);
	});
}

runningWorkflowRun(
	"Does nothing if workflow_run event is not 'pull_request' ",
	async () => {
		/** @type {import('../src/global').WorkflowRunGitHubActionContext} */
		const context = cleanSet(
			fakeCompletedWorkflowRunContext,
			"payload.workflow_run.event",
			"push"
		);

		const github = createGitHubClient();
		await invokeReportTachRunning({ github, context });

		const comments = (await github.issues.listComments()).data;
		assert.is(comments.length, 0, "Should not create any comments");
	}
);

runningWorkflowRun(
	"Creates new comment if workflow_run action is 'requested' and initialize is true",
	async () => {
		const github = createGitHubClient();
		await invokeReportTachRunning({
			github,
			inputs: { initialize: true },
			context: fakeRequestedWorkflowRunContext,
		});

		const comments = (await github.issues.listComments()).data;
		assert.is(comments.length, 1, "Should create a comment");

		const actualBody = formatHtml(comments[0].body);
		const fixture = await readFixture("new-comment-initialized.html");
		assertFixture(actualBody, fixture, "Comment body matches fixture");
	}
);

runningWorkflowRun(
	"Updates existing comment if workflow_run action is 'requested' and initialize is true",
	async () => {
		const body = addFooter(await readFixture("glob-results.html", false));

		const github = createGitHubClient();
		await github.issues.createComment({ body });

		await invokeReportTachRunning({
			github,
			inputs: { initialize: true },
			context: fakeRequestedWorkflowRunContext,
		});

		const comments = (await github.issues.listComments()).data;
		assert.is(comments.length, 1, "Should not create a new comment");

		const actualBody = formatHtml(comments[0].body);
		const fixture = await readFixture("glob-results-running.html");
		assertFixture(actualBody, fixture, "Comment body matches fixture");
	}
);

runningWorkflowRun(
	"Does nothing if workflow_run action is 'requested' and initialize is null",
	async () => {
		const github = createGitHubClient();
		await invokeReportTachRunning({
			github,
			inputs: { initialize: null },
			context: fakeRequestedWorkflowRunContext,
		});

		const comments = (await github.issues.listComments()).data;
		assert.is(comments.length, 0, "Should not create any comments");
	}
);

runningWorkflowRun(
	"Does nothing if workflow_run action is 'completed' and initialize is true",
	async () => {
		const github = createGitHubClient();
		await invokeReportTachRunning({
			github,
			inputs: { initialize: true },
			context: fakeCompletedWorkflowRunContext,
		});

		const comments = (await github.issues.listComments()).data;
		assert.is(comments.length, 0, "Should not create any comments");
	}
);

runPullRequestAPISuite(runningWorkflowRun, invokeReportTachRunning, {
	inputs: { initialize: true },
	context: fakeRequestedWorkflowRunContext,
});

const updatedWorkflowRun = suite("reportTachResults (workflow_run)");
setupClock(updatedWorkflowRun);

updatedWorkflowRun(
	"Does nothing if workflow_run event is not 'pull_request' ",
	async () => {
		/** @type {import('../src/global').WorkflowRunGitHubActionContext} */
		const context = cleanSet(
			fakeCompletedWorkflowRunContext,
			"payload.workflow_run.event",
			"push"
		);

		const github = createGitHubClient();
		await invokeReportTachResults({ github, context });

		const comments = (await github.issues.listComments()).data;
		assert.is(comments.length, 0, "Should not create any comments");
	}
);

updatedWorkflowRun(
	"Does nothing if workflow_run action is 'requested' and initialize is true",
	async () => {
		const github = createGitHubClient();
		await invokeReportTachResults({
			github,
			inputs: { initialize: true },
			context: fakeRequestedWorkflowRunContext,
		});

		const comments = (await github.issues.listComments()).data;
		assert.is(comments.length, 0, "Should not create any comments");
	}
);

updatedWorkflowRun(
	"Does nothing if workflow_run action is 'requested' and initialize is null",
	async () => {
		const github = createGitHubClient();
		await invokeReportTachResults({
			github,
			inputs: { initialize: null },
			context: fakeRequestedWorkflowRunContext,
		});

		const comments = (await github.issues.listComments()).data;
		assert.is(comments.length, 0, "Should not create any comments");
	}
);

updatedWorkflowRun(
	"Creates comment if none exists and workflow_run action is 'completed'",
	async () => {
		const github = createGitHubClient();
		await invokeReportTachResults({
			github,
			inputs: {
				initialize: null,
				path: testRoot("results/glob-results-*.json"),
			},
			context: fakeCompletedWorkflowRunContext,
		});

		const comments = (await github.issues.listComments()).data;

		assert.is(comments.length, 1, "Should create a new comment");

		const actualBody = formatHtml(comments[0].body);
		let fixture = await readFixture("glob-results.html");
		// Workflow runs don't have access to the merge commit and so display the
		// PRs head SHA
		fixture = fixture.replace(/Commit: 626e78c/g, "Commit: a70706d");

		assertFixture(actualBody, fixture, "Comment body matches fixture");
	}
);

updatedWorkflowRun(
	"Updates comment with results if one exists and workflow_run action is 'completed'",
	async () => {
		let expectedFixture = await readFixture("glob-results2.html");
		// Workflow runs don't have access to the merge commit and so display the
		// PRs head SHA
		expectedFixture = expectedFixture.replace(
			/Commit: 626e78c/g,
			"Commit: a70706d"
		);

		await runUpdatedResultsUpdateScenario(
			{
				inputs: {
					path: testRoot("results/glob-results2-*.json"),
				},
				context: fakeCompletedWorkflowRunContext,
			},
			await readFixture("glob-results.html", false),
			expectedFixture
		);
	}
);

runPullRequestAPISuite(updatedWorkflowRun, invokeReportTachResults, {
	context: fakeCompletedWorkflowRunContext,
});

runningCreateSuite.run();
runningUpdateSuite.run();
newResultsSuite.run();
updatedResultsSuite.run();
runningWorkflowRun.run();
updatedWorkflowRun.run();
