import { CssExtractRspackPlugin } from '@rspack/core';


/** @type {import("@rspack/core").Configuration} */
export default {
	entry: "./index.js",
	module: {
		rules: [
			{
				test: /\.css$/,
				use: [CssExtractRspackPlugin.loader, "css-loader"],
				type: 'javascript/auto'
			}
		]
	},
	plugins: [
		new CssExtractRspackPlugin()
	],
	experiments: {
		css: true
	}
};
