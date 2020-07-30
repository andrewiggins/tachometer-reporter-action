const { suite } = require("uvu");
const assert = require("uvu/assert");
const fakeTimers = require("@sinonjs/fake-timers");
const {
	postOrUpdateComment,
	createCommentContext,
} = require("../lib/comments");
const { fakeGitHubContext } = require("./mocks/actions");
const { defaultActionInfo, createGitHubClient } = require("./mocks/github");
const { pick } = require("./utils");

/** @typedef {import('./mocks/github').Comment} Comment */

const DEBUG = {
	infoLogs: false,
	testTrace: false,
	states: false,
};

const htmlLockId = "tachometer-reporter-action-lock-id";

const testWriterId = "test-lock-writer-id";
const getLockHtml = (writerId = testWriterId) =>
	`<span id="tachometer-reporter-action-lock-id" data-locked-by="${writerId}"></span>`;

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
 * @typedef CommentContextParams
 * @property {Pick<import('../src/global').GitHubActionContext, "repo" | "issue">} context
 * @property {import('../src/global').ActionInfo} actionInfo
 * @property {string} customId
 * @property {boolean} initialize
 * @param {Partial<CommentContextParams>} params
 */
function createTestCommentContext({
	context = fakeGitHubContext,
	actionInfo = defaultActionInfo,
	customId = null,
	initialize = null,
} = {}) {
	return createCommentContext(context, actionInfo, customId, initialize);
}

let updateNum = 0;
/**
 * @param {Comment | null} comment
 * @returns {string}
 */
function getTestCommentBody(comment) {
	if (!comment) {
		return "Initial Body";
	} else {
		return `Updated Body #${++updateNum}`;
	}
}

/**
 * @typedef {Partial<import('xstate').Typestate<any>>} State
 * @typedef {{ getStates(): Array<import('xstate').Typestate<any>> }} TestLoggerHelpers
 * @typedef {import('../src/global').Logger & TestLoggerHelpers} TestLogger
 * @returns {TestLogger}
 */
function createTestLogger() {
	/** @type {Array<import('xstate').Typestate<any>>} */
	const states = [];
	const stateEventMatcher = /\[.*\] state event: (.*)/i;

	return {
		debug(getMsg) {
			const msg = getMsg();
			const match = msg.match(stateEventMatcher);
			if (match) {
				const state = JSON.parse(match[1]);
				debug("states", state);
				states.push(state);
			}
		},
		info(msg) {
			debug("infoLogs", msg);
		},
		warn(msg) {
			throw new Error("Unexpected warning in test: " + msg);
		},
		startGroup(name) {
			debug("infoLogs", name);
		},
		endGroup() {},
		getStates() {
			return states;
		},
	};
}

/**
 * @typedef AcquireCommentLockParams
 * @property {ReturnType<createGitHubClient>} github
 * @property {import('../src/global').CommentContext} context
 * @property {(c: Comment | null) => string} getCommentBody
 * @property {TestLogger} logger
 *
 * @param {Partial<AcquireCommentLockParams>} [params]
 * @returns {Promise<[ReturnType<TestLogger["getStates"]>, Comment]>}
 */
async function invokePostorUpdateComment({
	github = createGitHubClient(),
	context = createTestCommentContext(),
	getCommentBody = getTestCommentBody,
	logger = createTestLogger(),
} = {}) {
	/** @type {import('../src/global').GitHubActionClient} */
	// @ts-ignore
	const client = github;

	const comment = await postOrUpdateComment(
		client,
		context,
		getCommentBody,
		logger
	);
	const states = logger.getStates();

	return [states, comment];
}

/** @returns {any} */
function getFinalHoldingStates() {
	return [
		{
			value: { holding: "holding" },
			context: { wait_time: 0, total_wait_time: 0, total_held_time: 0 },
		},
		{
			value: { holding: "checking" },
			context: { wait_time: 0, total_wait_time: 0, total_held_time: 500 },
		},
		{
			value: { holding: "holding" },
			context: { wait_time: 0, total_wait_time: 0, total_held_time: 500 },
		},
		{
			value: { holding: "checking" },
			context: { wait_time: 0, total_wait_time: 0, total_held_time: 1000 },
		},
		{
			value: { holding: "holding" },
			context: { wait_time: 0, total_wait_time: 0, total_held_time: 1000 },
		},
		{
			value: { holding: "checking" },
			context: { wait_time: 0, total_wait_time: 0, total_held_time: 1500 },
		},
		{
			value: { holding: "holding" },
			context: { wait_time: 0, total_wait_time: 0, total_held_time: 1500 },
		},
		{
			value: { holding: "checking" },
			context: { wait_time: 0, total_wait_time: 0, total_held_time: 2000 },
		},
		{
			value: { holding: "holding" },
			context: { wait_time: 0, total_wait_time: 0, total_held_time: 2000 },
		},
		{
			value: { holding: "checking" },
			context: { wait_time: 0, total_wait_time: 0, total_held_time: 2500 },
		},
		{
			value: "acquired",
			context: { wait_time: 0, total_wait_time: 0, total_held_time: 2500 },
		},
	];
}

/**
 * @param {Comment} comment
 */
function validateFinalComment(comment) {
	assert.not.ok(
		comment.body.includes(htmlLockId),
		"Final comment should not have lock id"
	);
}

/**
 * @param {State[]} actualStates
 * @param {State[]} expectedStates
 * @param {Array<keyof import('xstate').Typestate<any>>} [propsToCompare]
 */
function validateStates(
	actualStates,
	expectedStates,
	propsToCompare = ["value"]
) {
	const pickedExpectStates = expectedStates.map((s) => pick(s, propsToCompare));
	const expectedFixture = JSON.stringify(pickedExpectStates, null, 2);

	const pickedActualStates = actualStates.map((s) => pick(s, propsToCompare));
	const actualFixture = JSON.stringify(pickedActualStates, null, 2);

	assert.fixture(actualFixture, expectedFixture, "State fixture");
}

const acquireLockSuite = suite("Acquire Comment Lock");

/** @type {import('@sinonjs/fake-timers').InstalledClock} */
let clock;

acquireLockSuite.before.each(() => {
	clock = fakeTimers.install();
});

acquireLockSuite.after.each(() => {
	clock.uninstall();
});

acquireLockSuite("Single benchmark, create comment", async () => {
	const completion = invokePostorUpdateComment();

	await clock.runAllAsync();
	const [states, comment] = await completion;

	validateFinalComment(comment);
	validateStates(states, [
		{ value: "initialRead" },
		{ value: { creating: "waiting" } },
		{ value: { creating: "searching" } },
		{ value: { creating: "waiting" } },
		{ value: { creating: "searching" } },
		{ value: { creating: "creating" } },
		{ value: "acquired" },
	]);
});

acquireLockSuite("Single benchmark, update comment", async () => {
	const { footer } = createTestCommentContext();
	const github = createGitHubClient();

	debug("testTrace", "Initiate comment with no lock...");
	await github.issues.createComment({
		body: `${getTestCommentBody(null)}\n${footer}`,
	});

	const completion = invokePostorUpdateComment({ github });

	await clock.runAllAsync();
	const [states, comment] = await completion;

	validateFinalComment(comment);
	validateStates(states, [
		{ value: "initialRead" },
		{ value: { acquiring: "waiting" } },
		{ value: { acquiring: "acquiring" } },
		{ value: { acquiring: "writing" } },
		...getFinalHoldingStates(),
	]);
});

acquireLockSuite(
	"Benchmark creates comment with initialize: true input",
	async () => {
		const context = createTestCommentContext({ initialize: true });
		const github = createGitHubClient();

		debug("testTrace", "Start test job trying to create comment...");
		const completion = invokePostorUpdateComment({ github, context });
		await clock.runAllAsync();

		const [states, finalComment] = await completion;

		validateFinalComment(finalComment);
		validateStates(states, [
			{ value: "initialRead" },
			{ value: { creating: "waiting" } },
			{ value: { creating: "searching" } },
			{ value: { creating: "creating" } },
			{ value: "acquired" },
		]);
	}
);

acquireLockSuite(
	"Benchmark waits for other job to create comment with initialize: false input",
	async () => {
		const github = createGitHubClient();
		const initializerCtx = createTestCommentContext({ initialize: true });
		const waiterCtx = createTestCommentContext({ initialize: false });

		debug("testTrace", "Start waiter job...");
		const waiterCompletion = invokePostorUpdateComment({
			github,
			context: waiterCtx,
		});
		await clock.nextAsync();

		debug("testTrace", "Start initializer job...");
		const initializeCompletion = invokePostorUpdateComment({
			github,
			context: initializerCtx,
		});

		await clock.runAllAsync();

		const [waiterStates, waiterFinalComment] = await waiterCompletion;
		const [
			initializerStates,
			initializerFinalComment,
		] = await initializeCompletion;

		validateFinalComment(waiterFinalComment);
		validateFinalComment(initializerFinalComment);

		validateStates(waiterStates, [
			{ value: "initialRead" },
			{ value: { creating: "waiting" } },
			{ value: { creating: "searching" } },
			{ value: { creating: "waiting" } },
			{ value: { creating: "searching" } },
			{ value: { acquiring: "waiting" } },
			{ value: { acquiring: "acquiring" } },
			{ value: { acquiring: "writing" } },
			...getFinalHoldingStates(),
		]);

		validateStates(initializerStates, [
			{ value: "initialRead" },
			{ value: { creating: "waiting" } },
			{ value: { creating: "searching" } },
			{ value: { creating: "creating" } },
			{ value: "acquired" },
		]);
	}
);

acquireLockSuite(
	"Benchmark times out with initialize: false input",
	async () => {
		const context = createTestCommentContext({ initialize: false });
		const logger = createTestLogger();

		debug("testTrace", "Start waiter job trying to create comment...");

		/** @type {Error} */
		let error;
		const completion = invokePostorUpdateComment({ context, logger }).catch(
			(e) => (error = e)
		);

		await clock.runAllAsync();
		const states = logger.getStates();

		assert.ok(error, "Expected error to be caught");
		assert.ok(
			error.message.includes("Timed out waiting for comment to be created"),
			"Expected error to have time out message"
		);

		validateStates(states, [
			{ value: "initialRead" },
			// (120 + 1) seconds of waiting
			...Array.from(new Array(121), () => [
				{ value: { creating: "waiting" } },
				{ value: { creating: "searching" } },
			]).flat(),
			{ value: "timed_out" },
		]);
	}
);

acquireLockSuite("Benchmark finds comment while creating", async () => {
	const { footer } = createTestCommentContext();
	const github = createGitHubClient();

	debug("testTrace", "Start test job trying to create comment...");
	const completion = invokePostorUpdateComment({ github });
	await clock.nextAsync();

	debug("testTrace", "Simulate second job creating the comment...");
	const { data: comment } = await github.issues.createComment({
		body: `${getTestCommentBody(null)}\n${footer}\n${getLockHtml()}`,
	});
	await clock.nextAsync();

	debug("testTrace", "Simulate second job releasing lock...");
	await github.issues.updateComment({
		comment_id: comment.id,
		body: `${getTestCommentBody(comment)}\n${footer}`,
	});
	await clock.nextAsync();

	debug("testTrace", "Wait for test job to complete");
	await clock.runAllAsync();
	const [states, finalComment] = await completion;

	validateFinalComment(finalComment);
	validateStates(states, [
		{ value: "initialRead" },
		{ value: { creating: "waiting" } },
		{ value: { creating: "searching" } },
		{ value: { creating: "waiting" } },
		{ value: { creating: "searching" } },
		{ value: { acquiring: "waiting" } },
		{ value: { acquiring: "acquiring" } },
		{ value: { acquiring: "writing" } },
		...getFinalHoldingStates(),
	]);
});

acquireLockSuite("Benchmark recovers previously held lock", async () => {
	const context = createTestCommentContext();
	const github = createGitHubClient();

	debug("testTrace", "Initiate comment with same lock as benchmark...");
	const lockHtml = getLockHtml(context.lockId);
	await github.issues.createComment({
		body: `${getTestCommentBody(null)}\n${context.footer}\n${lockHtml}`,
	});

	const completion = invokePostorUpdateComment({ github, context });

	await clock.runAllAsync();
	const [states, comment] = await completion;

	validateFinalComment(comment);
	validateStates(states, [
		{ value: "initialRead" },
		...getFinalHoldingStates(),
	]);
});

acquireLockSuite("Benchmark that must first wait", async () => {
	const { footer } = createTestCommentContext();
	const github = createGitHubClient();

	debug("testTrace", "Initiate first job creating comment with lock...");
	const { data: comment } = await github.issues.createComment({
		body: `${getTestCommentBody(null)}\n${footer}\n${getLockHtml()}`,
	});

	debug("testTrace", "Start test job trying to update comment...");
	const completion = invokePostorUpdateComment({ github });
	await clock.nextAsync();

	debug("testTrace", "Simulate first job completing...");
	await github.issues.updateComment({
		comment_id: comment.id,
		body: `${getTestCommentBody(comment)}\n${footer}`,
	});

	debug("testTrace", "Wait for test job to complete");
	await clock.runAllAsync();
	const [states, finalComment] = await completion;

	validateFinalComment(finalComment);
	validateStates(states, [
		{ value: "initialRead" },
		{ value: { acquiring: "waiting" } },
		{ value: { acquiring: "acquiring" } },
		{ value: { acquiring: "waiting" } },
		{ value: { acquiring: "acquiring" } },
		{ value: { acquiring: "writing" } },
		...getFinalHoldingStates(),
	]);
});

acquireLockSuite("Benchmark that loses a hold", async () => {
	const { footer } = createTestCommentContext();
	const github = createGitHubClient();

	debug("testTrace", "Initiate comment with no lock...");
	const { data: comment } = await github.issues.createComment({
		body: `${getTestCommentBody(null)}\n${footer}`,
	});

	debug("testTrace", "Start test job trying to update comment...");
	const completion = invokePostorUpdateComment({ github });
	await clock.nextAsync();

	debug("testTrace", "Simulate second job overwriting first job's lock...");
	await github.issues.updateComment({
		comment_id: comment.id,
		body: `${getTestCommentBody(comment)}\n${footer}\n${getLockHtml()}`,
	});
	await clock.nextAsync();

	debug("testTrace", "Simulate second job releasing lock...");
	await github.issues.updateComment({
		comment_id: comment.id,
		body: `${getTestCommentBody(comment)}\n${footer}`,
	});
	await clock.nextAsync();

	debug("testTrace", "Wait for test job to complete");
	await clock.runAllAsync();
	const [states, finalComment] = await completion;

	validateFinalComment(finalComment);
	validateStates(states, [
		{ value: "initialRead" },
		{ value: { acquiring: "waiting" } },
		{ value: { acquiring: "acquiring" } },
		{ value: { acquiring: "writing" } },
		{ value: { holding: "holding" } },
		{ value: { holding: "checking" } },
		{ value: { acquiring: "waiting" } },
		{ value: { acquiring: "acquiring" } },
		{ value: { acquiring: "writing" } },
		...getFinalHoldingStates(),
	]);
});

acquireLockSuite("Benchmark that times out", async () => {
	const { footer } = createTestCommentContext();
	const github = createGitHubClient();

	debug("testTrace", "Initiate comment with lock...");
	await github.issues.createComment({
		body: `${getTestCommentBody(null)}\n${footer}\n${getLockHtml()}`,
	});

	debug("testTrace", "Start job that times out waiting to update comment...");

	/** @type {Error} */
	let error;
	invokePostorUpdateComment({ github }).catch((e) => (error = e));
	await clock.runAllAsync();

	assert.ok(error, "Expected error to be caught");
	assert.ok(
		error.message.includes("Timed out waiting to acquire lock"),
		"Expected error to have time out message"
	);
});

acquireLockSuite("Comment update doesn't settle immediately", async () => {
	// Once saw a case where a action updated a comment, but upon reading the
	// comment again, it didn't see its update. However the next read for the
	// comment did show its update. So simulating this behavior to ensure our
	// state machine behaves as expected.

	const context = createTestCommentContext();
	const github = createGitHubClient();

	debug("testTrace", "Initiate comment...");
	const {
		data: { id: comment_id },
	} = await github.issues.createComment({
		body: `${getTestCommentBody(null)}\n${context.footer}`,
	});
	const {
		data: { body: origBody },
	} = await github.issues.getComment({ comment_id });

	debug("testTrace", "Start test job that locks comment...");
	const completion = invokePostorUpdateComment({ github, context });
	await clock.nextAsync();

	debug("testTrace", "Simulate comment not settling yet");
	const {
		data: { body: newBody },
	} = await github.issues.getComment({ comment_id });
	await github.issues.updateComment({
		comment_id,
		body: origBody,
	});

	debug("testTrace", "Allow test job to see that comment has not settled");
	await clock.nextAsync();

	debug("testTrace", "Simulate comment settling and showing updated body");
	await github.issues.updateComment({
		comment_id,
		body: newBody,
	});

	debug("testTrace", "Wait for test job to complete");
	await clock.runAllAsync();
	const [states, finalComment] = await completion;

	validateFinalComment(finalComment);
	validateStates(states, [
		{ value: "initialRead" },
		{ value: { acquiring: "waiting" } },
		{ value: { acquiring: "acquiring" } },
		{ value: { acquiring: "writing" } },
		{ value: { holding: "holding" } },
		{ value: { holding: "checking" } },
		{ value: { acquiring: "waiting" } },
		{ value: { acquiring: "acquiring" } },
		...getFinalHoldingStates(),
	]);
});

acquireLockSuite.run();
