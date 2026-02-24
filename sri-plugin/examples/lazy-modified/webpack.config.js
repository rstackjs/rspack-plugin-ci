import { createHtmlPlugin, createIntegrityPlugin, getDist } from '../wsi-test-helper.js';
import { RunInPuppeteerPlugin } from '../wsi-test-helper.js';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);






let gotError = false;

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
      hashFuncNames: ["sha256", "sha384"],
      lazyHashes: true,
    }),
    createHtmlPlugin(),
    new RunInPuppeteerPlugin({
      onStart: (stats) => {
        console.log(stats.compilation.assets);
        writeFileSync(join(getDist(__dirname), "corrupt.js"), 'console.log("corrupted");');
      },
      onConsoleError: (msg) => {
        console.log(msg);
        if (
          msg.match(
            /Failed to find a valid digest in the 'integrity' attribute for resource/
          )
        ) {
          gotError = true;
        }
      },
      onDone: () => {
        if (!gotError) {
          throw new Error("No error was raised");
        }
      },
    }),
  ],
};
