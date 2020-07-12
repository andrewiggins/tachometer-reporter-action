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

module.exports = {
	getWorkflowRun,
};
