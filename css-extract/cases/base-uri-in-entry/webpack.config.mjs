import { CssExtractRspackPlugin } from '@rspack/core';


/**
 * @type {import('@rspack/core').Configuration}
 */
export default {
	mode: "production",
	devtool: false,
	entry: {
		index: {
			import: "./index.js",
			baseUri: "my-scheme://uri"
		}
	},
	optimization: {
		minimize: false
	},
	output: {
		module: true,
		assetModuleFilename: "asset/[name][ext]",
		chunkFormat: "module",
		chunkLoading: "import"
	},
	experiments: {
		outputModule: true
	},
	module: {
		rules: [
			{
				test: /\.css$/i,
				use: [
					{
						loader: CssExtractRspackPlugin.loader
					},
					"css-loader"
				]
			},
			{
				test: /\.ttf$/i,
				type: "asset/resource",
				generator: {
					publicPath: "/assets/"
				}
			}
		]
	},
	plugins: [new CssExtractRspackPlugin({ experimentalUseImportModule: true })]
};
