import expect from 'expect';
import { createIntegrityPlugin, createHtmlPlugin, getDist } from '../wsi-test-helper.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);




export default {
  mode: "production",
  entry: {
    index: "./index.js",
  },
  target: "electron-renderer",
  output: {
    crossOriginLoading: "anonymous",
    path: getDist(__dirname),
  },
  plugins: [
    createIntegrityPlugin({
      hashFuncNames: ["sha256", "sha384"],
      enabled: true,
    }),
    createHtmlPlugin(),
    {
      apply: (compiler) => {
        compiler.hooks.done.tapPromise("wsi-test", async (stats) => {
          expect(stats.compilation.warnings.length).toEqual(0);
          expect(stats.compilation.errors.length).toEqual(0);
        });
      },
    },
  ],
};
