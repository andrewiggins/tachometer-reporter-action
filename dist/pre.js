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

const { getWorkflowRun } = util.github;
const { postOrUpdateComment } = util.comments;
const { getLogger, getInputs } = util.util;

/**
 * @param {import('../global').Inputs} inputs
 * @param {import('../global').CommentData} comment
 */
function getCommentBody(inputs, comment) {
	return comment.body;
}

(async function () {
	// TODO: Render `Running...` status at start of job and setup general
	// structure of comment including Summary and Results section
	//    - might need to add a label/id input values so we can update comments
	//      before we have results

	const token = util.core.getInput("github-token", { required: true });

	const logger = getLogger();
	const inputs = getInputs();

	logger.debug("Running pre tachometer-reporter-action...");
	logger.debug("Report ID: " + JSON.stringify(inputs.reportId));
	// logger.debug("Context: " + JSON.stringify(github.context, undefined, 2));

	const context = util.github$1.context;
	const octokit = util.github$1.getOctokit(token);
	const workflowRun = await getWorkflowRun(context, octokit);

	logger.debug("Run name: " + workflowRun.run_name);
	logger.debug("Run URL : " + workflowRun.html_url);

	await postOrUpdateComment(
		octokit,
		context,
		(comment) => getCommentBody(inputs, comment),
		logger
	);
})();
