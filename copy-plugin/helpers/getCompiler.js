import rspack from "@rspack/core";
import path from "path";

export default (config = {}) => {
	const fullConfig = {
		mode: "development",
		context: path.resolve(import.meta.dirname, "../fixtures"),
		entry: path.resolve(import.meta.dirname, "../helpers/enter.js"),
		output: {
			path: path.resolve(import.meta.dirname, "../build")
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
