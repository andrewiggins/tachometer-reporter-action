const { test } = require("uvu");
const assert = require("uvu/assert");

test("Initial test", () => {
	assert.ok(true, "passes");
});

test.run();
