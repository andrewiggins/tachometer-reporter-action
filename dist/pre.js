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

const { getWorkflowRun } = util.github$1;
const { getCommentBody } = util.src;
const { getLogger, getInputs } = util.util;

/**
 * @param {import('../global').Inputs} inputs
 * @param {import('../global').WorkflowRunData} workflowRun
 * @returns {import('../global').Report}
 */
function buildInProgressReport(inputs, workflowRun) {
	const text = (
		h('div', null, "Running in "
  , h('a', { href: workflowRun.html_url,}, workflowRun.run_name), "..."
)
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

	const token = util.core.getInput("github-token", { required: true });

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

	const context = util.github.context;
	const octokit = util.github.getOctokit(token);
	const workflowRun = await getWorkflowRun(context, octokit);
	const report = buildInProgressReport(inputs, workflowRun);
	const serializableReport = {
		...report,
		body: report.body.toString(),
		summary: report.summary.toString(),
	};

	logger.debug(() => "Run name: " + workflowRun.run_name);
	logger.debug(() => "Run URL : " + workflowRun.html_url);
	logger.debug(() => "Report  : " + JSON.stringify(serializableReport, null, 2));

	// await postOrUpdateComment(
	// 	octokit,
	// 	context,
	// 	(comment) => getCommentBody(inputs, comment),
	// 	logger
	// );

	logger.debug(() => "Updated comment body:");
	logger.debug(() => getCommentBody(inputs, report, null));
})();
