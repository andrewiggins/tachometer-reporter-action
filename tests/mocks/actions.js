const { testRoot } = require("../utils");
const {
	defaultActionInfo,
	fakeCommit,
	fakeWorkflow,
	fakeWorkflowRun,
} = require("./github");

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
const fakePullRequestContext = {
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

/** @type {import('../../src/global').WorkflowRunActionContextPayload} */
const fakeWorkflowRunPayload = {
	action: "completed",
	workflow: fakeWorkflow,
	workflow_run: fakeWorkflowRun,
	repository: /** @type {any} */ ({}),
	sender: /** @type {any} */ ({}),
};

/** @type {import('../../src/global').PRContext} */
const fakePRContext = {
	owner: fakePullRequestContext.repo.owner,
	repo: fakePullRequestContext.repo.repo,
	number: fakePullRequestContext.issue.number,
	sha: fakePullRequestContext.sha,
};

module.exports = {
	defaultInputs,
	fakeWorkflowRunPayload,
	fakePullRequestContext,
	fakePRContext,
	testLogger,
};
