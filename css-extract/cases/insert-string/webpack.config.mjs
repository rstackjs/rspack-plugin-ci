import { CssExtractRspackPlugin } from '@rspack/core';
/* global document */

/** @type {import("@rspack/core").Configuration} */
export default {
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
			filename: "[name].css",
			chunkFilename: "[id].css",
			insert: "script[src='1.js']"
		})
	]
};
