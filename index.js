const defaultLogger = {
	warn(getMsg) {
		console.warn(getMsg);
	},
	info(getMsg) {
		console.log(getMsg);
	},
	debug() {},
};

/**
 * @typedef {ReturnType<typeof import('@actions/github').getOctokit>} GitHubActionClient
 * @typedef {typeof import('@actions/github').context} GitHubActionContext
 * @typedef {{ path: string; }} Inputs
 * @typedef {{ warn(msg: string): void; info(msg: string): void; debug(getMsg: () => string): void; }} Logger
 *
 * @param {GitHubActionClient} client
 * @param {GitHubActionContext} context
 * @param {Inputs} inputs
 * @param {Logger} [log]
 */
function reportTachResults(client, context, inputs, log = defaultLogger) {
	log.info("[reportTachResults] Testing... 1.. 2.. Is this thing on?");
}

module.exports = {
	reportTachResults,
};
