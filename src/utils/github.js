/**
 * @param {import('../global').GitHubActionContext} context
 * @param {import('../global').GitHubActionClient} github
 * @param {import('../global').Logger} logger
 * @returns {Promise<import('../global').WorkflowRunInfo>}
 */
async function getWorkflowRunInfo(context, github, logger) {
	const workflowRunName = `${context.workflow} #${context.runNumber}`;

	/** @type {import('../global').WorkflowRunJob} */
	let matchingJob;

	// https://docs.github.com/en/rest/reference/actions#list-jobs-for-a-workflow-run
	/** @type {Record<string, string | number>} */
	const params = { ...context.repo, run_id: context.runId };

	const endpoint = github.actions.listJobsForWorkflowRun.endpoint(params);

	/** @type {import('../global').WorkflowRunJobsAsyncIterator} */
	const iterator = github.paginate.iterator(endpoint);
	paging: for await (const page of iterator) {
		if (page.status > 299) {
			throw new Error(
				`Non-success error code returned for workflow runs: ${page.status}`
			);
		}

		for (let job of page.data) {
			if (job.name == context.job) {
				matchingJob = job;
				break paging;
			}
		}
	}

	if (matchingJob == null) {
		logger.warn(
			`Could not find job matching the name ${context.job} for workflow run ${context.runId}.`
		);
		const run = await github.actions.getWorkflowRun({
			...context.repo,
			run_id: context.runId,
		});

		return {
			workflowRunName,
			jobHtmlUrl: run.data.html_url,
		};
	}

	return {
		workflowRunName,
		jobHtmlUrl: matchingJob.html_url,
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
	getWorkflowRunInfo,
	getCommit,
};
