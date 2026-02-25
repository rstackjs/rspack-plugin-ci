import { HotModuleReplacementPlugin } from '@rspack/core';
import { createIntegrityPlugin, getDist } from '../wsi-test-helper.js';
import expect from 'expect';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);





export default {
  mode: "production",
  entry: "./index.js",
  output: {
    filename: "bundle.js",
    crossOriginLoading: "anonymous",
    path: getDist(__dirname),
  },
  plugins: [
    new HotModuleReplacementPlugin(),
    createIntegrityPlugin({ hashFuncNames: ["sha256", "sha384"] }),
    {
      apply: (compiler) => {
        compiler.hooks.done.tap("wsi-test", (stats) => {
          expect(stats.compilation.warnings.length).toEqual(1);
          expect(stats.compilation.warnings[0]).toHaveProperty("message");
          expect(stats.compilation.warnings[0].message).toMatch(
            /may interfere with hot reloading./
          );
        });
      },
    },
  ],
};
