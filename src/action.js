const core = require("@actions/core");
const github = require("@actions/github");
const { reportTachResults } = require("./index");

/**
 * Create a status check, and return a function that updates (completes) it.
 * @param {import('./global').GitHubActionClient} github
 * @param {import('./global').GitHubActionContext} context
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

const actionLogger = {
	warn(msg) {
		core.warning(msg);
	},
	info(msg) {
		core.info(msg);
	},
	debug(getMsg) {
		core.debug(getMsg());
	},
	startGroup(name) {
		core.startGroup(name);
	},
	endGroup() {
		core.endGroup();
	},
};

(async () => {
	const token = core.getInput("github-token", { required: true });
	const path = core.getInput("path", { required: true });
	const reportId = core.getInput("report-id", { required: false });
	const keepOldResults = core.getInput("keep-old-results", { required: false });
	const defaultOpen = core.getInput("default-open", { required: false });
	const localVersion = core.getInput("local-version", { required: false });
	const baseVersion = core.getInput("base-version", { required: false });
	const useCheck = core.getInput("use-check", { required: true });

	const octokit = github.getOctokit(token);
	const inputs = {
		path,
		reportId: reportId ? reportId : null,
		keepOldResults: keepOldResults != "false",
		defaultOpen: defaultOpen !== "false",
		localVersion: localVersion ? localVersion : null,
		baseVersion: baseVersion ? baseVersion : null,
	};

	let finish = (checkResult) =>
		core.debug("Check Result: " + JSON.stringify(checkResult));
	if (useCheck == "true") {
		finish = await createCheck(octokit, github.context);
	}

	try {
		core.debug("Inputs: " + JSON.stringify(inputs, null, 2));

		let results = await reportTachResults(
			octokit,
			github.context,
			inputs,
			actionLogger
		);

		await finish({
			conclusion: "success",
			output: {
				title: `Tachometer Benchmark Results`,
				summary: results.summary,
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
