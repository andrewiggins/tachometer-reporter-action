const core = require("@actions/core");
const github = require("@actions/github");
const { getWorkflowRun } = require("../utils/github");
const { postOrUpdateComment } = require("../comments");
const { getLogger, getInputs } = require("./util");

(async function () {
	// TODO: Render `Running...` status at start of job and setup general
	// structure of comment including Summary and Results section
	//    - might need to add a label/id input values so we can update comments
	//      before we have results

	const token = core.getInput("github-token", { required: true });

	const logger = getLogger();
	const inputs = getInputs();

	logger.debug("Running pre tachometer-reporter-action...");
	logger.debug("Report ID: " + JSON.stringify(inputs.reportId));
	// logger.debug("Context: " + JSON.stringify(github.context, undefined, 2));

	const context = github.context;
	const octokit = github.getOctokit(token);
	const workflowRun = await getWorkflowRun(context, octokit);

	logger.debug("Run name: " + workflowRun.run_name);
	logger.debug("Run URL : " + workflowRun.html_url);

	// await postOrUpdateComment(
	// 	octokit,
	// 	context,
	// 	(comment) => getCommentBody(inputs, comment),
	// 	logger
	// );
})();
