import { CssExtractRspackPlugin, HotModuleReplacementPlugin } from '@rspack/core';


export default {
  entry: "./index.js",
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
    new HotModuleReplacementPlugin(),
  ],
};
