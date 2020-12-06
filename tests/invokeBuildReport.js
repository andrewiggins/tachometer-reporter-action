const { defaultInputs } = require("./mocks/actions");
const { defaultActionInfo, fakeCommit } = require("./mocks/github");
const { copyTestResults } = require("./utils");
const { buildReport } = require("../lib/index");

/**
 * @typedef BuildReportParams
 * @property {import('../src/global').CommitInfo} [commit]
 * @property {import('../src/global').ActionInfo} [actionInfo]
 * @property {Partial<import('../src/global').Inputs>} [inputs]
 * @property {import('../src/global').TachResults} [results]
 * @property {boolean} [isRunning]
 * @param {BuildReportParams} params
 * @returns {import('../src/global').Report}
 */
function invokeBuildReport({
	commit = fakeCommit,
	actionInfo = defaultActionInfo,
	inputs = null,
	results = copyTestResults(),
	isRunning = false,
} = {}) {
	const fullInputs = {
		...defaultInputs,
		...inputs,
	};

	return buildReport(commit, actionInfo, fullInputs, results, isRunning);
}

module.exports = {
	invokeBuildReport,
};
