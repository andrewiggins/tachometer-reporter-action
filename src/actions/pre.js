const core = require("@actions/core");
const github = require("@actions/github");
const { reportTachRunning } = require("../index");
const { getLogger, getInputs } = require("./util");

(async function () {
	const token = core.getInput("github-token", { required: true });

	const logger = getLogger();
	const inputs = getInputs(logger);
	const context = github.context;

	logger.debug(() => "Running pre tachometer-reporter-action...");
	logger.debug(() => "Report ID: " + JSON.stringify(inputs.reportId));
	logger.debug(() => "Issue: " + JSON.stringify(context.issue, null, 2));
	logger.debug(() => "Repo: " + JSON.stringify(context.repo, null, 2));
	logger.debug(() => "Context: " + JSON.stringify(context, null, 2));

	if (!inputs.reportId) {
		logger.info(
			'No reportId provided. Skipping updating comment with "Running..." status.'
		);

		return;
	}

	const octokit = github.getOctokit(token);
	const report = await reportTachRunning(octokit, context, inputs, logger);

	logger.debug(() => "Report: " + JSON.stringify(report, null, 2));
})();
