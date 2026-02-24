import { CssExtractRspackPlugin } from '@rspack/core';
/* global document */

/** @type {import("@rspack/core").Configuration} */
export default {
	entry: {
		"\\entry\\name": "./src/index.js"
	},
	optimization: {
		chunkIds: "named"
	},
	output: {
		chunkFilename: "[name].$[contenthash]$.js",
		filename: "main.js"
	},
	module: {
		rules: [
			{
				test: /\.css$/,
				use: [
					{
						loader: CssExtractRspackPlugin.loader
					},
					{
						loader: "css-loader"
					}
				]
			}
		]
	},
	plugins: [
		new CssExtractRspackPlugin({
			filename: "[name].$[contenthash]$.css",
		})
	]
};
