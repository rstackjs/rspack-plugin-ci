import { CssExtractRspackPlugin as Self } from "@rspack/core";

/** @type {import("@rspack/core").Configuration} */
export default {
  entry: "./index.js",
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          {
            loader: Self.loader,
          },
          {
            loader: "css-loader",
            options: {
              esModule: true,
              modules: {
                namedExport: true,
                exportLocalsConvention: "asIs",
              },
            },
          },
        ],
      },
    ],
  },
  output: {
    module: true,
  },
  experiments: {
    outputModule: true,
  },
  plugins: [
    new Self({
      filename: "[name].css",
    }),
  ],
};
