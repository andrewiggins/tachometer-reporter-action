/**
 * @param {import('../global').GitHubActionContext} context
 * @param {import('../global').Logger} logger
 * @returns {import('../global').ActionContexts}
 */
function parseContext(context, logger) {
	if (context.eventName == "workflow_run") {
		/** @type {import('../global').WorkflowRunActionContextPayload} */
		// @ts-ignore
		let payload = context.payload;
		if (payload.workflow_run.event !== "pull_request") {
			logger.info(
				"This workflow_run action was not triggered by a pull request event. Doing nothing."
			);
			logger.info("Triggering event name: " + payload.workflow_run.event);
			return null;
		} else if (
			payload.workflow_run.pull_requests == null ||
			payload.workflow_run.pull_requests.length == 0
		) {
			logger.warn(
				"The workflow_run payload does not reference any pull requests. Doing nothing."
			);
			return null;
		}

		const prs = payload.workflow_run.pull_requests;
		const pr = prs[0];
		if (prs.length > 1) {
			logger.warn(
				`The workflow_run payload references more than one pull requests (${prs.length}). Assuming the first one is the pull_request (#${pr.number}) to post results to.`
			);
		}

		return {
			benchmark: getActionInfo({
				repo: context.repo,
				workflow: payload.workflow.name,
				runId: payload.workflow_run.id,
				runNumber: payload.workflow_run.run_number,
				job: null,
			}),
			reporting: getActionInfo(context),
			pr: {
				owner: context.repo.owner,
				repo: context.repo.repo,
				number: pr.number,
				sha: pr.head.sha,
			},
		};
	} else if (context.eventName == "pull_request") {
		// If this action is running in a pull_request event, we'll assume the
		// benchmarks were also run in this workflow
		let actionInfo = getActionInfo(context);
		return {
			benchmark: actionInfo,
			reporting: actionInfo,
			pr: {
				owner: context.repo.owner,
				repo: context.repo.repo,
				number: context.issue.number,
				sha: context.sha,
			},
		};
	} else {
		logger.info(
			"Not a pull_request or workflow_run event. Skipping this action and doing nothing."
		);
		logger.info("Event name: " + context.eventName);
		return null;
	}
}

/**
 * @typedef {Pick<import('../global').GitHubActionContext, "repo" | "workflow" | "runId" | "runNumber" | "job">} RelevantGitHubContext
 * @param {RelevantGitHubContext} context
 * @returns {import('../global').ActionInfo}
 */
function getActionInfo({
	repo: { owner, repo },
	workflow,
	runId,
	runNumber,
	job,
}) {
	const encodedOwner = encodeURIComponent(owner);
	const encodedRepo = encodeURIComponent(repo);
	const encodedWorkflow = encodeURIComponent(workflow);
	const encodedRunId = encodeURIComponent(runId);

	return {
		workflow: {
			name: workflow,
			runsHtmlUrl: `https://github.com/${encodedOwner}/${encodedRepo}/actions?query=workflow%3A%22${encodedWorkflow}%22`,
		},
		run: {
			id: runId,
			number: runNumber,
			name: `${workflow} #${runNumber}`,
			htmlUrl: `https://github.com/${encodedOwner}/${encodedRepo}/actions/runs/${encodedRunId}`,
		},
		job: {
			name: job,
		},
	};
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
	parseContext,
};
