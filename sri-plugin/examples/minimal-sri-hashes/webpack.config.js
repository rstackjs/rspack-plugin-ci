import { createHtmlPlugin, createIntegrityPlugin, getDist } from '../wsi-test-helper.js';
import { readFileSync } from 'fs';
import { join } from 'path';
import expect from 'expect';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);






export default {
  mode: "development",
  entry: {
    mainAppChunk: ["./index.js"],
  },
  output: {
    filename: "[name].js",
    publicPath: "/",
    crossOriginLoading: "anonymous",
    path: getDist(__dirname),
  },
  optimization: {
    runtimeChunk: "single",
    splitChunks: {
      chunks: "all",
      cacheGroups: {
        vendors: {
          test: /node_modules/,
          name: "vendors",
          chunks: "all",
        },
      },
    },
  },
  plugins: [
    createHtmlPlugin(),
    createIntegrityPlugin({
      hashFuncNames: ["sha256", "sha384"],
    }),
    {
      apply: (compiler) => {
        compiler.hooks.done.tap("wsi-test", () => {
          const runtimeJs = readFileSync(
            join(getDist(__dirname), "runtime.js"),
            "utf-8"
          );
          expect(runtimeJs).not.toMatch(/mainAppChunk/);
        });
      },
    },
  ],
};
