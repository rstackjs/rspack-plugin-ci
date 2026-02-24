import {
	CssExtractRspackPlugin,
	HotModuleReplacementPlugin
} from '@rspack/core';


/** @type {import("@rspack/core").Configuration} */
export default {
	entry: "./index.css",
	mode: "development",
	devtool: false,
	module: {
		rules: [
			{
				test: /\.css$/,
				use: [
					{
						loader: CssExtractRspackPlugin.loader
					},
          {
            loader: "css-loader",
            options: {
              modules: true,
            },
          },
				]
			}
		]
	},
	devServer: { hot: true },
	plugins: [
		new HotModuleReplacementPlugin(),
		new CssExtractRspackPlugin({
			filename: "[name].css"
		})
	]
};
