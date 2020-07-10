const core = require("@actions/core");
const github = require("@actions/github");
const { reportTachResults } = require("./index");

(async () => {
	try {
		const token = core.getInput("github_token", { required: true });
		const path = core.getInput("path", { required: true });

		const octokit = github.getOctokit(token);
		const inputs = { path };

		core.debug("Inputs: " + JSON.stringify(inputs, null, 2));
		core.debug("Context: " + JSON.stringify(github.context, undefined, 2));

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
		};

		await reportTachResults(octokit, github.context, inputs, actionLogger);
	} catch (e) {
		core.setFailed(e.message);
	}
})();
