const { createMachine, interpret, assign } = require("@xstate/fsm");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const minHoldTime = 2500; // milliseconds
const checkDelay = 500; // milliseconds, defaults to 500ms or minHoldTime/2 if minHoldTime < 500
const minWaitTime = 1; // seconds
const maxWaitTime = 3; // seconds
const waitTimeout = 10; // seconds

const getWaitTime = () =>
	Math.floor(Math.random() * maxWaitTime + minWaitTime) * 1000;

/**
 * @returns {Promise<[boolean, object]>}
 */
async function attemptAcquire() {
	const lockAcquiredChance = 0.5;
	const lockAcquiredActual = Math.random();
	const lockAquired = lockAcquiredActual < lockAcquiredChance;

	console.log("attemptAcquire:", lockAcquiredChance, lockAcquiredActual);
	// Read lock
	// if held by someone else, send WAIT
	// if held by us, send HOLD
	// if held by no one, write to lock and send HOLD

	return [lockAquired, {}];
}

/**
 * @returns {Promise<[boolean, object]>}
 */
async function checkHold(context) {
	const lockHeldChance = 0.5 + 0.5 * (context.total_held_time / minHoldTime);
	const lockHeldActual = Math.random();
	const lockHeld = lockHeldActual < lockHeldChance;

	console.log("checkHold:", lockHeldChance, lockHeldActual);
	// read lock
	// if ours, send HOLD
	// if not ours, send WAIT

	return [lockHeld, {}];
}

// Based on https://xstate.js.org/viz/?gist=33685dc6569747e6156af33503e77e26
const lockMachine = createMachine(
	{
		id: "Lock",
		initial: "acquiring",
		context: {
			wait_time: 0,
			total_wait_time: 0,
			total_held_time: 0,
		},
		states: {
			// Read lock and either keep waiting or write & hold
			acquiring: {
				entry: "attemptAcquire",
				on: {
					// "": {
					// 	target: "timed_out",
					// 	cond: "timeoutExceeded",
					// },
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
				// after: {
				// 	WAIT_DELAY: "acquiring",
				// },
			},
			// Wait deterministic time before reading lock
			holding: {
				entry: "resetTotalWaitTime",
				exit: "updateTotalHeldTime",
				on: {
					CHECK_HOLD: "checking",
				},
				// after: {
				// 	HOLD_DELAY: "checking",
				// },
			},
			// read lock to see if we still have it
			// and either keep holding,
			// assume lock is acquired,
			// or go back to waiting if it isn't
			checking: {
				entry: "checkHold",
				on: {
					// Can't auto transition here.
					// We need to do one final checkHold first,
					// and then transition if we still have it.
					ACQUIRED: {
						target: "acquired",
						// cond: "minHoldTime", // TODO: must be a function??
					},
					HOLD: "holding",
					WAIT: "waiting",
				},
			},
			// done!
			acquired: {
				// type: "final",
			},
			timed_out: {
				// type: "final",
			},
		},
	},
	{
		// guards: {
		// 	minHoldTime: (ctx, evt) => ctx.total_held_time >= minHoldTime,
		// 	timeoutExceeded: (ctx, evt) => ctx.total_wait_time > waitTimeout * 1000,
		// },
		// delays: {
		// 	WAIT_DELAY: (ctx, evt) => ctx.wait_time,
		// 	HOLD_DELAY: (ctx, evt) => checkDelay,
		// },
		actions: {
			resetTotalHeldTime: assign({
				total_held_time: 0,
			}),
			updateTotalHeldTime: assign({
				total_held_time: (ctx, evt) => {
					return ctx.total_held_time + checkDelay;
				},
			}),
			setWaitTime: assign({
				wait_time: getWaitTime,
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
			// attemptAcquire() {
			// 	console.log("attemptAcquire");
			// 	// Read lock
			// 	// if held by someone else, send WAIT
			// 	// if held by us, send HOLD
			// 	// if held by no one, write to lock and send HOLD
			// },
			// checkHold() {
			// 	console.log("checkHold");
			// 	// read lock
			// 	// if ours, send HOLD
			// 	// if not ours, send WAIT
			// },
		},
	}
);

const finalStates = ["timed_out", "acquired"];

async function run() {
	const service = interpret(lockMachine);

	service.subscribe(async (state) => {
		console.log("update:", state);
	});

	let lastReadComment;

	// console.log("initial state", service.state);
	service.start();

	loop: while (!finalStates.includes(service.state.value)) {
		let nextEvent = null;

		const state = service.state;
		switch (state.value) {
			case "acquiring": {
				const [lockAcquired, comment] = await attemptAcquire();
				lastReadComment = comment;

				if (lockAcquired) {
					nextEvent = "HOLD";
				} else if (state.context.total_wait_time > waitTimeout * 1000) {
					nextEvent = "TIMEOUT";
				} else {
					nextEvent = "WAIT";
				}

				break;
			}
			case "waiting":
				await sleep(state.context.wait_time);
				nextEvent = "COMPLETE_WAIT";
				break;
			case "holding":
				await sleep(checkDelay);
				nextEvent = "CHECK_HOLD";
				break;
			case "checking": {
				const [lockHeld, comment] = await checkHold(state.context);
				lastReadComment = comment;

				if (lockHeld) {
					if (state.context.total_held_time >= minHoldTime) {
						nextEvent = "ACQUIRED";
					} else {
						nextEvent = "HOLD";
					}
				} else {
					nextEvent = "WAIT";
				}

				break;
			}
			case "acquired":
			case "timed_out":
				console.log(
					`Hmmm... Reach a final state (${state.value}) in loop. This behavior is unexpected`
				);
				break loop;
			default:
				throw new Error(`Unexpected state in state machine: ${state.value}`);
		}

		service.send(nextEvent);
	}

	service.stop();
	console.log("Final state:", service.state);
	console.log("Comment:", lastReadComment);
}

// run();
