import expect from 'expect';
import * as htmlparser2 from 'htmlparser2';
import { readFileSync } from 'fs';
import { selectAll } from 'css-select';
import { createIntegrityPlugin, createHtmlPlugin, getDist } from '../wsi-test-helper.js';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);








export default {
  entry: "./index.js",
  output: {
    filename: "subdir/bundle.js",
    crossOriginLoading: "anonymous",
    path: getDist(__dirname),
  },
  plugins: [
    createHtmlPlugin({
      hash: true,
      filename: "assets/admin.html",
    }),
    createIntegrityPlugin({
      hashFuncNames: ["sha256", "sha384"],
    }),
    {
      apply: (compiler) => {
        compiler.hooks.done.tapPromise("wsi-test", async (stats) => {
          const jsIntegrity =
            stats
              .toJson({ assets: true })
              .assets.find((asset) => asset.name === "subdir/bundle.js")
              .integrity ||
            stats.compilation.assets["subdir/bundle.js"].integrity;
          expect(jsIntegrity).toMatch(/^sha/);

          const dom = htmlparser2.parseDocument(
            readFileSync(join(getDist(__dirname), "assets/admin.html"), "utf-8")
          );

          const scripts = selectAll("script", dom);
          expect(scripts.length).toEqual(1);
          expect(scripts[0].attribs.crossorigin).toEqual("anonymous");
          expect(scripts[0].attribs.integrity).toEqual(jsIntegrity);
        });
      },
    },
  ],
};
