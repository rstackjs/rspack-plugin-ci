import { readFileSync } from 'fs';
import { join } from 'path';
import expect from 'expect';
import { createIntegrityPlugin, getDist } from '../wsi-test-helper.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);






export default {
  mode: "production",
  entry: {
    pageA: "./pageA.js",
    pageB: "./pageB.js",
  },
  output: {
    filename: "[name].js",
    crossOriginLoading: "anonymous",
    path: getDist(__dirname),
  },
  plugins: [
    createIntegrityPlugin({
      hashFuncNames: ["sha256", "sha384"],
    }),
    {
      apply: (compiler) => {
        compiler.hooks.done.tap("wsi-test", (stats) => {
          expect(stats.hasWarnings()).toBeFalsy();
          ["commons1.js", "commons2.js"].forEach((filename) => {
            expect(readFileSync(join(getDist(__dirname), filename), "utf-8")).not.toContain(
              "CHUNK-SRI-HASH"
            );
          });
        });
      },
    },
  ],
  optimization: {
    splitChunks: {
      cacheGroups: {
        commons1: {
          test: /pageA/,
          chunks: "initial",
          name: "commons1",
          enforce: true,
        },
        commons2: {
          test: /pageB/,
          chunks: "initial",
          name: "commons2",
          enforce: true,
        },
      },
    },
  },
};
