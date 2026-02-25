import { createHtmlPlugin, createIntegrityPlugin, getDist } from '../wsi-test-helper.js';
import { readFileSync } from 'fs';
import { join } from 'path';
import expect from 'expect';
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
  devtool: "source-map",
  plugins: [
    createIntegrityPlugin({
      hashFuncNames: ["sha256", "sha384"],
      enabled: true,
    }),
    createHtmlPlugin(),
    {
      apply: (compiler) => {
        compiler.hooks.done.tap("wsi-test", (stats) => {
          if (stats && stats.hasErrors()) {
            throw new Error(
              stats
                .toJson({ assets: true })
                .errors.map((error) => error.message)
                .join(", ")
            );
          }
          const findAndStripSriHashString = (filePath, pattern, offset) => {
            const fileContent = readFileSync(
              join(getDist(__dirname), filePath),
              "utf-8"
            );
            return fileContent
              .substring(fileContent.indexOf(pattern) + (offset || 0))
              .match(/\{(.*?)\}/)[0]
              .replace(/\\/g, "")
              .replace(/"/g, "");
          };

          const sriHashesInSource = findAndStripSriHashString(
            join(getDist(__dirname), "index.js"),
            "sha256-",
            -10
          );
          const sriHashesInMap = findAndStripSriHashString(
            join(getDist(__dirname), "index.js.map"),
            "__webpack_require__.sriHashes = "
          );
          expect(sriHashesInSource.length).toEqual(sriHashesInMap.length);
        });
      },
    },
  ],
};
