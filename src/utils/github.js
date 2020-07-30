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

		logger.debug(() => {
			return (
				`Workflow Jobs (run id: ${context.runId}): ` +
				JSON.stringify(page.data, null, 2)
			);
		});

		yield* page.data;
	}
}

/**
 * @param {import('../global').GitHubActionContext} context
 * @param {import('../global').GitHubActionClient} github
 * @param {import('../global').Logger} logger
 * @returns {Promise<import('../global').ActionInfo>}
 */
async function getActionInfo(context, github, logger) {
	const run = (
		await github.actions.getWorkflowRun({
			...context.repo,
			run_id: context.runId,
		})
	).data;

	/** @type {import('@octokit/types').ActionsGetWorkflowResponseData} */
	const workflow = (
		await github.request({
			url: run.workflow_url,
		})
	).data;

	const e = encodeURIComponent;
	const workflowRunsHtmlUrl = `https://github.com/${e(context.repo.owner)}/${e(
		context.repo.repo
	)}/actions?query=workflow%3A%22${e(workflow.name)}%22`;

	/** @type {import('../global').WorkflowRunJob} */
	let matchingJob;

	/** @type {number | undefined} */
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
		logger.info(
			`Could not find job matching the name "${context.job}" for workflow run ${context.runId}. ` +
				`This happens when the job name is overridden in the workflow YAML file. ` +
				`Links to this job's logs will not be rendered.`
		);
	}

	return {
		workflow: {
			id: workflow.id,
			name: workflow.name, // Also: context.workflow,
			srcHtmlUrl: workflow.html_url,
			runsHtmlUrl: workflowRunsHtmlUrl,
		},
		run: {
			id: context.runId,
			number: context.runNumber,
			name: `${context.workflow} #${context.runNumber}`,
			htmlUrl: run.html_url,
		},
		job: {
			id: matchingJob?.id,
			name: matchingJob?.name ?? context.job,
			htmlUrl: matchingJob?.html_url ?? run.html_url,
			index: jobIndex,
		},
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
	getActionInfo,
	getCommit,
};
