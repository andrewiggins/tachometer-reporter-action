const { createMachine, interpret, assign } = require("@xstate/fsm");
const escapeRe = require("escape-string-regexp");

const randomInt = (min, max) => Math.floor(Math.random() * (max - min)) + min;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getLockHtml = (writerId) =>
	`<span id="tachometer-reporter-action-lock-id" data-locked-by="${writerId}"></span>`;
const lockRe = /<span id="tachometer-reporter-action-lock-id" data-locked-by="(.*)"><\/span>/i;
const lockGlobalRe = new RegExp(lockRe, "gi");

/** @type {import('./global').LockConfig} */
const defaultLockConfig = {
	minHoldTimeMs: 2500, // 2.5s
	checkDelayMs: 500, // 0.5s
	minWaitTimeMs: 1000, // 1s
	maxWaitTimeMs: 3000, // 3s
	waitTimeoutMs: 60 * 1000, // 1 minute
};

const finalStates = ["acquired", "timed_out"];

/**
 * @typedef {{ wait_time: number; total_wait_time: number; total_held_time: number; }} LockContext
 * @param {import('./global').LockConfig} lockConfig
 * // Below JSDoc makes things worse :/
 * returns {import('@xstate/fsm').StateMachine.Machine<LockContext>}
 */
function createAcquireLockMachine(lockConfig) {
	// Using https://npm.im/@xstate/fsm to track lock acquisition state
	//
	// Some prototype state diagrams modeling this flow:
	// - https://xstate.js.org/viz/?gist=33685dc6569747e6156af33503e77e26
	// - https://xstate.js.org/viz/?gist=80c62c3012452b6c4ab96a9c9c995975
	//
	// XState Tutorial: https://egghead.io/courses/introduction-to-state-machines-using-xstate
	//
	// Simplified general Idea:
	//
	// 1. read if comment exists
	// 2. if comment exists and is locked, wait then try again
	// 3. if comment doesn't exist or is not locked, continue
	// 4. update comment with lock id
	// 5. wait a short time for any other inflight writes
	// 6. read comment again to see we still have the lock
	// 7. if we have lock, continue
	// 8. if we don't have lock, wait a random time and try again

	// Based on https://xstate.js.org/viz/?gist=33685dc6569747e6156af33503e77e26
	return createMachine(
		{
			id: "AcquireLockMachine",
			initial: "acquiring",
			context: {
				wait_time: 0,
				total_wait_time: 0,
				total_held_time: 0,
			},
			states: {
				// Read lock and either keep waiting or write & hold
				acquiring: {
					on: {
						TIMEOUT: "timed_out",
						HOLD: "holding",
						WAIT: "waiting",
					},
				},
				// Wait random time before attempting to acquire again
				waiting: {
					entry: ["resetTotalHeldTime", "setWaitTime"],
					exit: "updateTotalWaitTime",
					on: {
						COMPLETE_WAIT: "acquiring",
					},
				},
				// Wait deterministic time before reading lock
				holding: {
					entry: "resetTotalWaitTime",
					exit: "updateTotalHeldTime",
					on: {
						CHECK_HOLD: "checking",
					},
				},
				// read lock to see if we still have it
				checking: {
					on: {
						ACQUIRED: "acquired",
						HOLD: "holding",
						WAIT: "waiting",
					},
				},
				// final states
				acquired: {},
				timed_out: {},
			},
		},
		{
			actions: {
				resetTotalHeldTime: assign({
					total_held_time: 0,
				}),
				updateTotalHeldTime: assign({
					total_held_time: (ctx, evt) => {
						return ctx.total_held_time + lockConfig.checkDelayMs;
					},
				}),
				setWaitTime: assign({
					wait_time: () => {
						return randomInt(
							lockConfig.minWaitTimeMs,
							lockConfig.maxWaitTimeMs
						);
					},
				}),
				resetTotalWaitTime: assign({
					total_wait_time: 0,
				}),
				updateTotalWaitTime: assign({
					wait_time: 0,
					total_wait_time: (ctx, evt) => {
						return ctx.total_wait_time + ctx.wait_time;
					},
				}),
			},
		}
	);
}

/**
 * @param {import('./global').CommentData} comment
 * @returns {string | null}
 */
function getLockHolder(comment) {
	const match = comment.body.match(lockRe);
	if (match != null) {
		return match[1];
	} else {
		return null;
	}
}

/**
 * @param {string} commentBody
 * @param {string} writerId
 * @returns {string}
 */
function addLockHtml(commentBody, writerId) {
	return commentBody + "\n" + getLockHtml(writerId);
}

/**
 * @param {string} commentBody
 * @returns {string}
 */
function removeLockHtml(commentBody) {
	return commentBody.replace(lockGlobalRe, "");
}

/**
 * @param {import('./global').GitHubActionClient} github
 * @param {import('./global').CommentContext} context
 * @param {import('./global').Logger} logger
 * @returns {Promise<[boolean, import('./global').CommentData]>}
 */
async function attemptAcquire(github, context, logger) {
	logger.info("Attempting to acquire comment lock...");
	let comment = await readComment(github, context, logger);

	const lockHolder = getLockHolder(comment);

	let lockHeld = false;
	if (lockHolder === context.lockId) {
		logger.info("Lock is already held by this job.");
		lockHeld = true;
	} else if (lockHolder == null) {
		logger.info("No one is holding the lock. Updating comment with our ID...");
		const newBody = addLockHtml(comment.body, context.lockId);
		comment = await updateComment(github, context, newBody, logger);
		lockHeld = true;
	} else {
		logger.info(`Lock is held by "${lockHolder}".`);
	}

	return [lockHeld, comment];
}

/**
 * @param {import('./global').GitHubActionClient} github
 * @param {import('./global').CommentContext} context
 * @param {import('./global').Logger} logger
 * @returns {Promise<[boolean, import('./global').CommentData]>}
 */
async function checkHold(github, context, logger) {
	const comment = await readComment(github, context, logger);
	return [getLockHolder(comment) === context.lockId, comment];
}

/**
 * @param {import('./global').GitHubActionClient} github
 * @param {import('./global').CommentContext} context
 * @param {(c: null) => string} getInitialBody
 * @param {import('./global').Logger} logger
 * @returns {Promise<import('./global').CommentData>}
 */
async function initiateCommentLock(github, context, getInitialBody, logger) {
	logger.info("Initiating comment lock...");

	// Use the index of the job in the run to deterministically delay the
	// potentially write of the comment so hopefully only the first job writes the
	// comment.
	let delay = context.delayFactor * 100; // (factor * 100) milliseconds

	/** @type {import('./global').CommentData} */
	let comment = await readComment(github, context, logger);
	if (!comment) {
		logger.info(`Comment not found. Waiting ${delay}ms before trying again...`);
		await sleep(delay);

		comment = await readComment(github, context, logger);

		if (!comment) {
			logger.info("After delay, comment not found. Creating comment...");
			comment = await createComment(
				github,
				context,
				addLockHtml(getInitialBody(null), context.lockId),
				logger
			);
		} else {
			logger.info("Comment already initiated.");
		}
	} else {
		logger.info("Comment already initiated.");
	}

	context.commentId = comment.id;
	return comment;
}

/**
 * @param {import('./global').GitHubActionClient} github
 * @param {import('./global').CommentContext} context
 * @param {(c: null) => string} getInitialBody
 * @param {import('./global').Logger} logger
 * @returns {Promise<import('./global').CommentData>}
 */
async function acquireCommentLock(github, context, getInitialBody, logger) {
	logger.startGroup("Acquiring comment lock...");

	// Create comment if it doesn't already exist
	let lastReadComment = await initiateCommentLock(
		github,
		context,
		getInitialBody,
		logger
	);

	const config = defaultLockConfig;
	const service = interpret(createAcquireLockMachine(config));

	service.subscribe(async (state) => {
		logger.debug(() => "state event: " + JSON.stringify(state));
	});

	service.start();

	loop: while (!finalStates.includes(service.state.value)) {
		let nextEvent = null;

		const state = service.state;
		switch (state.value) {
			case "acquiring": {
				const [lockAcquired, comment] = await attemptAcquire(
					github,
					context,
					logger
				);

				lastReadComment = comment;

				if (lockAcquired) {
					nextEvent = "HOLD";
				} else if (state.context.total_wait_time > config.waitTimeoutMs) {
					nextEvent = "TIMEOUT";
				} else {
					nextEvent = "WAIT";
				}

				break;
			}

			case "waiting":
				logger.info(
					`Waiting ${state.context.wait_time}ms before attempting to acquire the lock again.`
				);
				await sleep(state.context.wait_time);
				nextEvent = "COMPLETE_WAIT";
				break;

			case "holding":
				logger.info(
					`Waiting ${config.checkDelayMs}ms before checking if we still have the lock.`
				);
				await sleep(config.checkDelayMs);
				nextEvent = "CHECK_HOLD";
				break;

			case "checking": {
				const [lockHeld, comment] = await checkHold(github, context, logger);
				lastReadComment = comment;

				const totalHeldTime = state.context.total_held_time;
				if (lockHeld) {
					if (totalHeldTime >= config.minHoldTimeMs) {
						logger.info("Minumum hold time reach. Lock acquired.");
						nextEvent = "ACQUIRED";
					} else {
						logger.info(
							`We still have the lock but haven't reached the minimum hold time (${totalHeldTime}ms/${config.minHoldTimeMs}ms) so holding longer.`
						);
						nextEvent = "HOLD";
					}
				} else {
					const lockHolder = getLockHolder(comment);
					logger.info(
						`We no longer hold the lock. Lock is now held by ${lockHolder}.`
					);
					nextEvent = "WAIT";
				}

				break;
			}

			case "acquired":
			case "timed_out":
				logger.info(
					`Hmmm... Reach a final state (${state.value}) inside loop. This behavior is unexpected`
				);
				break loop;

			default:
				throw new Error(`Unexpected state in state machine: ${state.value}`);
		}

		service.send(nextEvent);
	}

	service.stop();

	logger.info("Lock machine complete. Final state: " + service.state.value);
	logger.debug(
		() => "Final state object: " + JSON.stringify(service.state, null, 2)
	);
	logger.debug(() => "Comment: " + JSON.stringify(lastReadComment, null, 2));
	logger.endGroup();

	if (service.state.value == "timed_out") {
		const lastWriterId = getLockHolder(lastReadComment);
		throw new Error(
			`Timed out waiting to acquire lock to write comment. Last writer to hold lock was "${lastWriterId}"`
		);
	}

	return lastReadComment;
}

/**
 * Read a comment matching with matching regex
 * @param {import('./global').GitHubActionClient} github
 * @param {import('./global').CommentContext} context
 * @param {import('./global').Logger} logger
 * @returns {Promise<import('./global').CommentData | null>}
 */
async function readComment(github, context, logger) {
	/** @type {import('./global').CommentData} */
	let comment;

	try {
		if (context.commentId != null) {
			logger.info(`Reading comment ${context.commentId}...`);
			comment = (
				await github.issues.getComment({
					owner: context.owner,
					repo: context.repo,
					comment_id: context.commentId,
				})
			).data;
		} else {
			logger.info(`Trying to find matching comment...`);

			// Assuming comment is in the first page of results for now...
			// https://docs.github.com/en/rest/reference/issues#list-issue-comments
			const comments = (
				await github.issues.listComments({
					owner: context.owner,
					repo: context.repo,
					issue_number: context.issueNumber,
				})
			).data;

			for (let i = comments.length; i--; ) {
				const c = comments[i];

				logger.debug(() => {
					return `Testing if "${context.footerRe.toString()}" matches the following by "${
						c.user.type
					}":\n${c.body}\n\n`;
				});

				if (context.matches(c)) {
					comment = c;
					logger.info(`Found comment! (id: ${c.id})`);
					logger.debug(() => `Found comment: ${JSON.stringify(c, null, 2)}`);
					break;
				}
			}
		}
	} catch (e) {
		logger.warn("Error trying to read comments: " + e.message);
		logger.debug(() => e.toString());
	}

	return comment;
}

/**
 * @param {import('./global').GitHubActionClient} github
 * @param {import('./global').CommentContext} context
 * @param {string} body
 * @param {import('./global').Logger} logger
 * @returns {Promise<import('./global').CommentData>}
 */
async function updateComment(github, context, body, logger) {
	if (context.commentId == null) {
		throw new Error(`Cannot update comment if "context.id" is null`);
	}

	logger.info(`Updating comment body (id: ${context.commentId})...`);

	const comment = (
		await github.issues.updateComment({
			repo: context.repo,
			owner: context.owner,
			comment_id: context.commentId,
			body,
		})
	).data;

	logger.debug(() => `Updated comment body: ${comment.body}`);

	return comment;
}

/**
 * @param {import('./global').GitHubActionClient} github
 * @param {import('./global').CommentContext} context
 * @param {string} body
 * @param {import('./global').Logger} logger
 * @returns {Promise<import('./global').CommentData>}
 */
async function createComment(github, context, body, logger) {
	logger.info("Creating new comment...");
	logger.debug(() => `New comment body: ${body}`);

	return (
		await github.issues.createComment({
			owner: context.owner,
			repo: context.repo,
			issue_number: context.issueNumber,
			body,
		})
	).data;
}

/**
 * Create a PR comment, or update one if it already exists
 * @param {import('./global').GitHubActionClient} github
 * @param {import('./global').CommentContext} context
 * @param {(comment: import('./global').CommentData | null) => string} getCommentBody
 * @param {import('./global').Logger} logger
 * @returns {Promise<import('./global').CommentData>}
 */
async function postOrUpdateComment(github, context, getCommentBody, logger) {
	// logger.startGroup(`Updating PR comment:`);
	logger.info(`Updating PR comment...`);

	let comment = await acquireCommentLock(
		github,
		context,
		getCommentBody,
		logger
	);

	context.commentId = comment.id;
	try {
		let updatedBody = getCommentBody(comment);
		if (!updatedBody.includes(context.footer)) {
			updatedBody = updatedBody + context.footer;
		}

		comment = await updateComment(
			github,
			context,
			removeLockHtml(updatedBody),
			logger
		);
	} catch (e) {
		logger.info(`Error updating comment: ${e.message}`);
		logger.debug(() => e.toString());
	}

	return comment;
}

/**
 * @param {Pick<import('./global').GitHubActionContext, "repo" | "issue">} context
 * @param {import('./global').ActionInfo} actionInfo
 * @returns {import('./global').CommentContext}
 */
function createCommentContext(context, actionInfo) {
	// TODO: Make comment lock more legible
	const lockId = `${actionInfo.workflow.id}::${actionInfo.run.id}::${actionInfo.job.id}`;
	const footer = `\n\n<sub><a href="https://github.com/andrewiggins/tachometer-reporter-action" target="_blank">tachometer-reporter-action</a> for <a href="${actionInfo.workflow.runsHtmlUrl}" target="_blank">${actionInfo.workflow.name}</a></sub>`;
	const footerRe = new RegExp(escapeRe(footer.trim()));

	return {
		...context.repo,
		issueNumber: context.issue.number,
		commentId: null,
		lockId,
		footer,
		footerRe,
		matches(c) {
			return c.user.type === "Bot" && footerRe.test(c.body);
		},
		delayFactor: actionInfo.job.index ?? 0,
	};
}

module.exports = {
	createCommentContext,
	postOrUpdateComment,
};
