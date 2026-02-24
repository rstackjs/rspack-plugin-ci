import { CssExtractRspackPlugin } from '@rspack/core';


/** @type {import("@rspack/core").Configuration} */
export default {
	entry: {
		main: "./index.js"
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
