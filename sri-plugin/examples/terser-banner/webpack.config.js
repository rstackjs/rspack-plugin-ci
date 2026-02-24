import { createHtmlPlugin, createIntegrityPlugin, getDist } from '../wsi-test-helper.js';
import { RunInPuppeteerPlugin } from '../wsi-test-helper.js';
import TerserPlugin from 'terser-webpack-plugin';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);





export default {
  entry: {
    index: "./index.js",
  },
  output: {
    crossOriginLoading: "anonymous",
    path: getDist(__dirname),
  },
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        extractComments: {
          condition: () => true,
          // TODO: this will block the build, need to be fixed
          // filename: () => "LICENSE.txt",
          filename: "LICENSE.txt",
          banner: (licenseFile) => {
            return `License information can be found in ${licenseFile}`;
          },
        },
      }),
    ],
  },
  plugins: [
    createIntegrityPlugin({
      hashFuncNames: ["sha256"],
      enabled: true,
    }),
    createHtmlPlugin(),
    new RunInPuppeteerPlugin(),
  ],
};
