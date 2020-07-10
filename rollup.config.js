const commonjs = require("@rollup/plugin-commonjs");
const { nodeResolve } = require("@rollup/plugin-node-resolve");
const nodeExternals = require("rollup-plugin-node-externals");

module.exports = {
	input: "action.js",
	output: {
		file: "dist/action.js",
		format: "cjs",
	},
	plugins: [nodeResolve(), commonjs(), nodeExternals()],
};
