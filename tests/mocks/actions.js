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

/** @type {import('../../src/global').WorkflowRunGitHubActionContext} */
const fakeCompletedWorkflowRunContext = {
	eventName: "workflow_run",
	payload: {
		action: "completed",
		workflow: fakeWorkflow,
		workflow_run: fakeWorkflowRun,
		repository: /** @type {any} */ ({}),
		sender: /** @type {any} */ ({}),
	},
	sha: fakeWorkflowRun.pull_requests[0].base.sha,
	ref: "context.ref",
	workflow: "Workflow Run Example",
	action: "context.action",
	actor: "context.actor",
	job: "Report Tachometer Results in a workflow_run",
	runNumber: 3,
	runId: 12345,
	repo: {
		owner: "andrewiggins",
		repo: "tachometer-reporter-action",
	},
	issue: {
		owner: "andrewiggins",
		repo: "tachometer-reporter-action",
		number: null,
	},
};

/** @type {import('../../src/global').WorkflowRunGitHubActionContext} */
const fakeRequestedWorkflowRunContext = {
	eventName: "workflow_run",
	payload: {
		action: "requested",
		workflow: fakeWorkflow,
		workflow_run: {
			...fakeWorkflowRun,
			status: "queued",
			conclusion: null,
		},
		repository: /** @type {any} */ ({}),
		sender: /** @type {any} */ ({}),
	},
	sha: fakeWorkflowRun.pull_requests[0].base.sha,
	ref: "context.ref",
	workflow: "Workflow Run Example",
	action: "context.action",
	actor: "context.actor",
	job: "Report Tachometer Results in a workflow_run",
	runNumber: 3,
	runId: 12345,
	repo: {
		owner: "andrewiggins",
		repo: "tachometer-reporter-action",
	},
	issue: {
		owner: "andrewiggins",
		repo: "tachometer-reporter-action",
		number: null,
	},
};

/** @type {import('../../src/global').WorkflowRunGitHubActionContext} */
const fakePushContext = {
	eventName: "push",
	payload: /** @type {any} */ ({}),
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
		number: null,
	},
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
	fakePullRequestContext,
	fakePushContext,
	fakeCompletedWorkflowRunContext,
	fakeRequestedWorkflowRunContext,
	fakePRContext,
	testLogger,
};
