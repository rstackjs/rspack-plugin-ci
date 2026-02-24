import { CssExtractRspackPlugin } from '@rspack/core';


/** @type {import("@rspack/core").Configuration} */
export default {
	entry: "./index.js",
	mode: "production",
	module: {
		rules: [
			{
				test: /\.css$/,
				use: [CssExtractRspackPlugin.loader, "css-loader"]
			}
		]
	},
	output: {
		filename: "[name].$[contenthash]$.js"
	},
	plugins: [
		new CssExtractRspackPlugin({
			filename: "[name].$[contenthash]$.css"
		})
	]
};
