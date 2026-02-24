import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import WebpackAssetsManifest from 'webpack-assets-manifest';
import FixStyleOnlyEntriesPlugin from 'webpack-fix-style-only-entries';
import expect from 'expect';
import { createIntegrityPlugin, getDist } from '../wsi-test-helper.js';







export default {
  mode: "production",
  entry: {
    index: "./index.js",
    style: ["./style.css"],
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: "css-loader",
            options: {
              importLoaders: 1,
            },
          },
        ],
      },
    ],
  },
  output: {
    crossOriginLoading: "anonymous",
  },
  plugins: [
    new FixStyleOnlyEntriesPlugin({
      silent: true,
    }),
    new MiniCssExtractPlugin({
      filename: "[name].css",
    }),
    new WebpackAssetsManifest({ integrity: true }),
    createIntegrityPlugin({
      hashFuncNames: ["sha256", "sha384"],
      enabled: true,
    }),
    {
      apply: (compiler) => {
        compiler.hooks.done.tap("wsi-test", (stats) => {
          expect(
            stats.compilation.warnings.filter(
              // Ignore Webpack deprecation warnings
              (message) => {
                console.log(message);
                return !message.match(/DEP_WEBPACK_/);
              }
            ).length
          ).toEqual(0);
        });
      },
    },
  ],
};
