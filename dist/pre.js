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

	logger.debug(() => "Running pre tachometer-reporter-action...");
	logger.debug(() => "Report ID: " + JSON.stringify(inputs.reportId));
	logger.debug(() => "Context: " + JSON.stringify(util.github.context, null, 2));

	if (!inputs.reportId) {
		return logger.info(
			'No reportId provided. Skipping updating comment with "Running..." status.'
		);
	}

	const context = util.github.context;
	const octokit = util.github.getOctokit(token);

	const report = await reportTachRunning(octokit, context, inputs, logger);

	logger.debug(() => "Report: " + JSON.stringify(report, null, 2));
})();
