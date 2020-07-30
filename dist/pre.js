'use strict';

var util = require('./util.js');
require('os');
require('path');
require('fs');
require('url');
require('http');
require('https');
require('net');
require('tls');
require('events');
require('assert');
require('util');
require('stream');
require('zlib');
require('crypto');

const { reportTachRunning } = util.src;
const { getLogger, getInputs } = util.util;

(async function () {
	const token = util.core.getInput("github-token", { required: true });

	const logger = getLogger();
	const inputs = getInputs(logger);
	const context = util.github.context;

	logger.debug(() => "Running pre tachometer-reporter-action...");
	logger.debug(() => "Report ID: " + JSON.stringify(inputs.reportId));
	logger.debug(() => "Issue: " + JSON.stringify(context.issue, null, 2));
	logger.debug(() => "Repo: " + JSON.stringify(context.repo, null, 2));
	logger.debug(() => "Context: " + JSON.stringify(context, null, 2));

	if (context.eventName !== "pull_request") {
		logger.info(
			"Not a pull request event. Skipping this action and doing nothing."
		);
		logger.info("Event name: " + util.github.context.eventName);
		return;
	}

	const octokit = util.github.getOctokit(token);
	const report = await reportTachRunning(octokit, context, inputs, logger);

	logger.debug(() => "Report: " + JSON.stringify(report, null, 2));
})();
