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

/** @type {import('../src/global').ActionInfo} */
const defaultActionInfo = {
	// curl -H "Accept: application/vnd.github.v3+json" https://api.github.com/repos/andrewiggins/tachometer-reporter-action/actions/workflows/1850458
	workflow: {
		id: 1850458,
		name: "Pull Request Test",
		runsHtmlUrl:
			"https://github.com/andrewiggins/tachometer-reporter-action/actions?query=workflow%3A%22Pull+Request+Test%22",
		srcHtmlUrl:
			"https://github.com/andrewiggins/tachometer-reporter-action/blob/master/.github/workflows/pr.yml",
	},
	// curl -H "Accept: application/vnd.github.v3+json" https://api.github.com/repos/andrewiggins/tachometer-reporter-action/actions/runs/166203010
	run: {
		id: 166203010,
		number: 50,
		name: "Pull Request Test #50",
	},
	// Job Data: curl -H "Accept: application/vnd.github.v3+json" https://api.github.com/repos/andrewiggins/tachometer-reporter-action/actions/jobs/862215228
	// Job Index: curl -H "Accept: application/vnd.github.v3+json" https://api.github.com/repos/andrewiggins/tachometer-reporter-action/actions/runs/166203010/jobs
	job: {
		id: 862215228,
		name: "pr_test",
		index: 2, // Manually faked to be 2 to make tests more interesting
		htmlUrl:
			"https://github.com/andrewiggins/tachometer-reporter-action/runs/862215228",
	},
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
 * @property {import('../src/global').ActionInfo} [actionInfo]
 * @property {Partial<import('../src/global').Inputs>} [inputs]
 * @property {import('../src/global').TachResults} [results]
 * @property {boolean} [isRunning]
 * @param {BuildReportParams} params
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
	defaultInputs,
	defaultActionInfo,
	invokeBuildReport,
};
