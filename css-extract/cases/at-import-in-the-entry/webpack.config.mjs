import { CssExtractRspackPlugin } from '@rspack/core';


/** @type {import("@rspack/core").Configuration} */
export default {
	mode: "development",
	entry: ["./a.css", "./b.css"],
	output: {
		pathinfo: true
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
