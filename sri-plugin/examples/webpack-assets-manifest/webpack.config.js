import WebpackAssetsManifest from 'webpack-assets-manifest';
import expect from 'expect';
import { readFileSync } from 'fs';
import { join } from 'path';
import { createIntegrityPlugin, getDist } from '../wsi-test-helper.js';
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
  plugins: [
    createIntegrityPlugin({
      hashFuncNames: ["sha384", "sha512"],
      enabled: true,
    }),
    new WebpackAssetsManifest({ integrity: true }),
    {
      apply: (compiler) => {
        compiler.hooks.done.tap("wsi-test", () => {
          const manifest = JSON.parse(
            readFileSync(join(getDist(__dirname), "manifest.json"), "utf-8")
          );
          expect(manifest["index.js"].integrity).toMatch(/sha384-.* sha512-.*/);
        });
      },
    },
  ],
};
