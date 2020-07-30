/** @type {import('../../src/global').ActionInfo} */
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

	return {
		issues: {
			listComments,
			createComment,
			getComment,
			updateComment,
		},
	};
}

module.exports = {
	defaultActionInfo,
	fakeCommit,
	createGitHubClient,
};
