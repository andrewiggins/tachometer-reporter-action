const commonjs = require("@rollup/plugin-commonjs");
const { nodeResolve } = require("@rollup/plugin-node-resolve");
const nodeExternals = require("rollup-plugin-node-externals");
const sucrase = require("@rollup/plugin-sucrase");

module.exports = {
	input: "action.js",
	output: {
		file: "dist/action.js",
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
