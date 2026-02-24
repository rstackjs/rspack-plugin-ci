import path from 'path';
import expect from 'expect';
import * as htmlparser2 from 'htmlparser2';
import { readFileSync } from 'fs';
import { selectAll } from 'css-select';
import { createIntegrityPlugin, createHtmlPlugin, getDist } from '../wsi-test-helper.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);








export default {
  mode: "production",
  entry: {
    main: "./index.js",
  },
  output: {
    path: path.join(getDist(__dirname), "sub"),
    filename: "bundle.js",
    publicPath: "/",
    crossOriginLoading: "anonymous",
  },
  plugins: [
    createHtmlPlugin({
      filename: "../index.html",
      chunks: ["main"],
    }),
    createIntegrityPlugin({
      hashFuncNames: ["sha256", "sha384"],
    }),
    {
      apply: (compiler) => {
        compiler.hooks.done.tapPromise("wsi-test", async (stats) => {
          expect(stats.compilation.warnings.length).toEqual(0);

          const jsIntegrity =
            stats.toJson({ assets: true }).assets.find((asset) => asset.name === "bundle.js")
              .integrity || stats.compilation.assets["bundle.js"].integrity;
          expect(jsIntegrity).toMatch(/^sha/);

          const dom = htmlparser2.parseDocument(
            readFileSync(path.join(getDist(__dirname), "index.html"), "utf-8")
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
