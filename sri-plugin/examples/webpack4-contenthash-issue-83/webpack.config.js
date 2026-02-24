import { createIntegrityPlugin, getDist } from '../wsi-test-helper.js';
import { CssExtractRspackPlugin } from '@rspack/core';
import expect from 'expect';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);





export default {
  mode: "production",
  entry: "./index.js",
  output: {
    crossOriginLoading: "anonymous",
    chunkFilename: "[name]-[chunkhash].js",
    filename: "[name]-[contenthash].js",
    path: getDist(__dirname),
  },
  optimization: {
    splitChunks: {
      cacheGroups: {
        styles: {
          name: "style",
          chunks: "all",
          enforce: true,
        },
      },
    },
  },
  plugins: [
    new CssExtractRspackPlugin({ filename: "[name].css" }),
    createIntegrityPlugin({
      hashFuncNames: ["sha256", "sha384"],
    }),
    {
      apply: (compiler) => {
        compiler.hooks.done.tap("wsi-test", (stats) => {
          expect(stats.compilation.warnings.length).toEqual(0);
        });
      },
    },
  ],
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [CssExtractRspackPlugin.loader, "css-loader"],
      },
    ],
  },
};
