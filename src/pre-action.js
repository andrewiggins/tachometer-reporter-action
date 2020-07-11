const core = require("@actions/core");
const github = require("@actions/github");

(async function () {
	const token = core.getInput("github-token", { required: true });
	const reportId = core.getInput("report-id", { required: false });

	core.debug("Running pre tachometer-reporter-action...");
	core.debug("Report ID: " + JSON.stringify(reportId));
	// core.debug("Context: " + JSON.stringify(github.context, undefined, 2));

	const context = github.context;
	const octokit = github.getOctokit(token);
	const workflowRun = await octokit.actions.getWorkflowRun({
		...context.repo,
		run_id: context.runId,
	});

	core.debug("Run name: " + `${context.workflow} #${context.runNumber}`);
	core.debug("Run URL : " + workflowRun.data.html_url);
})();
