const { readFileSync } = require("fs");
const path = require("path");
const commonjs = require("@rollup/plugin-commonjs");
const { nodeResolve } = require("@rollup/plugin-node-resolve");
const replace = require("@rollup/plugin-replace");
const nodeExternals = require("rollup-plugin-node-externals");
const sucrase = require("@rollup/plugin-sucrase");

const pkg = JSON.parse(
	readFileSync(path.join(__dirname, "package.json"), "utf8")
);

const [major] = pkg.version.split(".").map(Number);

module.exports = {
	input: ["src/actions/main.js", "src/actions/pre.js"],
	output: {
		dir: "dist",
		format: "cjs",
		// Don't include hash since this is a NodeJS module we check in
		chunkFileNames: "[name].js",
	},
	plugins: [
		sucrase({
			transforms: ["jsx"],
			jsxPragma: "h",
			production: true,
		}),
		replace({
			__PKG_MAJOR_VERSION__: major,
		}),
		nodeResolve(),
		commonjs(),
		nodeExternals(),
	],
};
