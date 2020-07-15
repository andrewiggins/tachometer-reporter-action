const core = require("@actions/core");
const github = require("@actions/github");
const { getWorkflowRun } = require("../utils/github");

(async function () {
	// TODO: Render `Running...` status at start of job and setup general
	// structure of comment including Summary and Results section
	//    - might need to add a label/id input values so we can update comments
	//      before we have results

	const token = core.getInput("github-token", { required: true });
	const reportId = core.getInput("report-id", { required: false });

	core.debug("Running pre tachometer-reporter-action...");
	core.debug("Report ID: " + JSON.stringify(reportId));
	// core.debug("Context: " + JSON.stringify(github.context, undefined, 2));

	const context = github.context;
	const octokit = github.getOctokit(token);
	const workflowRun = await getWorkflowRun(context, octokit);

	core.debug("Run name: " + workflowRun.run_name);
	core.debug("Run URL : " + workflowRun.html_url);
})();
