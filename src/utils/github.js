/**
 * @param {import('../global').GitHubActionContext} context
 * @returns {import('../global').ActionInfo}
 */
function getActionInfo(context) {
	const e = encodeURIComponent;
	const encodedOwner = e(context.repo.owner);
	const encodedRepo = e(context.repo.repo);
	const encodedWorkflow = e(context.workflow);
	const encodedRunId = e(context.runId);

	return {
		workflow: {
			name: context.workflow,
			runsHtmlUrl: `https://github.com/${encodedOwner}/${encodedRepo}/actions?query=workflow%3A%22${encodedWorkflow}%22`,
		},
		run: {
			id: context.runId,
			number: context.runNumber,
			name: `${context.workflow} #${context.runNumber}`,
			htmlUrl: `https://github.com/${encodedOwner}/${encodedRepo}/actions/runs/${encodedRunId}`,
		},
		job: {
			name: context.job,
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
	getActionInfo,
};
