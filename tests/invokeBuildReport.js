const { testRoot, copyTestResults } = require("./utils");
const { buildReport } = require("../lib/index");

const prBenchName = "local-framework";
const baseBenchName = "base-framework";
const defaultInputs = Object.freeze({
	path: testRoot("results/test-results.json"),
	reportId: null,
	prBenchName,
	baseBenchName,
	defaultOpen: false,
	keepOldResults: false,
});

/** @type {import('../src/global').WorkflowRunInfo} */
const defaultWorkflowInfo = {
	workflowName: "Pull Request Test",
	workflowRunName: "Pull Request Test #50",
	workflowSrcHtmlUrl:
		"https://github.com/andrewiggins/tachometer-reporter-action/blob/master/.github/workflows/pr.yml",
	workflowRunsHtmlUrl:
		"https://github.com/andrewiggins/tachometer-reporter-action/actions?query=workflow%3A%22Pull+Request+Test%22",
	runNumber: 4,
	jobIndex: 2,
	jobHtmlUrl:
		"https://github.com/andrewiggins/tachometer-reporter-action/runs/862224869?check_suite_focus=true",
};

/** @type {import('../src/global').CommitInfo} */
const fakeCommit = {
	sha: "626e78c2446b8d1afc917fc9b0059aa65cc9a07d",
	node_id:
		"MDY6Q29tbWl0Mjc4NzIyMjI3OjYyNmU3OGMyNDQ2YjhkMWFmYzkxN2ZjOWIwMDU5YWE2NWNjOWEwN2Q=",
	url:
		"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/git/commits/626e78c2446b8d1afc917fc9b0059aa65cc9a07d",
	html_url:
		"https://github.com/andrewiggins/tachometer-reporter-action/commit/626e78c2446b8d1afc917fc9b0059aa65cc9a07d",
	author: {
		name: "Andre Wiggins",
		email: "author@email.com",
		date: "2020-07-15T07:22:26Z",
	},
	committer: {
		name: "Andre Wiggins",
		email: "committer@email.com",
		date: "2020-07-15T07:22:26Z",
	},
	tree: {
		sha: "860ccb10b8f2866599fb3a1256ce65bfea59589b",
		url:
			"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/git/trees/860ccb10b8f2866599fb3a1256ce65bfea59589b",
	},
	message: "Fill in readme",
	parents: [
		{
			sha: "e14f6dfcaca042ac8fa174d96afa9fabe0e0516b",
			url:
				"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/git/commits/e14f6dfcaca042ac8fa174d96afa9fabe0e0516b",
			// html_url: "https://github.com/andrewiggins/tachometer-reporter-action/commit/e14f6dfcaca042ac8fa174d96afa9fabe0e0516b",
		},
	],
	verification: {
		verified: false,
		reason: "unsigned",
		signature: null,
		payload: null,
	},
};

/**
 * @typedef BuildReportParams
 * @property {import('../src/global').CommitInfo} [commit]
 * @property {import('../src/global').WorkflowRunInfo} [workflow]
 * @property {Partial<import('../src/global').Inputs>} [inputs]
 * @property {import('../src/global').TachResults} [results]
 * @property {boolean} [isRunning]
 * @param {BuildReportParams} params
 */
function invokeBuildReport({
	commit = fakeCommit,
	workflow = defaultWorkflowInfo,
	inputs = null,
	results = copyTestResults(),
	isRunning = false,
} = {}) {
	const fullInputs = {
		...defaultInputs,
		...inputs,
	};

	return buildReport(commit, workflow, fullInputs, results, isRunning);
}

module.exports = {
	defaultInputs,
	defaultWorkflowInfo,
	invokeBuildReport,
};
