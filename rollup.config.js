const commonjs = require("@rollup/plugin-commonjs");
const { nodeResolve } = require("@rollup/plugin-node-resolve");
const nodeExternals = require("rollup-plugin-node-externals");
const sucrase = require("@rollup/plugin-sucrase");

module.exports = {
	input: ["src/action.js", "src/pre-action.js"],
	output: {
		dir: "dist",
		format: "cjs",
	},
	plugins: [
		sucrase({
			transforms: ["jsx"],
			jsxPragma: "h",
			production: true,
		}),
		nodeResolve(),
		commonjs(),
		nodeExternals(),
	],
};
