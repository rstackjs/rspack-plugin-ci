import path from 'path';
import { CssExtractRspackPlugin } from '@rspack/core';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


/** @type {import("@rspack/core").Configuration} */
export default {
	entry: "./index.js",
	context: path.resolve(__dirname, "app"),
	module: {
		rules: [
			{
				test: /\.css$/,
				use: [
					{
						loader: CssExtractRspackPlugin.loader,
						options: {
							publicPath: "public/"
						}
					},
					"./mockLoader"
				]
			},
			{
				test: /\.png$/,
				type: "asset/resource",
				generator: {
					filename: "[path][name][ext]"
				}
			}
		]
	},
	plugins: [
		new CssExtractRspackPlugin({
			filename: "[name].css"
		})
	]
};
