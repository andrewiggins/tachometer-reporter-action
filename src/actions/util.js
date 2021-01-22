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
	const path = core.getInput("path", { required: false });
	const reportId = core.getInput("report-id", { required: false });
	const initialize = core
		.getInput("initialize", { required: false })
		?.toLowerCase();
	const keepOldResults = core
		.getInput("keep-old-results", { required: false })
		?.toLowerCase();
	const defaultOpen = core
		.getInput("default-open", { required: false })
		?.toLowerCase();
	const prBenchName = core.getInput("pr-bench-name", { required: false });
	const baseBenchName = core.getInput("base-bench-name", { required: false });
	const summarize = core.getInput("summarize", { required: false });
	const followSymbolicLinks = core
		.getInput("follow-symbolic-links")
		?.toLowerCase();

	/** @type {import('../global').Inputs} */
	const inputs = {
		path: path ? path : null,
		initialize: initialize ? initialize == "true" : null,
		reportId: reportId ? reportId : null,
		keepOldResults: keepOldResults != "false",
		defaultOpen: defaultOpen !== "false",
		prBenchName: prBenchName ? prBenchName : null,
		baseBenchName: baseBenchName ? baseBenchName : null,
		summarize: true,
		followSymbolicLinks: followSymbolicLinks !== "false",
	};

	if (summarize?.toLowerCase() == "true") {
		inputs.summarize = true;
	} else if (summarize?.toLowerCase() == "false") {
		inputs.summarize = [];
	} else if (typeof summarize == "string") {
		inputs.summarize = summarize.split(",").map((s) => s.trim());
	} else {
		inputs.summarize = true;
	}

	if (inputs.prBenchName != null && inputs.baseBenchName == null) {
		logger.warn(
			`pr-bench-name input provided without base-bench-name input. Please provide both.`
		);
		inputs.prBenchName = null;
	} else if (inputs.prBenchName == null && inputs.baseBenchName != null) {
		logger.warn(
			`base-bench-name input provided without pr-bench-name input. Please provide both.`
		);
		inputs.baseBenchName = null;
	}

	if (inputs.initialize == null && inputs.path == null) {
		throw new Error(
			`Either the initialize option or the path option must be provided. Neither was provided.`
		);
	}

	return inputs;
}

module.exports = {
	getLogger,
	getInputs,
};
