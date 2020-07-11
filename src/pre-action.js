const core = require("@actions/core");
const github = require("@actions/github");

(async function () {
	const reportId = core.getInput("report-id", { required: false });

	core.debug("Running pre tachometer-reporter-action...");
	core.debug("Report ID: " + JSON.stringify(reportId));
	core.debug("Context: " + JSON.stringify(github.context, undefined, 2));
})();
