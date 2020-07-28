const core = require("@actions/core");

/**
 * @returns {import('../global').Logger}
 */
function getLogger() {
	return {
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
}

/**
 * @param {import('../global').Logger} logger
 * @returns {import('../global').Inputs}
 */
function getInputs(logger) {
	const path = core.getInput("path", { required: true });
	const reportId = core.getInput("report-id", { required: false });
	const keepOldResults = core.getInput("keep-old-results", { required: false });
	const defaultOpen = core.getInput("default-open", { required: false });
	const prBenchName = core.getInput("pr-bench-name", { required: false });
	const baseBenchName = core.getInput("base-bench-name", { required: false });

	/** @type {import('../global').Inputs} */
	const inputs = {
		path,
		reportId: reportId ? reportId : null,
		keepOldResults: keepOldResults != "false",
		defaultOpen: defaultOpen !== "false",
		prBenchName: prBenchName ? prBenchName : null,
		baseBenchName: baseBenchName ? baseBenchName : null,
	};

	if (inputs.prBenchName != null && inputs.baseBenchName == null) {
		logger.warn(
			`"pr-bench-name input provided without base-bench-name input. Please provide both.`
		);
		inputs.prBenchName = null;
	} else if (inputs.prBenchName == null && inputs.baseBenchName != null) {
		logger.warn(
			`"base-bench-name input provided without pr-bench-name input. Please provide both.`
		);
		inputs.baseBenchName = null;
	}

	return inputs;
}

module.exports = {
	getLogger,
	getInputs,
};
