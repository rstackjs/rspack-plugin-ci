import expect from 'expect';
import { createIntegrityPlugin, getDist } from '../wsi-test-helper.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);




export default {
  mode: "production",
  entry: "./index.js",
  output: {
    filename: "bundle.js",
    path: getDist(__dirname),
  },
  plugins: [
    createIntegrityPlugin({
      hashFuncNames: ["sha256"],
      enabled: false,
    }),
    {
      apply: (compiler) => {
        compiler.hooks.done.tapPromise("wsi-test", async (stats) => {
          expect(stats.compilation.warnings.length).toEqual(0);
          expect(
            Object.keys(
              stats.toJson({ assets: true }).assets.find((asset) => asset.name === "bundle.js")
            )
          ).not.toContain("integrity");
        });
      },
    },
  ],
};
