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
	let run;
	try {
		run = (
			await github.actions.getWorkflowRun({
				...context.repo,
				run_id: context.runId,
			})
		).data;
	} catch (e) {
		logger.info(`Requesting workflow run failed: ` + e.stack);
	}

	/** @type {import('@octokit/types').ActionsGetWorkflowResponseData} */
	let workflow;
	try {
		if (run?.workflow_url) {
			workflow = (
				await github.request({
					url: run?.workflow_url,
				})
			).data;
		}
	} catch (e) {
		logger.info(`Requesting workflow info failed: ` + e.stack);
	}

	const e = encodeURIComponent;
	const workflowRunsHtmlUrl = `https://github.com/${e(context.repo.owner)}/${e(
		context.repo.repo
	)}/actions?query=workflow%3A%22${e(context.workflow)}%22`;

	/** @type {import('../global').WorkflowRunJob} */
	let matchingJob;

	/** @type {number | undefined} */
	let jobIndex;

	try {
		let i = 0;
		for await (const job of getWorkflowJobs(context, github, logger)) {
			if (job.name == context.job) {
				matchingJob = job;
				jobIndex = i;
				break;
			}

			i++;
		}
	} catch (e) {
		logger.info(`Requesting workflow jobs failed: ` + e.stack);
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
			id: workflow?.id,
			name: context.workflow, // Also: workflow.name
			srcHtmlUrl: workflow?.html_url,
			runsHtmlUrl: workflowRunsHtmlUrl,
		},
		run: {
			id: context.runId,
			number: context.runNumber,
			name: `${context.workflow} #${context.runNumber}`,
			htmlUrl: run?.html_url,
		},
		job: {
			id: matchingJob?.id,
			name: matchingJob?.name ?? context.job,
			htmlUrl: matchingJob?.html_url ?? run?.html_url,
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

/**
 * Create a status check, and return a function that updates (completes) it.
 * @param {import('../global').GitHubActionClient} github
 * @param {import('../global').GitHubActionContext} context
 */
/* c8 ignore next 18 */
async function createCheck(github, context) {
	const check = await github.checks.create({
		...context.repo,
		name: "Tachometer Benchmarks",
		head_sha: context.payload.pull_request.head.sha,
		status: "in_progress",
	});

	return async (details) => {
		await github.checks.update({
			...context.repo,
			check_run_id: check.data.id,
			completed_at: new Date().toISOString(),
			status: "completed",
			...details,
		});
	};
}

module.exports = {
	getActionInfo,
	getCommit,
};
