/**
 * @param {import('../global').GitHubActionContext} context
 * @param {import('../global').GitHubActionClient} github
 * @param {import('../global').Logger} logger
 * @returns {AsyncIterableIterator<import('../global').WorkflowRunJob>}
 */
async function* getWorkflowJobs(context, github, logger) {
	// https://docs.github.com/en/rest/reference/actions#list-jobs-for-a-workflow-run
	/** @type {Record<string, string | number>} */
	const params = { ...context.repo, run_id: context.runId };

	const endpoint = github.actions.listJobsForWorkflowRun.endpoint(params);

	/** @type {import('../global').WorkflowRunJobsAsyncIterator} */
	const iterator = github.paginate.iterator(endpoint);
	for await (const page of iterator) {
		if (page.status > 299) {
			throw new Error(
				`Non-success error code returned for workflow runs: ${page.status}`
			);
		}

		yield* page.data;
	}
}

/**
 * @param {import('../global').GitHubActionContext} context
 * @param {import('../global').GitHubActionClient} github
 * @param {import('../global').Logger} logger
 * @returns {Promise<import('../global').WorkflowRunInfo>}
 */
async function getWorkflowRunInfo(context, github, logger) {
	const workflowName = context.workflow;
	const workflowRunName = `${context.workflow} #${context.runNumber}`;

	const run = await github.actions.getWorkflowRun({
		...context.repo,
		run_id: context.runId,
	});

	/** @type {import('@octokit/types').ActionsGetWorkflowResponseData} */
	const workflow = (
		await github.request({
			url: run.data.workflow_url,
		})
	).data;

	const e = encodeURIComponent;
	const workflowSrcHtmlUrl = workflow.html_url;
	const workflowRunsHtmlUrl = `https://github.com/${e(context.repo.owner)}/${e(
		context.repo.repo
	)}/actions?query=workflow%3A%22${e(workflow.name)}%22`;

	/** @type {import('../global').WorkflowRunJob} */
	let matchingJob;

	/** @type {number} */
	let jobIndex;

	let i = 0;
	for await (const job of getWorkflowJobs(context, github, logger)) {
		if (job.name == context.job) {
			matchingJob = job;
			jobIndex = i;
			break;
		}

		i++;
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
			workflowName,
			workflowRunsHtmlUrl,
			workflowSrcHtmlUrl,
			workflowRunName,
			jobIndex: null,
			jobHtmlUrl: run.data.html_url,
		};
	}

	return {
		workflowName,
		workflowRunsHtmlUrl,
		workflowSrcHtmlUrl,
		workflowRunName,
		jobIndex,
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
