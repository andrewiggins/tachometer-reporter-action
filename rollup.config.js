const commonjs = require("@rollup/plugin-commonjs");
const { nodeResolve } = require("@rollup/plugin-node-resolve");
const nodeExternals = require("rollup-plugin-node-externals");
const sucrase = require("@rollup/plugin-sucrase");

module.exports = {
	input: ["src/action.js", "src/pre-action.js"],
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
		nodeResolve(),
		commonjs(),
		nodeExternals(),
	],
};
