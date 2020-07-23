const { readFileSync } = require("fs");
const { readFile, writeFile } = require("fs").promises;
const { suite } = require("uvu");
const assert = require("uvu/assert");
const fakeTimers = require("@sinonjs/fake-timers");
const {
	postOrUpdateComment,
	createCommentContext,
} = require("../lib/comments");
const { defaultActionInfo } = require("./invokeBuildReport");
const { pick } = require("./utils");

const DEBUG = {
	allLogs: false,
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
 * @template T
 * @typedef {Partial<import('../src/global').OctokitResponse<T>>} OctokitResponse
 */

/**
 * Modified from https://stackoverflow.com/a/49936686/2303091 to work with JSDoc
 * @template T
 * @typedef {{ [P in keyof T]?: DeepPartial<T[P]> }} DeepPartial
 */

/**
 * @typedef {DeepPartial<import('../src/global').CommentData>} Comment
 */

/**
 * @param {{ comments?: Comment[] }} [options]
 */
function createGitHubClient({ comments = [] } = {}) {
	// From the log found in import('./invokeBuildReport').defaultActionInfo.job.htmlUrl
	let id = 656984357;

	/**
	 * @param {{ comment_id: number }} params
	 * @returns {Promise<OctokitResponse<Comment>>}
	 */
	async function getComment({ comment_id }) {
		const comment = comments.find((c) => c.id == comment_id);
		if (!comment) {
			throw new Error(`Could not find comment with id ${comment_id}`);
		}

		return { data: { ...comment } };
	}

	/**
	 * @param {{ comment_id: number; body: string}} params
	 * @returns {Promise<OctokitResponse<Comment>>}
	 */
	async function updateComment({ comment_id, body }) {
		const comment = comments.find((c) => c.id == comment_id);
		if (!comment) {
			throw new Error(`Could not find comment with id ${comment_id}`);
		}

		comment.body = body;
		return { data: { ...comment } };
	}

	/**
	 * @param {{ body: string }} params
	 * @returns {Promise<OctokitResponse<Comment>>}
	 */
	async function createComment({ body }) {
		const comment = { id: id++, body, user: { type: "Bot" } };
		comments.push(comment);
		return { data: { ...comment } };
	}

	/**
	 * @returns {Promise<OctokitResponse<Comment[]>>}
	 */
	async function listComments() {
		return { data: [...comments.map((c) => ({ ...c }))] };
	}

	return {
		issues: {
			listComments,
			createComment,
			getComment,
			updateComment,
		},
	};
}

function createTestCommentContext() {
	/** @type {Pick<import('../src/global').GitHubActionContext, "repo" | "issue">} */
	const fakeGitHubContext = {
		repo: {
			owner: "andrewiggins",
			repo: "tachometer-reporter-action",
		},
		issue: {
			owner: "andrewiggins",
			repo: "tachometer-reporter-action",
			number: 5,
		},
	};

	return createCommentContext(fakeGitHubContext, defaultActionInfo);
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
 * @typedef {DeepPartial<import('@xstate/fsm').Typestate<any>>} State
 * @typedef {{ getStates(): Array<import('@xstate/fsm').Typestate<any>> }} TestLoggerHelpers
 * @typedef {import('../src/global').Logger & TestLoggerHelpers} TestLogger
 * @returns {TestLogger}
 */
function createTestLogger() {
	/** @type {Array<import('@xstate/fsm').Typestate<any>>} */
	const states = [];

	return {
		debug(getMsg) {
			const msg = getMsg();
			if (msg.startsWith("state event: ")) {
				const state = JSON.parse(msg.slice(13));
				debug("states", state);
				states.push(state);
			}
		},
		info(msg) {
			debug("allLogs", msg);
		},
		warn(msg) {
			throw new Error("Unexpected warning in test: " + msg);
		},
		startGroup(name) {
			debug("allLogs", name);
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
			value: "holding",
			context: { wait_time: 0, total_wait_time: 0, total_held_time: 0 },
			actions: [],
			changed: true,
		},
		{
			value: "checking",
			context: { wait_time: 0, total_wait_time: 0, total_held_time: 500 },
			actions: [],
			changed: true,
		},
		{
			value: "holding",
			context: { wait_time: 0, total_wait_time: 0, total_held_time: 500 },
			actions: [],
			changed: true,
		},
		{
			value: "checking",
			context: { wait_time: 0, total_wait_time: 0, total_held_time: 1000 },
			actions: [],
			changed: true,
		},
		{
			value: "holding",
			context: { wait_time: 0, total_wait_time: 0, total_held_time: 1000 },
			actions: [],
			changed: true,
		},
		{
			value: "checking",
			context: { wait_time: 0, total_wait_time: 0, total_held_time: 1500 },
			actions: [],
			changed: true,
		},
		{
			value: "holding",
			context: { wait_time: 0, total_wait_time: 0, total_held_time: 1500 },
			actions: [],
			changed: true,
		},
		{
			value: "checking",
			context: { wait_time: 0, total_wait_time: 0, total_held_time: 2000 },
			actions: [],
			changed: true,
		},
		{
			value: "holding",
			context: { wait_time: 0, total_wait_time: 0, total_held_time: 2000 },
			actions: [],
			changed: true,
		},
		{
			value: "checking",
			context: { wait_time: 0, total_wait_time: 0, total_held_time: 2500 },
			actions: [],
			changed: true,
		},
		{
			value: "acquired",
			context: { wait_time: 0, total_wait_time: 0, total_held_time: 2500 },
			actions: [],
			changed: true,
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
 * @param {Array<keyof import('@xstate/fsm').StateMachine.State>} [propsToCompare]
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

acquireLockSuite("Single benchmark", async () => {
	const completion = invokePostorUpdateComment();

	await clock.runAllAsync();
	const [states, comment] = await completion;

	validateFinalComment(comment);
	validateStates(states, [{ value: "acquiring" }, ...getFinalHoldingStates()]);
});

acquireLockSuite("Benchmark that must first wait", async () => {
	const context = createTestCommentContext();
	const github = createGitHubClient();

	debug("testTrace", "Initiate first job creating comment with lock...");
	const { data: comment } = await github.issues.createComment({
		body: `${getTestCommentBody(null)}\n${context.footer}\n${getLockHtml()}`,
	});

	debug("testTrace", "Start second job trying to update comment...");
	const completion = invokePostorUpdateComment({ github });
	await clock.nextAsync();

	debug("testTrace", "Simulate first job completing...");
	await github.issues.updateComment({
		comment_id: comment.id,
		body: `${getTestCommentBody(comment)}\n${context.footer}`,
	});

	debug("testTrace", "Wait for second job to complete");
	await clock.runAllAsync();
	const [states, finalComment] = await completion;

	validateFinalComment(finalComment);
	validateStates(states, [
		{ value: "acquiring" },
		{ value: "waiting" },
		{ value: "acquiring" },
		{ value: "waiting" },
		{ value: "acquiring" },
		...getFinalHoldingStates(),
	]);
});

acquireLockSuite("Benchmark that loses a hold", async () => {
	const context = createTestCommentContext();
	const github = createGitHubClient();

	debug("testTrace", "Initiate comment with no lock...");
	const { data: comment } = await github.issues.createComment({
		body: `${getTestCommentBody(null)}\n${context.footer}`,
	});

	debug("testTrace", "Start first job trying to update comment...");
	const completion = invokePostorUpdateComment({ github });
	await clock.nextAsync();

	debug("testTrace", "Simulate second job overwriting first job's lock...");
	await github.issues.updateComment({
		comment_id: comment.id,
		body: `${getTestCommentBody(comment)}\n${context.footer}\n${getLockHtml()}`,
	});
	await clock.nextAsync();

	debug("testTrace", "Simulate second job releasing lock...");
	await github.issues.updateComment({
		comment_id: comment.id,
		body: `${getTestCommentBody(comment)}\n${context.footer}`,
	});
	await clock.nextAsync();

	debug("testTrace", "Wait for first job to complete");
	await clock.runAllAsync();
	const [states, finalComment] = await completion;

	validateFinalComment(finalComment);
	validateStates(states, [
		{ value: "acquiring" },
		{ value: "holding" },
		{ value: "checking" },
		{ value: "holding" },
		{ value: "checking" },
		{ value: "waiting" },
		{ value: "acquiring" },
		...getFinalHoldingStates(),
	]);
});

acquireLockSuite("Benchmark that times out", async () => {
	const context = createTestCommentContext();
	const github = createGitHubClient();

	debug("testTrace", "Initiate comment with lock...");
	await github.issues.createComment({
		body: `${getTestCommentBody(null)}\n${context.footer}\n${getLockHtml()}`,
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

acquireLockSuite.run();
