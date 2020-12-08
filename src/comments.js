const { createMachine, interpret, assign } = require("xstate");
const escapeRe = require("escape-string-regexp");
const { majorVersion } = require("./utils/version");

/** @type {(min: number, max: number) => number} */
const randomInt = (min, max) => Math.floor(Math.random() * (max - min)) + min;

/** @type {(ms: number) => Promise<void>} */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** @type {(actionInfo: import('./global').ActionInfo) => string} */
const getFooter = (actionInfo) =>
	`\n\n<sub><a href="https://github.com/andrewiggins/tachometer-reporter-action" target="_blank">tachometer-reporter-action${majorVersion}</a> for <a href="${actionInfo.workflow.runsHtmlUrl}" target="_blank">${actionInfo.workflow.name}</a></sub>`;

/** @type {(writerId: string) => string} */
const getLockHtml = (writerId) =>
	`<span id="tachometer-reporter-action-lock-id" data-locked-by="${writerId}"></span>`;

const lockRe = /<span id="tachometer-reporter-action-lock-id" data-locked-by="(.*)"><\/span>/i;
const lockGlobalRe = new RegExp(lockRe, "gi");

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
	return commentBody + getLockHtml(writerId);
}

/**
 * @param {string} commentBody
 * @returns {string}
 */
function removeLockHtml(commentBody) {
	return commentBody.replace(lockGlobalRe, "");
}

/**
 * @param {import('xstate').StateValue} state
 * @returns {string}
 */
function getStateName(state) {
	if (typeof state == "string") {
		return state;
	} else {
		const keys = Object.keys(state);
		/* c8 ignore next 3 */
		if (keys.length !== 1) {
			throw new Error(`Unexpected state shape object returned: ${state}`);
		}

		const key = keys[0];
		return `${key}.${getStateName(state[key])}`;
	}
}

/** @type {import('./global').LockConfig} */
const defaultLockConfig = {
	createDelayMs: 1000, // 1s
	minHoldTimeMs: 2500, // 2.5s
	checkDelayMs: 500, // 0.5s
	minWaitTimeMs: 1000, // 1s
	maxWaitTimeMs: 3000, // 3s
	waitTimeoutMs: 2 * 60 * 1000, // 2 minutes
};

/**
 * @typedef {{ wait_time: number; total_wait_time: number; total_held_time: number; }} LockContext
 * @param {import('./global').LockConfig} lockConfig
 * // Below JSDoc makes things worse :/
 * returns {import('@xstate/fsm').StateMachine.Machine<LockContext>}
 */
function createAcquireLockMachine(lockConfig) {
	// Using https://npm.im/@xstate/fsm to track lock acquisition state
	//
	// Some early prototype state diagrams modeling various iterations of this
	// flow:
	// - https://xstate.js.org/viz/?gist=33685dc6569747e6156af33503e77e26
	// - https://xstate.js.org/viz/?gist=80c62c3012452b6c4ab96a9c9c995975
	// - https://xstate.js.org/viz/?gist=8068f41fc441205e6b1506fb8186903c
	// - https://xstate.js.org/viz/?gist=04c5a1e5a586bd75bb1e1aa946c89655
	//
	// XState Tutorial:
	// https://egghead.io/courses/introduction-to-state-machines-using-xstate
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

	// Based on https://xstate.js.org/viz/?gist=04c5a1e5a586bd75bb1e1aa946c89655
	return createMachine(
		{
			id: "CommentLockMachine",
			initial: "initialRead",
			strict: true,
			context: {
				waitTime: 0,
				totalWaitTime: 0,
				totalHeldTime: 0,
			},
			states: {
				initialRead: {
					on: {
						// comment doesn't exist
						NOT_FOUND: "creating",
						// comment exists, have hold
						HELD: "holding",
						// comment exists, and locked
						LOCKED: "acquiring",
						// comment exists, and not locked
						AVAILABLE: "acquiring",
					},
				},
				creating: {
					id: "creating",
					initial: "waiting",
					entry: "resetTotalWaitTime",
					states: {
						waiting: {
							exit: "updateTotalWaitTime",
							on: {
								COMPLETE_WAIT: "searching",
							},
						},
						searching: {
							on: {
								// comment doesn't exist, done waiting
								CREATE: "creating",
								// comment doesn't exist, need to wait
								NOT_FOUND: "waiting",
								// comment doesn't exist, time out
								TIMEOUT: "#timed_out",
								// comment exists, try to acquire
								LOCKED: "#acquiring",
							},
						},
						creating: {
							on: {
								CREATED: "#acquired",
							},
						},
					},
				},
				acquiring: {
					id: "acquiring",
					// We will only enter this state if the comment exists
					// and it isn't ours so first wait
					initial: "waiting",
					entry: "resetTotalWaitTime",
					states: {
						// Wait random time before attempting to acquire again
						waiting: {
							entry: "setWaitTime",
							exit: "updateTotalWaitTime",
							on: {
								COMPLETE_WAIT: "acquiring",
							},
						},
						acquiring: {
							on: {
								// Comment exists, no one
								HELD: "#holding",
								// Comment exists, no one has lock
								AVAILABLE: "writing",
								// comment exists, is locked
								LOCKED: "waiting",
								// comment exists, wait timeout exceeded
								TIMEOUT: "#timed_out",
							},
						},
						writing: {
							on: {
								HELD: "#holding",
							},
						},
					},
				},
				// Wait deterministic time before reading lock
				holding: {
					id: "holding",
					initial: "holding",
					context: {
						totalHeldTime: 0,
					},
					entry: "resetTotalHeldTime",
					states: {
						holding: {
							exit: "updateTotalHeldTime",
							on: {
								CHECK_HOLD: "checking",
							},
						},
						// read lock to see if we still have it
						checking: {
							on: {
								ACQUIRED: "#acquired",
								HELD: "holding",
								LOCKED: "#acquiring",
							},
						},
					},
				},
				// final states
				acquired: {
					id: "acquired",
					type: "final",
				},
				timed_out: {
					id: "timed_out",
					type: "final",
				},
			},
		},
		{
			actions: {
				resetTotalHeldTime: assign({
					totalHeldTime: 0,
				}),
				updateTotalHeldTime: assign({
					totalHeldTime: (ctx, evt) => {
						return ctx.totalHeldTime + lockConfig.checkDelayMs;
					},
				}),
				setWaitTime: assign({
					waitTime: (ctx, evt) => {
						return randomInt(
							lockConfig.minWaitTimeMs,
							lockConfig.maxWaitTimeMs
						);
					},
				}),
				resetTotalWaitTime: assign({
					totalWaitTime: 0,
				}),
				updateTotalWaitTime: assign({
					waitTime: 0,
					totalWaitTime: (ctx, evt) => {
						if (evt.waitTime != null) {
							return ctx.totalWaitTime + evt.waitTime;
						} else {
							return ctx.totalWaitTime + ctx.waitTime;
						}
					},
				}),
			},
		}
	);
}

/**
 * @param {import('./global').GitHubActionClient} github
 * @param {import('./global').CommentContext} context
 * @param {(c: null) => string} getInitialBody
 * @param {import('./global').Logger} logger
 * @returns {Promise<import('./global').CommentData>}
 */
async function acquireCommentLock(github, context, getInitialBody, logger) {
	// TODO: This current implementation can quickly get rate limited. Need to
	// understand if this rate limit is shared across all
	// tachometer-reporter-action's or if each workflow has its own. The rate
	// limit id for andrewiggins/tachometer-reporter-action is 7542410:
	//
	// Sample error from andrewiggins/tachometer-reporter-action:
	//		Error: API rate limit exceeded for installation ID 7542410.
	//

	logger.startGroup("Acquiring comment lock...");

	const config = defaultLockConfig;
	const service = interpret(createAcquireLockMachine(config));

	service.subscribe(async (state) => {
		logger.debug(() => {
			const date = new Date();
			return (
				`[${date.toISOString().split("T")[1]}] ` +
				"state event: " +
				JSON.stringify({
					value: state.value,
					context: state.context,
				})
			);
		});
	});

	service.start();

	let comment;
	while (!service.state.done) {
		let nextEvent = null;

		const state = service.state;
		const stateName = getStateName(state.value);
		const stateCtx = state.context;

		switch (stateName) {
			case "initialRead": {
				comment = await readComment(github, context, logger);
				const lockHolder = comment ? getLockHolder(comment) : null;

				if (comment == null) {
					logger.info("Comment not found.");
					nextEvent = "NOT_FOUND";
				} else if (lockHolder == context.lockId) {
					logger.info(`Comment found and already held by us.`);
					nextEvent = "HELD";
				} else if (lockHolder != null) {
					logger.info(`Comment found and locked by "${lockHolder}".`);
					nextEvent = "LOCKED";
				} else {
					logger.info(`Comment found and available.`);
					nextEvent = "AVAILABLE";
				}

				break;
			}

			case "creating.waiting":
				if (context.createDelayFactor === 0) {
					logger.info(
						`This job's createDelayFactor is 0 so skipping create wait.`
					);
					nextEvent = { type: "COMPLETE_WAIT", waitTime: 1 };
				} else {
					logger.info(
						`Waiting ${config.createDelayMs}ms before searching for comment again.`
					);
					await sleep(config.createDelayMs);
					nextEvent = { type: "COMPLETE_WAIT", waitTime: config.createDelayMs };
				}

				break;

			case "creating.searching": {
				comment = await readComment(github, context, logger);
				const lockHolder = comment ? getLockHolder(comment) : null;
				const maxWaitingTime = config.createDelayMs * context.createDelayFactor;

				if (comment != null) {
					logger.info(`Comment found and locked by "${lockHolder}".`);
					nextEvent = "LOCKED";
				} else if (
					maxWaitingTime === Infinity &&
					stateCtx.totalWaitTime > config.waitTimeoutMs
				) {
					logger.info(
						`Comment not found, max waiting time is Infinity, and wait time out (${config.waitTimeoutMs}) has been reached.`
					);
					nextEvent = "TIMEOUT";
				} else if (stateCtx.totalWaitTime < maxWaitingTime) {
					logger.info(
						`Comment not found and max waiting time (${stateCtx.totalWaitTime}/${maxWaitingTime}ms) not yet reached.`
					);
					nextEvent = "NOT_FOUND";
				} else {
					logger.info(
						`Comment not found and max waiting time (${stateCtx.totalWaitTime}/${maxWaitingTime}ms) has been reached.`
					);
					nextEvent = "CREATE";
				}

				break;
			}

			case "creating.creating":
				// TODO: this flow is kinda weird... Can we improve it? It's weird cuz
				// when creating the comment we need to do what the body of
				// postOrUpdateComment does but inside of the acquireLock loop... Is
				// there some way we could push this outside of the acquire lock loop?
				// Or maybe move the real update inside the machine?
				const newBody = getFinalBody(context, getInitialBody, null);
				comment = await createComment(github, context, newBody, logger);
				context.created = true;
				nextEvent = "CREATED";
				break;

			case "acquiring.waiting":
				logger.info(
					`Waiting ${stateCtx.waitTime}ms before attempting to acquire the lock again.`
				);
				await sleep(stateCtx.waitTime);
				nextEvent = "COMPLETE_WAIT";
				break;

			case "acquiring.acquiring": {
				logger.info("Attempting to acquire comment lock...");
				comment = await readComment(github, context, logger);
				const lockHolder = comment ? getLockHolder(comment) : null;

				if (lockHolder == context.lockId) {
					logger.info("Lock is already held by this job.");
					nextEvent = "HELD";
				} else if (lockHolder == null) {
					logger.info("No one is holding the lock.");
					nextEvent = "AVAILABLE";
				} else if (stateCtx.totalWaitTime > config.waitTimeoutMs) {
					nextEvent = "TIMEOUT";
				} else {
					logger.info(`Lock is held by "${lockHolder}".`);
					nextEvent = "LOCKED";
				}

				break;
			}

			case "acquiring.writing":
				logger.info(`Updating comment with our ID (${context.lockId})...`);
				const updatedBody = addLockHtml(comment.body, context.lockId);
				comment = await updateComment(github, context, updatedBody, logger);
				nextEvent = "HELD";
				break;

			case "holding.holding":
				logger.info(
					`Waiting ${config.checkDelayMs}ms before checking if we still have the lock.`
				);
				await sleep(config.checkDelayMs);
				nextEvent = "CHECK_HOLD";

				break;

			case "holding.checking": {
				comment = await readComment(github, context, logger);
				const lockHolder = getLockHolder(comment);
				const lockHeld = lockHolder === context.lockId;
				const totalHeldTime = stateCtx.totalHeldTime;

				if (lockHeld) {
					if (totalHeldTime >= config.minHoldTimeMs) {
						logger.info("Minumum hold time reach. Lock acquired.");
						nextEvent = "ACQUIRED";
					} else {
						logger.info(
							`We still have the lock but haven't reached the minimum hold time (${totalHeldTime}ms/${config.minHoldTimeMs}ms) so holding longer.`
						);
						nextEvent = "HELD";
					}
				} else {
					logger.info(`We lost the lock. Lock is now held by ${lockHolder}.`);
					nextEvent = "LOCKED";
				}

				break;
			}

			/* c8 ignore next 2 */
			default:
				throw new Error(`Unexpected stateName: ${JSON.stringify(stateName)}`);
		}

		service.send(nextEvent);
	}

	service.stop();

	logger.info("Lock machine complete. Final state: " + service.state.value);
	logger.debug(
		() => "Final state object: " + JSON.stringify(service.state, null, 2)
	);
	logger.debug(() => "Comment: " + JSON.stringify(comment, null, 2));
	logger.endGroup();

	if (service.state.value == "timed_out") {
		if (comment) {
			const lastWriterId = getLockHolder(comment);
			throw new Error(
				`Timed out waiting to acquire lock to write comment. Last writer to hold lock was "${lastWriterId}"`
			);
		} else {
			throw new Error(
				`Timed out waiting for comment to be created. Is there at least one job in this workflow with initialize set to true?`
			);
		}
	}

	return comment;
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

				// logger.debug(() => {
				// 	return `Testing if "${context.footerRe.toString()}" matches the following by "${
				// 		c.user.type
				// 	}":\n${c.body}\n\n`;
				// });

				if (context.matches(c)) {
					comment = c;
					context.commentId = c.id;
					logger.info(`Found comment! (id: ${c.id})`);
					logger.debug(() => `Found comment: ${JSON.stringify(c, null, 2)}`);
					break;
				}
			}
		}
		/* c8 ignore next 4 */
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
	/* c8 ignore next 3 */
	if (context.commentId == null) {
		throw new Error(`Cannot update comment if "context.commentId" is null`);
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
 * @param {import('./global').CommentContext} context
 * @param {(comment: import('./global').CommentData | null) => string} getCommentBody
 * @param {import('./global').CommentData | null} comment
 * @returns {string}
 */
function getFinalBody(context, getCommentBody, comment) {
	let updatedBody = getCommentBody(comment);
	if (!updatedBody.includes(context.footer)) {
		updatedBody = updatedBody + context.footer;
	}

	return removeLockHtml(updatedBody);
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

	if (context.created) {
		// If this job created the comment, no need to do further updating
		logger.info(`Comment was created. (id: ${comment.id})`);
		return comment;
	}

	context.commentId = comment.id;
	try {
		const body = getFinalBody(context, getCommentBody, comment);
		comment = await updateComment(github, context, body, logger);

		/* c8 ignore next 4 */
	} catch (e) {
		logger.info(`Error updating comment: ${e.message}`);
		logger.debug(() => e.toString());
	}

	return comment;
}

/**
 * @param {Pick<import('./global').GitHubActionContext, "repo" | "issue">} context
 * @param {import('./global').ActionInfo} actionInfo
 * @param {string | undefined} [customId]
 * @param {boolean} [initialize]
 * @returns {import('./global').CommentContext}
 */
function createCommentContext(context, actionInfo, customId, initialize) {
	const { run, job } = actionInfo;

	const lockId = `{ customId: ${customId}, run: {id: ${run.id}, name: ${run.name}}, job: {id: ${job.id}, name: ${job.name}}`;

	const footer = getFooter(actionInfo);
	const footerRe = new RegExp(escapeRe(footer));

	/** @type {number} */
	let createDelayFactor;
	if (initialize === true) {
		createDelayFactor = 0;
	} else if (initialize === false) {
		createDelayFactor = Infinity;
	} else if (job.index != null) {
		createDelayFactor = job.index;
	} else {
		createDelayFactor = randomInt(3, 10);
	}

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
		createDelayFactor,
		created: false,
	};
}

module.exports = {
	createCommentContext,
	postOrUpdateComment,
};
