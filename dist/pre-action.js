'use strict';

var github = require('./github-53363dd0.js');
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

(async function () {
	const reportId = github.core.getInput("report-id", { required: false });

	github.core.debug("Running pre tachometer-reporter-action...");
	github.core.debug("Report ID: " + JSON.stringify(reportId));
	github.core.debug("Context: " + JSON.stringify(github.github.context, undefined, 2));
})();
