import rspack from "@rspack/core";
import path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default (config = {}) => {
	const fullConfig = {
		mode: "development",
		context: path.resolve(__dirname, "../fixtures"),
		entry: path.resolve(__dirname, "../helpers/enter.js"),
		output: {
			path: path.resolve(__dirname, "../build")
		},
		devtool: false,
		module: {
			rules: [
				{
					test: /\.txt/,
					type: "asset/resource",
					generator: {
						filename: "asset-modules/[name][ext]"
					}
				}
			]
		},
		...config
	};

	const compiler = rspack(fullConfig);
	return compiler;
};
