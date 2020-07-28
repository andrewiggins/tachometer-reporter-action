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

const { reportTachResults } = util.src;
const { getLogger, getInputs } = util.util;

/**
 * Create a status check, and return a function that updates (completes) it.
 * @param {import('../global').GitHubActionClient} github
 * @param {import('../global').GitHubActionContext} context
 */
async function createCheck(github, context) {
	const check = await github.checks.create({
		...context.repo,
		name: "Tachometer Benchmarks",
		head_sha: context.payload.pull_request.head.sha,
		status: "in_progress",
	});

	return async (details) => {
		await github.checks.update({
			...context.repo,
			check_run_id: check.data.id,
			completed_at: new Date().toISOString(),
			status: "completed",
			...details,
		});
	};
}

(async () => {
	const token = util.core.getInput("github-token", { required: true });
	const useCheck = util.core.getInput("use-check", { required: true });

	const logger = getLogger();
	const inputs = getInputs(logger);
	const octokit = util.github.getOctokit(token);

	if (util.github.context.eventName !== "pull_request") {
		logger.info(
			"Not a pull request event. Skipping this action and doing nothing."
		);
		logger.info("Event name: " + util.github.context.eventName);
		return;
	}

	let finish;
	if (useCheck == "true") {
		finish = await createCheck(octokit, util.github.context);
	} else {
		finish = (checkResult) =>
			util.core.debug("Check Result: " + JSON.stringify(checkResult));
	}

	try {
		util.core.debug("Inputs: " + JSON.stringify(inputs, null, 2));

		let report = await reportTachResults(
			octokit,
			util.github.context,
			inputs,
			logger
		);

		await finish({
			conclusion: "success",
			output: {
				title: `Tachometer Benchmark Results`,
				summary: report.summary,
			},
		});
	} catch (e) {
		util.core.setFailed(e.message);

		await finish({
			conclusion: "failure",
			output: {
				title: "Tachometer Benchmarks failed",
				summary: `Error: ${e.message}`,
			},
		});
	}
})();
