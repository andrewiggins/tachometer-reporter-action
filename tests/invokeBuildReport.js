const { defaultInputs } = require("./mocks/actions");
const { defaultActionInfo, fakeCommit } = require("./mocks/github");
const { copyTestResults } = require("./utils");
const { buildReport } = require("../lib/index");

/**
 * @typedef BuildReportParams
 * @property {string} [commitSha]
 * @property {import('../src/global').ActionInfo} [actionInfo]
 * @property {Partial<import('../src/global').Inputs>} [inputs]
 * @property {import('../src/global').TachResults} [results]
 * @property {boolean} [isRunning]
 * @param {BuildReportParams} params
 * @returns {import('../src/global').Report}
 */
function invokeBuildReport({
	commitSha = fakeCommit.sha,
	actionInfo = defaultActionInfo,
	inputs = null,
	results = copyTestResults(),
	isRunning = false,
} = {}) {
	const fullInputs = {
		...defaultInputs,
		...inputs,
	};

	return buildReport(commitSha, actionInfo, fullInputs, results, isRunning);
}

module.exports = {
	invokeBuildReport,
};
