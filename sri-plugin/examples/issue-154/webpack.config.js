import { createHtmlPlugin, createIntegrityPlugin, getDist } from '../wsi-test-helper.js';
import { CssExtractRspackPlugin } from '@rspack/core';
import expect from 'expect';
import { RunInPuppeteerPlugin } from '../wsi-test-helper.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);






export default {
  // mode: "development",
  devtool: "cheap-module-source-map",
  entry: "./index.js",
  output: {
    filename: "[contenthash].js",
    chunkFilename: "[contenthash].chunk.js",
    crossOriginLoading: "anonymous",
    path: getDist(__dirname),
  },
  optimization: {
    moduleIds: "deterministic",
    realContentHash: true,
    chunkIds: "deterministic",
    runtimeChunk: "single",
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: [CssExtractRspackPlugin.loader, "css-loader"],
      },
    ],
  },
  plugins: [
    new CssExtractRspackPlugin({
      filename: `[contenthash].css`,
      chunkFilename: `[contenthash].chunk.css`,
    }),
    createIntegrityPlugin({
      enabled: true,
    }),
    createHtmlPlugin(),
    {
      apply: (compiler) => {
        compiler.hooks.done.tap("wsi-test", (stats) => {
          const cssAsset = stats
            .toJson({ assets: true })
            .assets.find((asset) => asset.name.match(/\.css$/));

          expect(cssAsset.info.contenthash).toBeDefined();
          expect(
            cssAsset.info.contenthash.find((hash) => hash.match(/^sha/))
          ).toBeDefined();
          expect(cssAsset.integrity).toBeDefined();
        });
      },
    },
    new RunInPuppeteerPlugin(),
  ],
};
