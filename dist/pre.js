'use strict';

var github = require('./github.js');
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

const { getWorkflowRun } = github.github;

(async function () {
	// TODO: Render `Running...` status at start of job and setup general
	// structure of comment including Summary and Results section
	//    - might need to add a label/id input values so we can update comments
	//      before we have results

	const token = github.core.getInput("github-token", { required: true });
	const reportId = github.core.getInput("report-id", { required: false });

	github.core.debug("Running pre tachometer-reporter-action...");
	github.core.debug("Report ID: " + JSON.stringify(reportId));
	// core.debug("Context: " + JSON.stringify(github.context, undefined, 2));

	const context = github.github$1.context;
	const octokit = github.github$1.getOctokit(token);
	const workflowRun = await getWorkflowRun(context, octokit);

	github.core.debug("Run name: " + workflowRun.run_name);
	github.core.debug("Run URL : " + workflowRun.html_url);
})();
