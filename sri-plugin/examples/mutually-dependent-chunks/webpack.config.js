import expect from 'expect';
import { createIntegrityPlugin, getDist } from '../wsi-test-helper.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);




export default {
  mode: "production",
  entry: "./main.js",
  output: {
    filename: "bundle.js",
    crossOriginLoading: "anonymous",
    path: getDist(__dirname),
  },
  plugins: [
    createIntegrityPlugin({ hashFuncNames: ["sha256", "sha384"] }),
    {
      apply: (compiler) => {
        compiler.hooks.done.tap("wsi-test", (stats) => {
          expect(stats.hasWarnings()).toBeFalsy();
          stats.toJson({ assets: true }).assets.forEach((asset) => {
            expect(asset.integrity).toMatch(/^sha/);
          });
        });
      },
    },
  ],
};
