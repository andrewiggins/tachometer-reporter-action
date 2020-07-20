const core = require("@actions/core");
const github = require("@actions/github");
const { reportTachRunning } = require("../index");
const { getLogger, getInputs } = require("./util");

(async function () {
	const token = core.getInput("github-token", { required: true });

	const logger = getLogger();
	const inputs = getInputs(logger);

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

	const report = await reportTachRunning(octokit, context, inputs, logger);

	logger.debug(() => "Report: " + JSON.stringify(report, null, 2));
})();
