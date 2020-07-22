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
	all: false,
	states: false,
};

const htmlLockId = "tachometer-reporter-action-lock-id";

/**
 * @param {keyof DEBUG | null} namespace
 * @param {string} msg
 */
function debug(namespace, msg) {
	if (DEBUG.all || DEBUG[namespace]) {
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

		return { data: { ...comment, body } };
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
			debug(null, msg);
		},
		warn(msg) {
			throw new Error("Unexpected warning in test: " + msg);
		},
		startGroup(name) {
			debug(null, name);
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
	const expectedFixture = JSON.stringify(expectedStates, null, 2);

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

acquireLockSuite.only("Single benchmark", async () => {
	const completion = invokePostorUpdateComment();

	await clock.runAllAsync();
	const [states, comment] = await completion;

	validateFinalComment(comment);
	validateStates(states, [
		{ value: "acquiring" },
		{ value: "holding" },
		{ value: "checking" },
		{ value: "holding" },
		{ value: "checking" },
		{ value: "holding" },
		{ value: "checking" },
		{ value: "holding" },
		{ value: "checking" },
		{ value: "holding" },
		{ value: "checking" },
		{ value: "acquired" },
	]);
});

acquireLockSuite.run();
