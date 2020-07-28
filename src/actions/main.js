const core = require("@actions/core");
const github = require("@actions/github");
const { reportTachResults } = require("../index");
const { getLogger, getInputs } = require("./util");

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
	const token = core.getInput("github-token", { required: true });
	const useCheck = core.getInput("use-check", { required: true });

	const logger = getLogger();
	const inputs = getInputs(logger);
	const octokit = github.getOctokit(token);

	if (github.context.eventName !== "pull_request") {
		logger.info(
			"Not a pull request event. Skipping this action and doing nothing."
		);
		logger.info("Event name: " + github.context.eventName);
		return;
	}

	let finish;
	if (useCheck == "true") {
		finish = await createCheck(octokit, github.context);
	} else {
		finish = (checkResult) =>
			core.debug("Check Result: " + JSON.stringify(checkResult));
	}

	try {
		core.debug("Inputs: " + JSON.stringify(inputs, null, 2));

		let report = await reportTachResults(
			octokit,
			github.context,
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
		core.setFailed(e.message);

		await finish({
			conclusion: "failure",
			output: {
				title: "Tachometer Benchmarks failed",
				summary: `Error: ${e.message}`,
			},
		});
	}
})();
