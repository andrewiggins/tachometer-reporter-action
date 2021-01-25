//#region Fake Response

// curl -H "Accept: application/vnd.github.v3+json" https://api.github.com/repos/andrewiggins/tachometer-reporter-action/actions/workflows/5202306
/** @type {import('../../src/global').Workflow} */
const fakeWorkflow = {
	id: 5202306,
	node_id: "MDg6V29ya2Zsb3c1MjAyMzA2",
	// name: "PR Artifacts Multi-Measurement Setup Job Flow",
	name: "Pull Request Test", // Override actual value so tests are easier to maintain
	path: ".github/workflows/pr-artifacts-flow.yml",
	state: "active",
	created_at: "2021-01-22T00:44:50.000Z",
	updated_at: "2021-01-22T00:44:50.000Z",
	url:
		"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/actions/workflows/5202306",
	html_url:
		"https://github.com/andrewiggins/tachometer-reporter-action/blob/main/.github/workflows/pr-artifacts-flow.yml",
	badge_url:
		"https://github.com/andrewiggins/tachometer-reporter-action/workflows/PR%20Artifacts%20Multi-Measurement%20Setup%20Job%20Flow/badge.svg",
};

// curl -H "Accept: application/vnd.github.v3+json" https://api.github.com/repos/andrewiggins/tachometer-reporter-action/actions/runs/506256195
/** @type {import('../../src/global').WorkflowRun} */
const fakeWorkflowRun = {
	id: 506256195,
	// name: "PR Artifacts Multi-Measurement Setup Job Flow",
	name: "Pull Request Test", // Override actual value so tests are easier to maintain
	node_id: "MDExOldvcmtmbG93UnVuNTA2MjU2MTk1",
	head_branch: "test-pr",
	head_sha: "a70706dc304819dcaca4e1859117817973bf0a7c",
	// run_number: 10,
	run_number: 50, // Override actual value so tests are easier to maintain
	event: "pull_request",
	status: "completed",
	conclusion: "success",
	workflow_id: 5202306,
	// check_suite_id: 1886652898,
	// check_suite_node_id: "MDEwOkNoZWNrU3VpdGUxODg2NjUyODk4",
	url:
		"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/actions/runs/506256195",
	html_url:
		"https://github.com/andrewiggins/tachometer-reporter-action/actions/runs/506256195",
	pull_requests: [
		{
			url:
				"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/pulls/43",
			id: 560481270,
			number: 43,
			head: {
				ref: "test-pr",
				sha: "a70706dc304819dcaca4e1859117817973bf0a7c",
				repo: {
					id: 278722227,
					url:
						"https://api.github.com/repos/andrewiggins/tachometer-reporter-action",
					name: "tachometer-reporter-action",
				},
			},
			base: {
				ref: "main",
				sha: "169ac424fcfdf0b0a88d7218ec23f1d3ba3ecc8d",
				repo: {
					id: 278722227,
					url:
						"https://api.github.com/repos/andrewiggins/tachometer-reporter-action",
					name: "tachometer-reporter-action",
				},
			},
		},
	],
	created_at: "2021-01-23T20:04:18Z",
	updated_at: "2021-01-23T20:59:59Z",
	jobs_url:
		"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/actions/runs/506256195/jobs",
	logs_url:
		"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/actions/runs/506256195/logs",
	check_suite_url:
		"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/check-suites/1886652898",
	artifacts_url:
		"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/actions/runs/506256195/artifacts",
	cancel_url:
		"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/actions/runs/506256195/cancel",
	rerun_url:
		"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/actions/runs/506256195/rerun",
	workflow_url:
		"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/actions/workflows/5202306",
	head_commit: {
		id: "a70706dc304819dcaca4e1859117817973bf0a7c",
		tree_id: "9a8742b0aee03f4e1903491978f30d2b5a65c9af",
		message: "Trigger PR action run: main",
		timestamp: "2021-01-23T20:04:08Z",
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
			avatar_url: "https://avatars.githubusercontent.com/u/459878?v=4",
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
			avatar_url: "https://avatars.githubusercontent.com/u/459878?v=4",
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

// Job Data: curl -H "Accept: application/vnd.github.v3+json" https://api.github.com/repos/andrewiggins/tachometer-reporter-action/actions/jobs/1755125478
// Job Index: curl -H "Accept: application/vnd.github.v3+json" https://api.github.com/repos/andrewiggins/tachometer-reporter-action/actions/runs/506256195/jobs
const defaultJobInfo = {
	id: 1755125478,
	run_id: 506256195,
	run_url:
		"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/actions/runs/506256195",
	node_id: "MDg6Q2hlY2tSdW4xNzU1MTI1NDc4",
	head_sha: "a70706dc304819dcaca4e1859117817973bf0a7c",
	url:
		"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/actions/jobs/1755125478",
	html_url:
		"https://github.com/andrewiggins/tachometer-reporter-action/runs/1755125478",
	status: "completed",
	conclusion: "success",
	started_at: "2021-01-23T20:59:45Z",
	completed_at: "2021-01-23T20:59:55Z",
	name: "Report Results",
	steps: [
		{
			name: "Set up job",
			status: "completed",
			conclusion: "success",
			number: 1,
			started_at: "2021-01-23T20:59:45.000Z",
			completed_at: "2021-01-23T20:59:48.000Z",
		},
		{
			name: "Pre Report Tachometer Results",
			status: "completed",
			conclusion: "success",
			number: 2,
			started_at: "2021-01-23T20:59:48.000Z",
			completed_at: "2021-01-23T20:59:49.000Z",
		},
		{
			name: "Run actions/download-artifact@v2",
			status: "completed",
			conclusion: "success",
			number: 3,
			started_at: "2021-01-23T20:59:49.000Z",
			completed_at: "2021-01-23T20:59:49.000Z",
		},
		{
			name: "Run ls -al",
			status: "completed",
			conclusion: "success",
			number: 4,
			started_at: "2021-01-23T20:59:49.000Z",
			completed_at: "2021-01-23T20:59:49.000Z",
		},
		{
			name: "Run ls -al results",
			status: "completed",
			conclusion: "success",
			number: 5,
			started_at: "2021-01-23T20:59:49.000Z",
			completed_at: "2021-01-23T20:59:49.000Z",
		},
		{
			name: "Report Tachometer Results",
			status: "completed",
			conclusion: "success",
			number: 6,
			started_at: "2021-01-23T20:59:49.000Z",
			completed_at: "2021-01-23T20:59:55.000Z",
		},
		{
			name: "Complete job",
			status: "completed",
			conclusion: "success",
			number: 7,
			started_at: "2021-01-23T20:59:55.000Z",
			completed_at: "2021-01-23T20:59:55.000Z",
		},
	],
	check_run_url:
		"https://api.github.com/repos/andrewiggins/tachometer-reporter-action/check-runs/1755125478",
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
		// id: workflow.id,
		name: fakeWorkflow.name,
		runsHtmlUrl:
			"https://github.com/andrewiggins/tachometer-reporter-action/actions?query=workflow%3A%22Pull%20Request%20Test%22",
		// srcHtmlUrl: workflow.html_url,
	},
	run: {
		id: fakeWorkflowRun.id,
		number: fakeWorkflowRun.run_number,
		name: "Pull Request Test #50",
		htmlUrl: fakeWorkflowRun.html_url,
	},
	job: {
		// id: defaultJobInfo.id,
		name: defaultJobInfo.name,
		// index: 2, // Manually faked to be 2 to make tests more interesting
		// htmlUrl: defaultJobInfo.html_url,
	},
};

/**
 * @template T
 * @typedef {Partial<import("@octokit/types").OctokitResponse<T>>} OctokitResponse
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
 * @typedef GithubClientInitialData
 * @property {Comment[]} [comments]
 * @property {typeof fakeWorkflow | Error} [workflowData]
 * @property {typeof fakeWorkflowRun | Error} [runData]
 * @property {Array<typeof defaultJobInfo> | Error} [runJobs]
 *
 * @param {GithubClientInitialData} [options]
 */
function createGitHubClient({
	comments = [],
	workflowData = fakeWorkflow,
	runData = fakeWorkflowRun,
	runJobs = [otherJobInfo, defaultJobInfo],
} = {}) {
	// From the log found in defaultActionInfo.job.htmlUrl
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

	async function getCommit() {
		return { data: fakeCommit };
	}

	async function getWorkflowRun() {
		if (runData instanceof Error) {
			throw runData;
		}

		return { data: runData };
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
			if (runJobs instanceof Error) {
				throw runJobs;
			}

			yield { data: runJobs };
		} else {
			throw new Error("Not implemented");
		}
	}

	async function request({ url }) {
		if (url == fakeWorkflowRun.workflow_url) {
			if (workflowData instanceof Error) {
				throw workflowData;
			}

			return { data: workflowData };
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
	fakeWorkflow,
	fakeWorkflowRun,
	fakeCommit,
	createGitHubClient,
};
