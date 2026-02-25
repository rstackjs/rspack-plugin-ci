import { createHtmlPlugin, createIntegrityPlugin, getDist } from '../wsi-test-helper.js';
import expect from 'expect';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);




export default {
  entry: {
    "why 1+1=2?": "./index.js",
  },
  output: {
    crossOriginLoading: "anonymous",
    path: getDist(__dirname),
  },
  plugins: [
    createIntegrityPlugin({
      hashFuncNames: ["sha256"],
      enabled: true,
    }),
    createHtmlPlugin(),
    {
      apply: (compiler) => {
        compiler.hooks.done.tap("wsi-test", (stats) => {
          expect(
            stats.toJson({ assets: true }).assets.find((asset) => asset.name == "why 1+1=2?.js")
          ).toHaveProperty("integrity");
        });
      },
    },
  ],
};
