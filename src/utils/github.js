/**
 * @param {import('../global').GitHubActionContext} context
 * @param {import('../global').GitHubActionClient} github
 * @returns {Promise<import('../global').WorkflowRunData>}
 */
async function getWorkflowRun(context, github) {
	const workflowRun = await github.actions.getWorkflowRun({
		...context.repo,
		run_id: context.runId,
	});

	return {
		...workflowRun.data,
		workflow_name: context.workflow,
		run_name: `${context.workflow} #${context.runNumber}`,
	};
}

/**
 * @param {import('../global').GitHubActionContext} context
 * @param {import('../global').GitHubActionClient} github
 * @returns {Promise<import('../global').CommitInfo>}
 */
async function getCommit(context, github) {
	// Octokit types are wrong - html_url is returned in GitGetCommitResponseData
	// @ts-ignore
	return github.git
		.getCommit({
			...context.repo,
			commit_sha: context.sha,
		})
		.then((res) => res.data);
}

module.exports = {
	getWorkflowRun,
	getCommit,
};
