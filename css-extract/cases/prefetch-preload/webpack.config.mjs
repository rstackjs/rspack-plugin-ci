import { CssExtractRspackPlugin } from '@rspack/core';


export default {
  entry: "./index.js",
  output: {
    bundlerInfo: false
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [CssExtractRspackPlugin.loader, "css-loader"],
      },
    ],
  },
  plugins: [
    new CssExtractRspackPlugin({
      filename: "[name].css",
    }),
  ],
};
