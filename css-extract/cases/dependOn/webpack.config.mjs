import { CssExtractRspackPlugin } from '@rspack/core';


/** @type {import("@rspack/core").Configuration} */
export default {
	entry: {
		entry1: { import: "./entryA.js", dependOn: "common" },
		common: "./entryB.js"
	},
	module: {
		rules: [
			{
				test: /\.css$/,
				use: [CssExtractRspackPlugin.loader, "css-loader"]
			}
		]
	},
	plugins: [
		new CssExtractRspackPlugin({
			filename: "[name].css"
		})
	]
};
