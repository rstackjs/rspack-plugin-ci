import { createHtmlPlugin, createIntegrityPlugin, getDist } from '../wsi-test-helper.js';
import { RunInPuppeteerPlugin } from '../wsi-test-helper.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);




export default {
  entry: "./index.js",
  mode: "production",
  output: {
    filename: "[name].[contenthash].js",
    chunkFilename: "[name].[contenthash].js",
    crossOriginLoading: "anonymous",
    path: getDist(__dirname),
  },
  plugins: [
    createHtmlPlugin(),
    createIntegrityPlugin({
      hashFuncNames: ["sha256", "sha384"],
    }),
    new RunInPuppeteerPlugin(),
  ],
};
