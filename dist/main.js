'use strict';

var util = require('./util.js');
require('os');
require('fs');
require('path');
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

const { reportTachResults } = util.src;
const { getLogger, getInputs } = util.util;
const { fullVersion } = util.version;

(async () => {
	const token = util.core.getInput("github-token", { required: true });

	const logger = getLogger();
	const inputs = getInputs(logger);
	const octokit = util.github.getOctokit(token);

	logger.info(`Running tachometer-reporter-action ${fullVersion}`);

	try {
		util.core.debug("Inputs: " + JSON.stringify(inputs, null, 2));

		await reportTachResults(octokit, util.github.context, inputs, logger);
	} catch (e) {
		util.core.setFailed(e.message);
	}
})();
