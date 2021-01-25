/**
 * @param {import('../global').GitHubActionContext} context
 * @param {import('../global').GitHubActionClient} github
 * @param {import('../global').Logger} logger
 * @returns {Promise<import('../global').ActionContexts>}
 */
async function parseContext(context, github, logger) {
	if (context.eventName == "workflow_run") {
		// 1. Validate workflow_run.event
		/** @type {import('../global').WorkflowRunActionContextPayload} */
		// @ts-ignore
		let payload = context.payload;
		if (payload.workflow_run.event !== "pull_request") {
			logger.info(
				"This workflow_run action was not triggered by a pull request event. Doing nothing."
			);
			logger.info("Triggering event name: " + payload.workflow_run.event);
			return null;
		}

		// 2. Determine relevant PR number
		let prs = payload.workflow_run.pull_requests ?? [];
		let headLabel = `${payload.workflow_run.head_repository.owner.login}:${payload.workflow_run.head_branch}`;

		// 2.1. Filter for PRs with matching head_sha
		prs = prs.filter((pr) => pr.head.sha == payload.workflow_run.head_sha);

		if (prs.length !== 1) {
			logger.info(
				"Cannot determine relevant PR based on workflow payload. Querying the GitHub API to try and determine what PR to comment on."
			);

			// 2.2. Search the PR API for matching open PRs if 0 or more than 1
			// matched from the payload (payload doesn't contain open or close state)
			prs = (
				await github.pulls.list({
					owner: context.repo.owner,
					repo: context.repo.repo,
					state: "open",
					head: headLabel,
				})
			).data;
		}

		if (prs.length === 0) {
			throw new Error(
				`This workflow run does not match any PRs. We looked for PRs matching ${headLabel}. Cannot determine which PR to comment on.`
			);
		} else if (prs.length > 1) {
			const prLabels = prs.map((pr) => `#${pr.number}`).join(", ");
			throw new Error(
				`This workflow run matches more than one pull requests: ${prLabels}. We looked for PRs matching ${headLabel}. Cannot determine which PR to comment on.`
			);
		}

		const pr = prs[0];
		logger.info(`Found matching PR: #${pr.number}`);

		// 3. Return the parsed context
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
