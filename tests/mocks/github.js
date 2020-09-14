//#region Fake Response

// curl -H "Accept: application/vnd.github.v3+json" https://api.github.com/repos/andrewiggins/tachometer-reporter-action/actions/workflows/1850458
const workflow = {
	id: 1850458,
	node_id: "MDg6V29ya2Zsb3cxODUwNDU4",
	name: "Pull Request Test",
	path: ".github/workflows/pr.yml",
	state: "active",
	created_at: "2020-07-10T21:02:12.000Z",
	updated_at: "2020-07-10T21:02:12.000Z",
	url:
		"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/actions/workflows/1850458",
	html_url:
		"https://github.com/andrewiggins/tachometer-reporter-action/blob/master/.github/workflows/pr.yml",
	badge_url:
		"https://github.com/andrewiggins/tachometer-reporter-action/workflows/Pull%20Request%20Test/badge.svg",
};

// curl -H "Accept: application/vnd.github.v3+json" https://api.github.com/repos/andrewiggins/tachometer-reporter-action/actions/runs/166203010
const workflowRun = {
	id: 166203010,
	node_id: "MDExOldvcmtmbG93UnVuMTY2MjAzMDEw",
	head_branch: "initial-implementation",
	head_sha: "b1981b930e913a4b628cde273949a7982d3403c8",
	run_number: 50,
	event: "pull_request",
	status: "completed",
	conclusion: "success",
	workflow_id: 1850458,
	url:
		"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/actions/runs/166203010",
	html_url:
		"https://github.com/andrewiggins/tachometer-reporter-action/actions/runs/166203010",
	pull_requests: [],
	created_at: "2020-07-12T06:08:16Z",
	updated_at: "2020-07-12T06:08:58Z",
	jobs_url:
		"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/actions/runs/166203010/jobs",
	logs_url:
		"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/actions/runs/166203010/logs",
	check_suite_url:
		"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/check-suites/905197750",
	artifacts_url:
		"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/actions/runs/166203010/artifacts",
	cancel_url:
		"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/actions/runs/166203010/cancel",
	rerun_url:
		"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/actions/runs/166203010/rerun",
	workflow_url:
		"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/actions/workflows/1850458",
	head_commit: {
		id: "b1981b930e913a4b628cde273949a7982d3403c8",
		tree_id: "5aa6c42369d92896cecbf5fb3d4ba135adec2ba8",
		message: "Try using markdown to render summary link",
		timestamp: "2020-07-12T06:07:47Z",
		author: {
			name: "Andre Wiggins",
			email: "andrewiggins@live.com",
		},
		committer: {
			name: "Andre Wiggins",
			email: "andrewiggins@live.com",
		},
	},
	repository: {
		id: 278722227,
		node_id: "MDEwOlJlcG9zaXRvcnkyNzg3MjIyMjc=",
		name: "tachometer-reporter-action",
		full_name: "andrewiggins/tachometer-reporter-action",
		private: false,
		owner: {
			login: "andrewiggins",
			id: 459878,
			node_id: "MDQ6VXNlcjQ1OTg3OA==",
			avatar_url: "https://avatars3.githubusercontent.com/u/459878?v=4",
			gravatar_id: "",
			url: "https://api.github.com/users/andrewiggins",
			html_url: "https://github.com/andrewiggins",
			followers_url: "https://api.github.com/users/andrewiggins/followers",
			following_url:
				"https://api.github.com/users/andrewiggins/following{/other_user}",
			gists_url: "https://api.github.com/users/andrewiggins/gists{/gist_id}",
			starred_url:
				"https://api.github.com/users/andrewiggins/starred{/owner}{/repo}",
			subscriptions_url:
				"https://api.github.com/users/andrewiggins/subscriptions",
			organizations_url: "https://api.github.com/users/andrewiggins/orgs",
			repos_url: "https://api.github.com/users/andrewiggins/repos",
			events_url: "https://api.github.com/users/andrewiggins/events{/privacy}",
			received_events_url:
				"https://api.github.com/users/andrewiggins/received_events",
			type: "User",
			site_admin: false,
		},
		html_url: "https://github.com/andrewiggins/tachometer-reporter-action",
		description:
			"Report the results of Polymer/tachometer in a comment for PRs",
		fork: false,
		url: "https://api.github.com/repos/andrewiggins/tachometer-reporter-action",
		forks_url:
			"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/forks",
		keys_url:
			"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/keys{/key_id}",
		collaborators_url:
			"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/collaborators{/collaborator}",
		teams_url:
			"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/teams",
		hooks_url:
			"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/hooks",
		issue_events_url:
			"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/issues/events{/number}",
		events_url:
			"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/events",
		assignees_url:
			"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/assignees{/user}",
		branches_url:
			"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/branches{/branch}",
		tags_url:
			"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/tags",
		blobs_url:
			"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/git/blobs{/sha}",
		git_tags_url:
			"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/git/tags{/sha}",
		git_refs_url:
			"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/git/refs{/sha}",
		trees_url:
			"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/git/trees{/sha}",
		statuses_url:
			"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/statuses/{sha}",
		languages_url:
			"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/languages",
		stargazers_url:
			"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/stargazers",
		contributors_url:
			"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/contributors",
		subscribers_url:
			"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/subscribers",
		subscription_url:
			"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/subscription",
		commits_url:
			"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/commits{/sha}",
		git_commits_url:
			"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/git/commits{/sha}",
		comments_url:
			"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/comments{/number}",
		issue_comment_url:
			"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/issues/comments{/number}",
		contents_url:
			"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/contents/{+path}",
		compare_url:
			"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/compare/{base}...{head}",
		merges_url:
			"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/merges",
		archive_url:
			"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/{archive_format}{/ref}",
		downloads_url:
			"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/downloads",
		issues_url:
			"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/issues{/number}",
		pulls_url:
			"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/pulls{/number}",
		milestones_url:
			"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/milestones{/number}",
		notifications_url:
			"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/notifications{?since,all,participating}",
		labels_url:
			"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/labels{/name}",
		releases_url:
			"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/releases{/id}",
		deployments_url:
			"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/deployments",
	},
	head_repository: {
		id: 278722227,
		node_id: "MDEwOlJlcG9zaXRvcnkyNzg3MjIyMjc=",
		name: "tachometer-reporter-action",
		full_name: "andrewiggins/tachometer-reporter-action",
		private: false,
		owner: {
			login: "andrewiggins",
			id: 459878,
			node_id: "MDQ6VXNlcjQ1OTg3OA==",
			avatar_url: "https://avatars3.githubusercontent.com/u/459878?v=4",
			gravatar_id: "",
			url: "https://api.github.com/users/andrewiggins",
			html_url: "https://github.com/andrewiggins",
			followers_url: "https://api.github.com/users/andrewiggins/followers",
			following_url:
				"https://api.github.com/users/andrewiggins/following{/other_user}",
			gists_url: "https://api.github.com/users/andrewiggins/gists{/gist_id}",
			starred_url:
				"https://api.github.com/users/andrewiggins/starred{/owner}{/repo}",
			subscriptions_url:
				"https://api.github.com/users/andrewiggins/subscriptions",
			organizations_url: "https://api.github.com/users/andrewiggins/orgs",
			repos_url: "https://api.github.com/users/andrewiggins/repos",
			events_url: "https://api.github.com/users/andrewiggins/events{/privacy}",
			received_events_url:
				"https://api.github.com/users/andrewiggins/received_events",
			type: "User",
			site_admin: false,
		},
		html_url: "https://github.com/andrewiggins/tachometer-reporter-action",
		description:
			"Report the results of Polymer/tachometer in a comment for PRs",
		fork: false,
		url: "https://api.github.com/repos/andrewiggins/tachometer-reporter-action",
		forks_url:
			"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/forks",
		keys_url:
			"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/keys{/key_id}",
		collaborators_url:
			"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/collaborators{/collaborator}",
		teams_url:
			"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/teams",
		hooks_url:
			"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/hooks",
		issue_events_url:
			"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/issues/events{/number}",
		events_url:
			"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/events",
		assignees_url:
			"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/assignees{/user}",
		branches_url:
			"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/branches{/branch}",
		tags_url:
			"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/tags",
		blobs_url:
			"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/git/blobs{/sha}",
		git_tags_url:
			"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/git/tags{/sha}",
		git_refs_url:
			"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/git/refs{/sha}",
		trees_url:
			"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/git/trees{/sha}",
		statuses_url:
			"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/statuses/{sha}",
		languages_url:
			"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/languages",
		stargazers_url:
			"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/stargazers",
		contributors_url:
			"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/contributors",
		subscribers_url:
			"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/subscribers",
		subscription_url:
			"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/subscription",
		commits_url:
			"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/commits{/sha}",
		git_commits_url:
			"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/git/commits{/sha}",
		comments_url:
			"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/comments{/number}",
		issue_comment_url:
			"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/issues/comments{/number}",
		contents_url:
			"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/contents/{+path}",
		compare_url:
			"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/compare/{base}...{head}",
		merges_url:
			"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/merges",
		archive_url:
			"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/{archive_format}{/ref}",
		downloads_url:
			"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/downloads",
		issues_url:
			"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/issues{/number}",
		pulls_url:
			"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/pulls{/number}",
		milestones_url:
			"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/milestones{/number}",
		notifications_url:
			"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/notifications{?since,all,participating}",
		labels_url:
			"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/labels{/name}",
		releases_url:
			"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/releases{/id}",
		deployments_url:
			"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/deployments",
	},
};

// Job Data: curl -H "Accept: application/vnd.github.v3+json" https://api.github.com/repos/andrewiggins/tachometer-reporter-action/actions/jobs/862215228
// Job Index: curl -H "Accept: application/vnd.github.v3+json" https://api.github.com/repos/andrewiggins/tachometer-reporter-action/actions/runs/166203010/jobs
const defaultJobInfo = {
	id: 862215228,
	run_id: 166203010,
	run_url:
		"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/actions/runs/166203010",
	node_id: "MDg6Q2hlY2tSdW44NjIyMTUyMjg=",
	head_sha: "b1981b930e913a4b628cde273949a7982d3403c8",
	url:
		"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/actions/jobs/862215228",
	html_url:
		"https://github.com/andrewiggins/tachometer-reporter-action/runs/862215228",
	status: "completed",
	conclusion: "success",
	started_at: "2020-07-12T06:08:31Z",
	completed_at: "2020-07-12T06:08:54Z",
	name: "pr_test",
	steps: [
		{
			name: "Set up job",
			status: "completed",
			conclusion: "success",
			number: 1,
			started_at: "2020-07-12T06:08:31.000Z",
			completed_at: "2020-07-12T06:08:33.000Z",
		},
		{
			name: "Run actions/checkout@v2",
			status: "completed",
			conclusion: "success",
			number: 2,
			started_at: "2020-07-12T06:08:33.000Z",
			completed_at: "2020-07-12T06:08:34.000Z",
		},
		{
			name: "Run actions/setup-node@v1",
			status: "completed",
			conclusion: "success",
			number: 3,
			started_at: "2020-07-12T06:08:34.000Z",
			completed_at: "2020-07-12T06:08:39.000Z",
		},
		{
			name: "Run npm ci",
			status: "completed",
			conclusion: "success",
			number: 4,
			started_at: "2020-07-12T06:08:39.000Z",
			completed_at: "2020-07-12T06:08:53.000Z",
		},
		{
			name: "Run npm test",
			status: "completed",
			conclusion: "success",
			number: 5,
			started_at: "2020-07-12T06:08:53.000Z",
			completed_at: "2020-07-12T06:08:53.000Z",
		},
		{
			name: "Report Tachometer Result",
			status: "completed",
			conclusion: "success",
			number: 6,
			started_at: "2020-07-12T06:08:53.000Z",
			completed_at: "2020-07-12T06:08:54.000Z",
		},
		{
			name: "Post Run actions/checkout@v2",
			status: "completed",
			conclusion: "success",
			number: 12,
			started_at: "2020-07-12T06:08:54.000Z",
			completed_at: "2020-07-12T06:08:54.000Z",
		},
		{
			name: "Complete job",
			status: "completed",
			conclusion: "success",
			number: 13,
			started_at: "2020-07-12T06:08:54.000Z",
			completed_at: "2020-07-12T06:08:54.000Z",
		},
	],
	check_run_url:
		"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/check-runs/862215228",
};

// Job Data: curl -H "Accept: application/vnd.github.v3+json" https://api.github.com/repos/andrewiggins/tachometer-reporter-action/actions/jobs/1114818713
// Job Index: curl -H "Accept: application/vnd.github.v3+json" https://api.github.com/repos/andrewiggins/tachometer-reporter-action/actions/runs/254664657/jobs
const otherJobInfo = {
	id: 1114818713,
	run_id: 254664657,
	run_url:
		"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/actions/runs/254664657",
	node_id: "MDg6Q2hlY2tSdW4xMTE0ODE4NzEz",
	head_sha: "1a4bbc148864b47e88f34af793ec66c4bf6fb7c0",
	url:
		"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/actions/jobs/1114818713",
	html_url:
		"https://github.com/andrewiggins/tachometer-reporter-action/runs/1114818713",
	status: "completed",
	conclusion: "success",
	started_at: "2020-09-14T22:47:59Z",
	completed_at: "2020-09-14T22:48:28Z",
	name: "First Bench Job",
	steps: [
		{
			name: "Set up job",
			status: "completed",
			conclusion: "success",
			number: 1,
			started_at: "2020-09-14T22:47:59.000Z",
			completed_at: "2020-09-14T22:48:02.000Z",
		},
		{
			name: "Pre Report Tachometer Result",
			status: "completed",
			conclusion: "success",
			number: 2,
			started_at: "2020-09-14T22:48:02.000Z",
			completed_at: "2020-09-14T22:48:18.000Z",
		},
		{
			name: "Run actions/checkout@v2",
			status: "completed",
			conclusion: "success",
			number: 3,
			started_at: "2020-09-14T22:48:18.000Z",
			completed_at: "2020-09-14T22:48:18.000Z",
		},
		{
			name:
				"Run # Could use this to simulate benchmark running for random number of seconds",
			status: "completed",
			conclusion: "success",
			number: 4,
			started_at: "2020-09-14T22:48:18.000Z",
			completed_at: "2020-09-14T22:48:18.000Z",
		},
		{
			name: "Report Tachometer Result",
			status: "completed",
			conclusion: "success",
			number: 5,
			started_at: "2020-09-14T22:48:18.000Z",
			completed_at: "2020-09-14T22:48:28.000Z",
		},
		{
			name: "Post Run actions/checkout@v2",
			status: "completed",
			conclusion: "success",
			number: 10,
			started_at: "2020-09-14T22:48:28.000Z",
			completed_at: "2020-09-14T22:48:28.000Z",
		},
		{
			name: "Complete job",
			status: "completed",
			conclusion: "success",
			number: 11,
			started_at: "2020-09-14T22:48:28.000Z",
			completed_at: "2020-09-14T22:48:28.000Z",
		},
	],
	check_run_url:
		"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/check-runs/1114818713",
};

/** @type {import('../../src/global').CommitInfo} */
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

//#endregion

/** @type {import('../../src/global').ActionInfo} */
const defaultActionInfo = {
	workflow: {
		id: workflow.id,
		name: workflow.name,
		runsHtmlUrl:
			"https://github.com/andrewiggins/tachometer-reporter-action/actions?query=workflow%3A%22Pull%20Request%20Test%22",
		srcHtmlUrl: workflow.html_url,
	},
	run: {
		id: workflowRun.id,
		number: workflowRun.run_number,
		name: "Pull Request Test #50",
		htmlUrl: workflowRun.html_url,
	},
	job: {
		id: defaultJobInfo.id,
		name: defaultJobInfo.name,
		index: 2, // Manually faked to be 2 to make tests more interesting
		htmlUrl: defaultJobInfo.html_url,
	},
};

/**
 * @template T
 * @typedef {Partial<import('../../src/global').OctokitResponse<T>>} OctokitResponse
 */

/**
 * Modified from https://stackoverflow.com/a/49936686/2303091 to work with JSDoc
 * @template T
 * @typedef {{ [P in keyof T]?: DeepPartial<T[P]> }} DeepPartial
 */

/**
 * @typedef {DeepPartial<import('../../src/global').CommentData>} Comment
 */

/**
 * @param {{ comments?: Comment[] }} [options]
 */
function createGitHubClient({ comments = [] } = {}) {
	// From the log found in import('./invokeBuildReport').defaultActionInfo.job.htmlUrl
	let id = 656984357;

	/**
	 * @param {{ comment_id: number }} params
	 * @returns {Promise<OctokitResponse<Comment>>}
	 */
	async function getComment({ comment_id }) {
		const comment = comments.find((c) => c.id == comment_id);
		if (!comment) {
			throw new Error(`Could not find comment with id ${comment_id}`);
		}

		return { data: { ...comment } };
	}

	/**
	 * @param {{ comment_id: number; body: string}} params
	 * @returns {Promise<OctokitResponse<Comment>>}
	 */
	async function updateComment({ comment_id, body }) {
		const comment = comments.find((c) => c.id == comment_id);
		if (!comment) {
			throw new Error(`Could not find comment with id ${comment_id}`);
		}

		comment.body = body;
		return { data: { ...comment } };
	}

	/**
	 * @param {{ body: string }} params
	 * @returns {Promise<OctokitResponse<Comment>>}
	 */
	async function createComment({ body }) {
		const comment = { id: id++, body, user: { type: "Bot" } };
		comments.push(comment);
		return { data: { ...comment } };
	}

	/**
	 * @returns {Promise<OctokitResponse<Comment[]>>}
	 */
	async function listComments() {
		return { data: [...comments.map((c) => ({ ...c }))] };
	}

	/**
	 * @returns {Promise<OctokitResponse<import('../../src/global').Commit>>}
	 */
	async function getCommit() {
		return { data: fakeCommit };
	}

	async function getWorkflowRun() {
		return { data: workflowRun };
	}

	async function listJobsForWorkflowRun() {
		throw new Error("Not implemented");
	}

	listJobsForWorkflowRun.endpoint = function (params) {
		const paramsStr = encodeURIComponent(JSON.stringify(params));
		return `mock://github.com/listJobsForWorkflowRun?params=${paramsStr}`;
	};

	async function* paginateIterator(endpoint) {
		if (endpoint.includes("/listJobsForWorkflowRun")) {
			yield { data: [otherJobInfo, defaultJobInfo] };
		} else {
			throw new Error("Not implemented");
		}
	}

	async function request({ url }) {
		if (url == workflowRun.workflow_url) {
			return { data: workflow };
		} else {
			throw new Error("Not implemented");
		}
	}

	return {
		request,
		paginate: {
			iterator: paginateIterator,
		},
		actions: {
			getWorkflowRun,
			listJobsForWorkflowRun,
		},
		issues: {
			listComments,
			createComment,
			getComment,
			updateComment,
		},
		git: {
			getCommit,
		},
	};
}

module.exports = {
	defaultActionInfo,
	fakeCommit,
	createGitHubClient,
};
