const core = require("@actions/core");
const github = require("@actions/github");
const { getWorkflowRun } = require("../utils/github");
const { postOrUpdateComment } = require("../comments");
const { getCommentBody } = require("../index");
const { getLogger, getInputs } = require("./util");

/**
 * @param {import('../global').Inputs} inputs
 * @param {import('../global').WorkflowRunData} workflowRun
 * @returns {import('../global').Report}
 */
function buildInProgressReport(inputs, workflowRun) {
	const text = (
		<div>
			Running in <a href={workflowRun.html_url}>{workflowRun.run_name}</a>...
		</div>
	);

	return {
		id: inputs.reportId,
		title: inputs.reportId,
		body: text,
		summary: text,
		results: null,
		baseBenchName: inputs.baseBenchName,
		prBenchName: inputs.prBenchName,
	};
}

(async function () {
	// TODO: Render `Running...` status at start of job and setup general
	// structure of comment including Summary and Results section
	//    - might need to add a label/id input values so we can update comments
	//      before we have results

	const token = core.getInput("github-token", { required: true });

	const logger = getLogger();
	const inputs = getInputs();

	logger.debug(() => "Running pre tachometer-reporter-action...");
	logger.debug(() => "Report ID: " + JSON.stringify(inputs.reportId));
	// logger.debug("Context: " + JSON.stringify(github.context, undefined, 2));

	if (!inputs.reportId) {
		return logger.info(
			'No reportId provided. Skipping updating comment with "Running..." status.'
		);
	}

	const context = github.context;
	const octokit = github.getOctokit(token);
	const workflowRun = await getWorkflowRun(context, octokit);
	const report = buildInProgressReport(inputs, workflowRun);
	const serializableReport = {
		...report,
		body: report.body.toString(),
		summary: report.summary.toString(),
	};

	logger.debug(() => "Run name: " + workflowRun.run_name);
	logger.debug(() => "Run URL : " + workflowRun.html_url);
	logger.debug(
		() => "Report  : " + JSON.stringify(serializableReport, null, 2)
	);

	// await postOrUpdateComment(
	// 	octokit,
	// 	context,
	// 	(comment) => getCommentBody(inputs, comment),
	// 	logger
	// );

	logger.debug(() => "Updated comment body:");
	logger.debug(() => getCommentBody(inputs, report, null));
})();
