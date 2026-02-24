import { createHtmlPlugin, createIntegrityPlugin, getDist } from '../wsi-test-helper.js';
import { CssExtractRspackPlugin } from '@rspack/core';
import { RunInPuppeteerPlugin } from '../wsi-test-helper.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);





export default {
  entry: {
    index: "./index.js",
  },
  plugins: [
    new CssExtractRspackPlugin({
      // Options similar to the same options in webpackOptions.output
      // both options are optional
      filename: "[name].css",
      chunkFilename: "[id].css",
    }),
    createIntegrityPlugin({
      hashFuncNames: ["sha256", "sha384"],
      enabled: true,
    }),
    createHtmlPlugin(),
    new RunInPuppeteerPlugin(),
  ],
  devtool: false,
  output: {
    crossOriginLoading: "anonymous",
    path: getDist(__dirname),
  },
  optimization: {
    minimize: false
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          CssExtractRspackPlugin.loader,
          {
            loader: "css-loader",
            options: {
              sourceMap: true,
              modules: {
                auto: true,
              },
              importLoaders: 1,
            },
          },
        ],
      },
    ],
  },
};
