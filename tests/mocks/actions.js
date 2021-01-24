const { testRoot } = require("../utils");
const { defaultActionInfo, fakeCommit } = require("./github");

const prBenchName = "local-framework";
const baseBenchName = "base-framework";
const defaultInputs = Object.freeze({
	path: testRoot("results/test-results.json"),
	reportId: null,
	prBenchName,
	baseBenchName,
	summarize: true,
	defaultOpen: false,
	keepOldResults: false,
});

/** @type {import('../../src/global').Logger} */
const testLogger = {
	debug() {},
	info() {},
	warn() {},
	startGroup() {},
	endGroup() {},
};

/**
 * @type {import('../../src/global').GitHubActionContext}
 */
const fakeGitHubContext = {
	payload: null,
	eventName: "pull_request",
	sha: fakeCommit.sha,
	ref: "context.ref",
	workflow: defaultActionInfo.workflow.name,
	action: "context.action",
	actor: "context.actor",
	job: defaultActionInfo.job.name,
	runNumber: defaultActionInfo.run.number,
	runId: defaultActionInfo.run.id,
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

module.exports = {
	defaultInputs,
	fakeGitHubContext,
	testLogger,
};
