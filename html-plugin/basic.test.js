/*
 * Integration and unit tests for all features but caching
 */

import path from "node:path";
import fs from "node:fs";
import rspack, { CssExtractRspackPlugin as MiniCssExtractPlugin, HtmlRspackPlugin as HtmlWebpackPlugin } from "@rspack/core";
import { rimrafSync } from "rimraf";
import _ from "lodash";
import { createRequire } from "node:module";
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { beforeEach, describe, expect, it, rstest, test } from "@rstest/core";
const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const webpack = rspack;

const webpackMajorVersion = Number(
  /// DIFF: require("webpack/package.json")
  require("@rspack/core/package.json").webpackVersion.split(".")[0],
);
const itUnixOnly =
  process.platform === "win32" || process.platform === "win64" ? it.skip : it;
if (Number.isNaN(webpackMajorVersion)) {
  throw new Error("Cannot parse webpack major version");
}


/// DIFF: const OUTPUT_DIR = path.resolve(__dirname, "../dist/basic-spec");
const OUTPUT_DIR = path.resolve(__dirname, "./js/basic-spec");

rstest.setConfig({ testTimeout: 30000 });
process.on("unhandledRejection", (r) => console.log(r));

function testHtmlPlugin(
  webpackConfig,
  expectedResults,
  outputFile,
  onCompleteOrExpectErrors,
  expectErrorsOrWarnings,
  expectWarningsArg,
) {
  const onComplete =
    typeof onCompleteOrExpectErrors === "function"
      ? onCompleteOrExpectErrors
      : undefined;
  const expectErrors =
    typeof onCompleteOrExpectErrors === "function"
      ? expectErrorsOrWarnings
      : onCompleteOrExpectErrors;
  const expectWarnings =
    typeof onCompleteOrExpectErrors === "function"
      ? expectWarningsArg
      : expectErrorsOrWarnings;

  return new Promise((resolve, reject) => {
    outputFile = outputFile || "index.html";
    webpack(webpackConfig, (err, stats) => {
      try {
        expect(err).toBeFalsy();
        const compilationErrors = (Array.from(stats.compilation.errors).map(i => i.message || '') || []).join("\n");
        if (expectErrors) {
          expect(compilationErrors).not.toBe("");
        } else {
          expect(compilationErrors).toBe("");
        }
        const compilationWarnings = (Array.from(stats.compilation.warnings) || []).join("\n");
        if (expectWarnings) {
          expect(compilationWarnings).not.toBe("");
        } else {
          expect(compilationWarnings).toBe("");
        }
        if (outputFile instanceof RegExp) {
          const fileNames = Object.keys(stats.compilation.assets);
          const matches = Object.keys(stats.compilation.assets).filter((item) =>
            outputFile.test(item),
          );
          expect(matches[0] || fileNames).not.toEqual(fileNames);
          outputFile = matches[0];
        }
        expect(outputFile.indexOf("[hash]") === -1).toBe(true);
        const outputFileExists = fs.existsSync(path.join(OUTPUT_DIR, outputFile));
        expect(outputFileExists).toBe(true);
        if (!outputFileExists) {
          resolve();
          return;
        }
        const htmlContent = fs
          .readFileSync(path.join(OUTPUT_DIR, outputFile))
          .toString();
        let chunksInfo;
        for (let i = 0; i < expectedResults.length; i++) {
          const expectedResult = expectedResults[i];
          if (expectedResult instanceof RegExp) {
            expect(htmlContent).toMatch(expectedResult);
          } else if (typeof expectedResult === "object") {
            if (expectedResult.type === "chunkhash") {
              if (!chunksInfo) {
                chunksInfo = getChunksInfoFromStats(stats);
              }
              const chunkhash = chunksInfo[expectedResult.chunkName].hash;
              expect(htmlContent).toContain(
                expectedResult.containStr.replace("%chunkhash%", chunkhash),
              );
            }
          } else {
            expect(htmlContent).toContain(
              expectedResult.replace("%hash%", stats.hash),
            );
          }
        }
        onComplete?.();
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  });
}

function getChunksInfoFromStats(stats) {
  const chunks = stats.compilation.getStats().toJson({ chunks: true }).chunks;
  const chunksInfo = {};
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const chunkName = chunk.names[0];
    if (chunkName) {
      chunksInfo[chunkName] = chunk;
    }
  }
  return chunksInfo;
}

describe("HtmlWebpackPlugin", () => {
  beforeEach(() => {
    rimrafSync(OUTPUT_DIR);
  });

  it("generates a default index.html file for a single entry point", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: path.join(__dirname, "fixtures/index.js"),
        output: {
          path: OUTPUT_DIR,
          filename: "index_bundle.js",
        },
        plugins: [new HtmlWebpackPlugin()],
      },
      [/<script defer src="index_bundle.js"><\/script>[\s]*<\/head>/],
      null,
    );
  });

  it("properly encodes file names in emitted URIs", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: path.join(__dirname, "fixtures/index.js"),
        output: {
          path: OUTPUT_DIR,
          filename: "foo/very fancy+name.js",
        },
        plugins: [new HtmlWebpackPlugin()],
      },
      [
        /<script defer src="foo\/very%20fancy%2Bname.js"><\/script>[\s]*<\/head>/,
      ],
      null,
    );
  });

  itUnixOnly(
    "properly encodes file names in emitted URIs but keeps the querystring",
    async () => {
      await testHtmlPlugin(
        {
          mode: "production",
          entry: path.join(__dirname, "fixtures/index.js"),
          output: {
            path: OUTPUT_DIR,
            filename:
              "fo:o/very fancy+file-name.js?path=/home?value=abc&value=def#zzz",
          },
          plugins: [new HtmlWebpackPlugin()],
        },
        [
          '<script defer src="fo%3Ao/very%20fancy%2Bfile-name.js?path=/home?value=abc&value=def#zzz">',
        ],
        null,
      );
    },
  );

  it("generates a default index.html file with multiple entry points", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: {
          util: path.join(__dirname, "fixtures/util.js"),
          app: path.join(__dirname, "fixtures/index.js"),
        },
        output: {
          path: OUTPUT_DIR,
          filename: "[name]_bundle.js",
        },
        plugins: [new HtmlWebpackPlugin()],
      },
      [
        '<script defer src="util_bundle.js"',
        '<script defer src="app_bundle.js"',
      ],
      null,
    );
  });

  // TODO: template with loader
  // it("allows you to specify a custom loader without injection", (done) => {
  //   await testHtmlPlugin(
  //     {
  //       mode: "production",
  //       entry: {
  //         app: path.join(__dirname, "fixtures/index.js"),
  //       },
  //       output: {
  //         path: OUTPUT_DIR,
  //         filename: "[name]_bundle.js",
  //       },
  //       plugins: [
  //         new HtmlWebpackPlugin({
  //           inject: false,
  //           template:
  //             "@webdiscus/pug-loader!" + path.join(__dirname, "fixtures/template.pug"),
  //         }),
  //       ],
  //     },
  //     ['<script src="app_bundle.js', "Some unique text"],
  //     null,
  //     done,
  //   );
  // });

  it("should pass through loader errors", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        optimization: {
          emitOnErrors: true,
        },
        entry: {
          app: path.join(__dirname, "fixtures/index.js"),
        },
        output: {
          path: OUTPUT_DIR,
          filename: "[name]_bundle.js",
        },
        plugins: [
          new HtmlWebpackPlugin({
            inject: false,
            template: path.join(__dirname, "fixtures/invalid.html"),
          }),
        ],
      },
      ["ReferenceError: foo is not defined"],
      null,
      true,
    );
  });

  // TODO: template with loader
  // it("uses a custom loader from webpack config", (done) => {
  //   await testHtmlPlugin(
  //     {
  //       mode: "production",
  //       entry: {
  //         app: path.join(__dirname, "fixtures/index.js"),
  //       },
  //       module: {
  //         rules: [{ test: /\.pug$/, loader: "@webdiscus/pug-loader" }],
  //       },
  //       output: {
  //         path: OUTPUT_DIR,
  //         filename: "[name]_bundle.js",
  //       },
  //       plugins: [
  //         new HtmlWebpackPlugin({
  //           inject: false,
  //           template: path.join(__dirname, "fixtures/template.pug"),
  //         }),
  //       ],
  //     },
  //     ['<script src="app_bundle.js', "Some unique text"],
  //     null,
  //     done,
  //   );
  // });

  // TODO: template with loader
  // it("works when using html-loader", (done) => {
  //   await testHtmlPlugin(
  //     {
  //       mode: "production",
  //       entry: {
  //         app: path.join(__dirname, "fixtures/index.js"),
  //       },
  //       output: {
  //         path: OUTPUT_DIR,
  //         filename: "[name]_bundle.js",
  //       },
  //       plugins: [
  //         new HtmlWebpackPlugin({
  //           inject: true,
  //           template:
  //             "html-loader!" + path.join(__dirname, "fixtures/plain.html"),
  //         }),
  //       ],
  //     },
  //     ['<script defer src="app_bundle.js"'],
  //     null,
  //     done,
  //   );
  // });

  it("allows you to specify your own HTML template file", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: {
          app: path.join(__dirname, "fixtures/index.js"),
        },
        output: {
          path: OUTPUT_DIR,
          filename: "[name]_bundle.js",
        },
        plugins: [
          new HtmlWebpackPlugin({
            template: path.join(__dirname, "fixtures/test.html"),
            inject: false,
          }),
        ],
      },
      ['<script src="app_bundle.js', "Some unique text"],
      null,
    );
  });

  it("allows to use a function to map entry names to filenames", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: {
          app: path.join(__dirname, "fixtures/index.js"),
        },
        output: {
          path: OUTPUT_DIR,
          filename: "[name]_bundle.js",
        },
        plugins: [
          new HtmlWebpackPlugin({
            filename: (entry) => `${entry}.html`,
          }),
        ],
      },
      ['<script defer src="app_bundle.js'],
      "app.html",
    );
  });

  it("allows to use [name] for file names", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: {
          app: path.join(__dirname, "fixtures/index.js"),
        },
        output: {
          path: OUTPUT_DIR,
          filename: "[name]_bundle.js",
        },
        plugins: [
          new HtmlWebpackPlugin({
            filename: "[name].html",
          }),
        ],
      },
      ['<script defer src="app_bundle.js'],
      "app.html",
    );
  });

  it("picks up src/index.ejs by default", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        context: path.join(__dirname, "fixtures"),
        entry: {
          app: "./index.js",
        },
        output: {
          path: OUTPUT_DIR,
          filename: "[name]_bundle.js",
        },
        plugins: [new HtmlWebpackPlugin()],
      },
      ['<script defer src="app_bundle.js', "src/index.ejs"],
      null,
    );
  });

  it("allows you to inject the assets into a given html file", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: {
          util: path.join(__dirname, "fixtures/util.js"),
          app: path.join(__dirname, "fixtures/index.js"),
        },
        output: {
          path: OUTPUT_DIR,
          filename: "[name]_bundle.js",
        },
        plugins: [
          new HtmlWebpackPlugin({
            inject: true,
            template: path.join(__dirname, "fixtures/plain.html"),
          }),
        ],
      },
      [
        '<script defer src="util_bundle.js"',
        '<script defer src="app_bundle.js"',
      ],
      null,
    );
  });

  it("allows you to inject the assets into the body of the given template", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: {
          util: path.join(__dirname, "fixtures/util.js"),
          app: path.join(__dirname, "fixtures/index.js"),
        },
        output: {
          path: OUTPUT_DIR,
          filename: "[name]_bundle.js",
        },
        plugins: [
          new HtmlWebpackPlugin({
            inject: "body",
            template: path.join(__dirname, "fixtures/plain.html"),
          }),
        ],
      },
      [
        '<script defer src="util_bundle.js"',
        '<script defer src="app_bundle.js"',
      ],
      null,
    );
  });

  it("allows you to inject the assets into the head of the given template", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: {
          util: path.join(__dirname, "fixtures/util.js"),
          app: path.join(__dirname, "fixtures/index.js"),
        },
        output: {
          path: OUTPUT_DIR,
          filename: "[name]_bundle.js",
        },
        plugins: [
          new HtmlWebpackPlugin({
            inject: "head",
            template: path.join(__dirname, "fixtures/plain.html"),
          }),
        ],
      },
      [
        '<script defer src="util_bundle.js"',
        '<script defer src="app_bundle.js"',
      ],
      null,
    );
  });

  it("allows you to inject a specified asset into a given html file", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: {
          util: path.join(__dirname, "fixtures/util.js"),
          app: path.join(__dirname, "fixtures/index.js"),
        },
        output: {
          path: OUTPUT_DIR,
          filename: "[name]_bundle.js",
        },
        plugins: [
          new HtmlWebpackPlugin({
            inject: true,
            chunks: ["app"],
            template: path.join(__dirname, "fixtures/plain.html"),
          }),
        ],
      },
      ['<script defer src="app_bundle.js"'],
      null,
    );
  });

  it("allows you to inject a specified asset into a given html file", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: {
          util: path.join(__dirname, "fixtures/util.js"),
          app: path.join(__dirname, "fixtures/index.js"),
        },
        output: {
          path: OUTPUT_DIR,
          filename: "[name]_bundle.js",
        },
        plugins: [
          new HtmlWebpackPlugin({
            inject: true,
            excludeChunks: ["util"],
            template: path.join(__dirname, "fixtures/plain.html"),
          }),
        ],
      },
      ['<script defer src="app_bundle.js"'],
      null,
    );
  });


  it("allows you to use chunkhash with asset into a given html file", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: {
          app: path.join(__dirname, "fixtures/index.js"),
        },
        output: {
          path: OUTPUT_DIR,
          filename: "[name]_bundle.js",
        },
        plugins: [
          new HtmlWebpackPlugin({
            inject: false,
            template: path.join(__dirname, "fixtures/webpackconfig.html"),
          }),
        ],
      },
      [
        {
          type: "chunkhash",
          chunkName: "app",
          containStr: '<script src="app_bundle.js"',
        },
      ],
      null,
    );
  });

  it("allows you to disable injection", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: {
          util: path.join(__dirname, "fixtures/util.js"),
          app: path.join(__dirname, "fixtures/index.js"),
        },
        output: {
          path: OUTPUT_DIR,
          filename: "[name]_bundle.js",
        },
        plugins: [
          new HtmlWebpackPlugin({
            inject: false,
            template: path.join(__dirname, "fixtures/plain.html"),
          }),
        ],
      },
      ["<body></body>"],
      null,
    );
  });

  it("allows you to specify your own HTML template function", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: { app: path.join(__dirname, "fixtures/index.js") },
        output: {
          path: OUTPUT_DIR,
          filename: "app_bundle.js",
        },
        plugins: [
          new HtmlWebpackPlugin({
            templateContent: function () {
              return fs.readFileSync(
                path.join(__dirname, "fixtures/plain.html"),
                "utf8",
              );
            },
          }),
        ],
      },
      ['<script defer src="app_bundle.js"'],
      null,
    );
  });

  it("works with source maps", async () => {
    await testHtmlPlugin(
      {
        mode: "development",
        devtool: "source-map",
        entry: path.join(__dirname, "fixtures/index.js"),
        output: {
          path: OUTPUT_DIR,
          filename: "index_bundle.js",
        },
        plugins: [new HtmlWebpackPlugin()],
      },
      ['<script defer src="index_bundle.js"'],
      null,
    );
  });

  it("handles hashes in bundle filenames", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: path.join(__dirname, "fixtures/index.js"),
        output: {
          path: OUTPUT_DIR,
          filename: "index_bundle_[hash].js",
        },
        plugins: [new HtmlWebpackPlugin()],
      },
      [/<script defer src="index_bundle_[0-9a-f]+\.js"*/],
      null,
    );
  });

  it("handles hashes in the directory which has the bundle file", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: path.join(__dirname, "fixtures/index.js"),
        output: {
          path: OUTPUT_DIR,
          publicPath: "/dist/[hash]/",
          filename: "index_bundle_[hash].js",
        },
        plugins: [new HtmlWebpackPlugin()],
      },
      [
        /<script defer src="\/dist\/[0-9a-f]+\/index_bundle_[0-9a-f]+\.js"*/,
      ],
      null,
    );
  });

  it("allows to append hashes to the assets", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: path.join(__dirname, "fixtures/index.js"),
        output: {
          path: OUTPUT_DIR,
          filename: "index_bundle.js",
        },
        plugins: [new HtmlWebpackPlugin({ hash: true })],
      },
      ['<script defer src="index_bundle.js?%hash%"'],
      null,
    );
  });

  it("allows to append hashes to the assets", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: path.join(__dirname, "fixtures/index.js"),
        output: {
          path: OUTPUT_DIR,
          filename: "index_bundle.js",
        },
        plugins: [new HtmlWebpackPlugin({ hash: true, inject: true })],
      },
      ['<script defer src="index_bundle.js?%hash%"'],
      null,
    );
  });

  it("should work with the css extract plugin", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: path.join(__dirname, "fixtures/theme.js"),
        output: {
          path: OUTPUT_DIR,
          filename: "index_bundle.js",
        },
        module: {
          rules: [
            {
              test: /\.css$/,
              use: [MiniCssExtractPlugin.loader, "css-loader"],
            },
          ],
        },
        plugins: [
          new HtmlWebpackPlugin(),
          new MiniCssExtractPlugin({ filename: "styles.css" }),
        ],
      },
      ['<link href="styles.css" rel="stylesheet">'],
      null,
    );
  });

  it("works with a javascript returning loader like raw-loader", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: path.join(__dirname, "fixtures/index.js"),
        module: {
          rules: [{ test: /\.html$/, use: ["raw-loader"] }],
        },
        output: {
          path: OUTPUT_DIR,
          filename: "[name].js",
        },
        plugins: [
          new HtmlWebpackPlugin({
            inject: true,
            template: path.join(__dirname, "fixtures/plain.html"),
          }),
        ],
      },
      [
        '<script defer src="main.js"',
        "<title>Example Plain file</title>",
      ],
      null,
    );
  });

  it("should work with the css extract plugin on windows and protocol relative urls support (#205)", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: path.join(__dirname, "fixtures/theme.js"),
        output: {
          path: OUTPUT_DIR,
          filename: "index_bundle.js",
          publicPath: "//localhost:8080/",
        },
        module: {
          rules: [
            {
              test: /\.css$/,
              use: [MiniCssExtractPlugin.loader, "css-loader"],
            },
          ],
        },
        plugins: [
          new HtmlWebpackPlugin(),
          new MiniCssExtractPlugin({ filename: "styles.css" }),
        ],
      },
      ['<link href="//localhost:8080/styles.css"'],
      null,
    );
  });

  it("should allow to add cache hashes to with the css assets", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: path.join(__dirname, "fixtures/theme.js"),
        output: {
          path: OUTPUT_DIR,
          filename: "index_bundle.js",
          publicPath: "/some/",
        },
        module: {
          rules: [
            {
              test: /\.css$/,
              use: [MiniCssExtractPlugin.loader, "css-loader"],
            },
          ],
        },
        plugins: [
          new HtmlWebpackPlugin({
            hash: true,
            filename: path.resolve(OUTPUT_DIR, "subfolder", "test.html"),
          }),
          new MiniCssExtractPlugin({ filename: "styles.css" }),
        ],
      },
      ['<link href="/some/styles.css?%hash%"'],
      path.join("subfolder", "test.html"),
    );
  });

  it("should allow to add cache hashes to with the css assets", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: path.join(__dirname, "fixtures/theme.js"),
        output: {
          path: OUTPUT_DIR,
          filename: "index_bundle.js",
          publicPath: "/some",
        },
        module: {
          rules: [
            {
              test: /\.css$/,
              use: [MiniCssExtractPlugin.loader, "css-loader"],
            },
          ],
        },
        plugins: [
          new HtmlWebpackPlugin({ hash: true }),
          new MiniCssExtractPlugin({ filename: "styles.css" }),
        ],
      },
      ['<link href="/some/styles.css?%hash%"'],
      null,
    );
  });

  it("should allow to add cache hashes to with the css assets", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: path.join(__dirname, "fixtures/theme.js"),
        output: {
          path: OUTPUT_DIR,
          filename: "index_bundle.js",
          publicPath: "some/",
        },
        module: {
          rules: [
            {
              test: /\.css$/,
              use: [MiniCssExtractPlugin.loader, "css-loader"],
            },
          ],
        },
        plugins: [
          new HtmlWebpackPlugin({ hash: true }),
          new MiniCssExtractPlugin({ filename: "styles.css" }),
        ],
      },
      ['<link href="some/styles.css?%hash%"'],
      null,
    );
  });

  it("should allow to add cache hashes to with the css assets", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: path.join(__dirname, "fixtures/theme.js"),
        output: {
          path: OUTPUT_DIR,
          filename: "index_bundle.js",
        },
        module: {
          rules: [
            {
              test: /\.css$/,
              use: [MiniCssExtractPlugin.loader, "css-loader"],
            },
          ],
        },
        plugins: [
          new HtmlWebpackPlugin({ hash: true }),
          new MiniCssExtractPlugin({ filename: "styles.css" }),
        ],
      },
      ['<link href="styles.css?%hash%"'],
      null,
    );
  });

  it("should allow to add cache hashes to with the css assets", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: path.join(__dirname, "fixtures/theme.js"),
        output: {
          path: OUTPUT_DIR,
          filename: "index_bundle.js",
        },
        module: {
          rules: [
            {
              test: /\.css$/,
              use: [MiniCssExtractPlugin.loader, "css-loader"],
            },
          ],
        },
        plugins: [
          new HtmlWebpackPlugin({
            hash: true,
            filename: path.resolve(OUTPUT_DIR, "subfolder", "test.html"),
          }),
          new MiniCssExtractPlugin({ filename: "styles.css" }),
        ],
      },
      ['<link href="../styles.css?%hash%"'],
      path.join("subfolder", "test.html"),
    );
  });

  it("should inject css files when using the extract text plugin", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: path.join(__dirname, "fixtures/theme.js"),
        output: {
          path: OUTPUT_DIR,
          filename: "index_bundle.js",
        },
        module: {
          rules: [
            {
              test: /\.css$/,
              use: [MiniCssExtractPlugin.loader, "css-loader"],
            },
          ],
        },
        plugins: [
          new HtmlWebpackPlugin({ inject: true }),
          new MiniCssExtractPlugin({ filename: "styles.css" }),
        ],
      },
      ['<link href="styles.css"'],
      null,
    );
  });

  it("should allow to add cache hashes to with injected css assets", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: path.join(__dirname, "fixtures/theme.js"),
        output: {
          path: OUTPUT_DIR,
          filename: "index_bundle.js",
        },
        module: {
          rules: [
            {
              test: /\.css$/,
              use: [MiniCssExtractPlugin.loader, "css-loader"],
            },
          ],
        },
        plugins: [
          new HtmlWebpackPlugin({ hash: true, inject: true }),
          new MiniCssExtractPlugin({ filename: "styles.css" }),
        ],
      },
      ['<link href="styles.css?%hash%"'],
      null,
    );
  });

  // TODO: support xhtml and minify config
  // it("should output xhtml link stylesheet tag", (done) => {
  //   await testHtmlPlugin(
  //     {
  //       mode: "production",
  //       entry: path.join(__dirname, "fixtures/theme.js"),
  //       output: {
  //         path: OUTPUT_DIR,
  //         filename: "index_bundle.js",
  //       },
  //       module: {
  //         rules: [
  //           {
  //             test: /\.css$/,
  //             use: [MiniCssExtractPlugin.loader, "css-loader"],
  //           },
  //         ],
  //       },
  //       plugins: [
  //         new HtmlWebpackPlugin({
  //           xhtml: true,
  //           minify: {
  //             keepClosingSlash: true,
  //           },
  //         }),
  //         new MiniCssExtractPlugin({ filename: "styles.css" }),
  //       ],
  //     },
  //     ['<link href="styles.css" rel="stylesheet"/>'],
  //     null,
  //     done,
  //   );
  // });

  it("prepends the publicPath to function", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: path.join(__dirname, "fixtures/index.js"),
        output: {
          path: OUTPUT_DIR,
          filename: "index_bundle.js",
          publicPath() {
            return "/";
          },
        },
        plugins: [new HtmlWebpackPlugin()],
      },
      ['<script defer src="/index_bundle.js"'],
      null,
    );
  });

  it("prepends the publicPath to /some/", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: path.join(__dirname, "fixtures/index.js"),
        output: {
          path: OUTPUT_DIR,
          filename: "index_bundle.js",
          publicPath: "/some/",
        },
        plugins: [new HtmlWebpackPlugin()],
      },
      ['<script defer src="/some/index_bundle.js"'],
      null,
    );
  });

  it("prepends the publicPath to /some", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: path.join(__dirname, "fixtures/index.js"),
        output: {
          path: OUTPUT_DIR,
          filename: "index_bundle.js",
          publicPath: "/some",
        },
        plugins: [new HtmlWebpackPlugin()],
      },
      ['<script defer src="/some/index_bundle.js"'],
      null,
    );
  });

  it("prepends the publicPath to /some", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: path.join(__dirname, "fixtures/index.js"),
        output: {
          path: OUTPUT_DIR,
          filename: "index_bundle.js",
          publicPath: "some/",
        },
        plugins: [new HtmlWebpackPlugin()],
      },
      ['<script defer src="some/index_bundle.js"'],
      null,
    );
  });

  it("prepends the publicPath to undefined", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: path.join(__dirname, "fixtures/index.js"),
        output: {
          path: OUTPUT_DIR,
          filename: "index_bundle.js",
        },
        plugins: [new HtmlWebpackPlugin()],
      },
      ['<script defer src="index_bundle.js"'],
      null,
    );
  });

  it("prepends the publicPath to undefined", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: path.join(__dirname, "fixtures/index.js"),
        output: {
          path: OUTPUT_DIR,
          filename: "index_bundle.js",
        },
        plugins: [
          new HtmlWebpackPlugin({
            filename: path.resolve(OUTPUT_DIR, "subfolder", "test.html"),
          }),
        ],
      },
      ['<script defer src="../index_bundle.js"'],
      path.join("subfolder", "test.html"),
    );
  });

  it('prepends the publicPath to script defer src', async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: path.join(__dirname, "fixtures/index.js"),
        output: {
          path: OUTPUT_DIR,
          filename: "index_bundle.js",
          publicPath: "http://cdn.example.com/assets/",
        },
        plugins: [new HtmlWebpackPlugin()],
      },
      [
        '<script defer src="http://cdn.example.com/assets/index_bundle.js"',
      ],
      null,
    );
  });

  it("handles subdirectories in the webpack output bundles", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: path.join(__dirname, "fixtures/index.js"),
        output: {
          path: OUTPUT_DIR,
          filename: "assets/index_bundle.js",
          publicPath: "/",
        },
        plugins: [new HtmlWebpackPlugin()],
      },
      ['<script defer src="/assets/index_bundle.js"'],
      null,
    );
  });

  it("allows to set public path to an empty string", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: path.join(__dirname, "fixtures/index.js"),
        output: {
          path: OUTPUT_DIR,
          filename: "assets/index_bundle.js",
          publicPath: "",
        },
        plugins: [
          new HtmlWebpackPlugin({
            filename: "foo/index.html",
          }),
        ],
      },
      ['<script defer src="assets/index_bundle.js"'],
      "foo/index.html",
    );
  });

  it("allows to set the html-webpack-plugin public path to an empty string", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: path.join(__dirname, "fixtures/index.js"),
        output: {
          path: OUTPUT_DIR,
          filename: "assets/index_bundle.js",
          publicPath: "/",
        },
        plugins: [
          new HtmlWebpackPlugin({
            filename: "foo/index.html",
            publicPath: "",
          }),
        ],
      },
      ['<script defer src="assets/index_bundle.js"'],
      "foo/index.html",
    );
  });

  it("handles subdirectories in the webpack output bundles along with a relative path", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: path.join(__dirname, "fixtures/index.js"),
        output: {
          path: OUTPUT_DIR,
          filename: "assets/index_bundle.js",
        },
        plugins: [new HtmlWebpackPlugin()],
      },
      ['<script defer src="assets/index_bundle.js"'],
      null,
    );
  });

  it("handles subdirectories in the webpack output bundles along with a relative path", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: path.join(__dirname, "fixtures/index.js"),
        output: {
          path: OUTPUT_DIR,
          filename: "assets/index_bundle.js",
        },
        plugins: [
          new HtmlWebpackPlugin({
            filename: path.resolve(OUTPUT_DIR, "subfolder", "test.html"),
          }),
        ],
      },
      ['<script defer src="../assets/index_bundle.js"'],
      path.join("subfolder", "test.html"),
    );
  });

  it("handles subdirectories in the webpack output bundles along with a absolute path", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: path.join(__dirname, "fixtures/index.js"),
        output: {
          path: OUTPUT_DIR,
          filename: "assets/index_bundle.js",
          publicPath: "http://cdn.example.com/",
        },
        plugins: [new HtmlWebpackPlugin()],
      },
      [
        '<script defer src="http://cdn.example.com/assets/index_bundle.js"',
      ],
      null,
    );
  });

  it("allows you to configure the title of the generated HTML page", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: path.join(__dirname, "fixtures/index.js"),
        output: {
          path: OUTPUT_DIR,
          filename: "index_bundle.js",
        },
        plugins: [new HtmlWebpackPlugin({ title: "My Cool App" })],
      },
      ["<title>My Cool App</title>"],
      null,
    );
  });

  it("allows you to configure the output filename", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: path.join(__dirname, "fixtures/index.js"),
        output: {
          path: OUTPUT_DIR,
          filename: "index_bundle.js",
        },
        plugins: [new HtmlWebpackPlugin({ filename: "test.html" })],
      },
      ['<script defer src="index_bundle.js"'],
      "test.html",
    );
  });

  it("will replace [hash] in the filename with the child compilation hash", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: path.join(__dirname, "fixtures/index.js"),
        output: {
          path: OUTPUT_DIR,
          filename: "index_bundle.js",
        },
        plugins: [
          new HtmlWebpackPlugin({
            filename: "test-[hash].html",
          }),
        ],
      },
      ['<script defer src="index_bundle.js"'],
      /test-\S+\.html$/,
    );
  });

  it("should work with hash options provided in output options", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: {
          index: path.join(__dirname, "fixtures/index.js"),
        },
        output: {
          path: OUTPUT_DIR,
          filename: "[name]_bundle.js",
          hashDigestLength: 16,
        },
        plugins: [
          new HtmlWebpackPlugin({ filename: "index.[contenthash].html" }),
        ],
      },
      [],
      /index\.[a-z0-9]{16}\.html/,
    );
  });

  it("should allow filename in the format of [contenthash:<length>]", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: {
          index: path.join(__dirname, "fixtures/index.js"),
        },
        output: {
          path: OUTPUT_DIR,
          filename: "[name]_bundle.js",
        },
        plugins: [
          new HtmlWebpackPlugin({ filename: "index.[contenthash:4].html" }),
        ],
      },
      [],
      /index\.[a-z0-9]{4}\.html/,
    );
  });

  it("will replace [contenthash] in the filename with a content hash of 32 hex characters", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: {
          index: path.join(__dirname, "fixtures/index.js"),
        },
        output: {
          path: OUTPUT_DIR,
          filename: "[name]_bundle.js",
        },
        plugins: [
          new HtmlWebpackPlugin({ filename: "index.[contenthash].html" }),
        ],
      },
      [],
      /index\.[a-f0-9]{16}\.html/,
    );
  });

  it("will replace [templatehash] in the filename with a content hash of 32 hex characters", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: {
          index: path.join(__dirname, "fixtures/index.js"),
        },
        output: {
          path: OUTPUT_DIR,
          filename: "[name]_bundle.js",
        },
        plugins: [
          new HtmlWebpackPlugin({ filename: "index.[templatehash].html" }),
        ],
      },
      [],
      /index\.[a-f0-9]{16}\.html/,
    );
  });

  it("allows you to use an absolute output filename", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: path.join(__dirname, "fixtures/index.js"),
        output: {
          path: OUTPUT_DIR,
          filename: "index_bundle.js",
        },
        plugins: [
          new HtmlWebpackPlugin({
            filename: path.resolve(OUTPUT_DIR, "subfolder", "test.html"),
          }),
        ],
      },
      ['<script defer src="../index_bundle.js"'],
      path.join("subfolder", "test.html"),
    );
  });

  it("allows you to use an absolute output filename outside the output path", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: path.join(__dirname, "fixtures/index.js"),
        output: {
          path: path.join(OUTPUT_DIR, "app"),
          filename: "index_bundle.js",
        },
        plugins: [
          new HtmlWebpackPlugin({
            filename: path.resolve(OUTPUT_DIR, "test.html"),
          }),
        ],
      },
      ['<script defer src="app/index_bundle.js"'],
      "test.html",
    );
  });

  it("allows you to use an relative output filename outside the output path", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: path.join(__dirname, "fixtures/index.js"),
        output: {
          path: path.join(OUTPUT_DIR, "app"),
          filename: "index_bundle.js",
        },
        plugins: [
          new HtmlWebpackPlugin({
            filename: "../test.html",
          }),
        ],
      },
      ['<script defer src="app/index_bundle.js"'],
      "test.html",
    );
  });

  it("will try to use a relative name if the filename is in a subdirectory", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: path.join(__dirname, "fixtures/index.js"),
        output: {
          path: OUTPUT_DIR,
          filename: "index_bundle.js",
        },
        plugins: [new HtmlWebpackPlugin({ filename: "assets/test.html" })],
      },
      ['<script defer src="../index_bundle.js"'],
      "assets/test.html",
    );
  });

  it('will try to use a relative name if the filename and the script defer are in a subdirectory', async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: path.join(__dirname, "fixtures/index.js"),
        output: {
          path: OUTPUT_DIR,
          filename: "assets/index_bundle.js",
        },
        plugins: [new HtmlWebpackPlugin({ filename: "assets/demo/test.html" })],
      },
      ['<script defer src="../../assets/index_bundle.js"'],
      "assets/demo/test.html",
    );
  });

  it("allows you write multiple HTML files", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: {
          app: path.join(__dirname, "fixtures/index.js"),
        },
        output: {
          path: OUTPUT_DIR,
          filename: "index_bundle.js",
        },
        plugins: [
          new HtmlWebpackPlugin(),
          new HtmlWebpackPlugin({
            filename: "second-file.html",
            template: path.join(__dirname, "fixtures/test.html"),
          }),
          new HtmlWebpackPlugin({
            filename: "third-file.html",
            template: path.join(__dirname, "fixtures/test.html"),
          }),
        ],
      },
      ['<script defer src="index_bundle.js"'],
      null,
      () => {
        expect(fs.existsSync(path.join(OUTPUT_DIR, "second-file.html"))).toBe(
          true,
        );
        expect(fs.existsSync(path.join(OUTPUT_DIR, "third-file.html"))).toBe(
          true,
        );
      },
    );
  });

  it("should inject js css files even if the html file is incomplete", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: path.join(__dirname, "fixtures/theme.js"),
        output: {
          path: OUTPUT_DIR,
          filename: "index_bundle.js",
        },
        module: {
          rules: [
            {
              test: /\.css$/,
              use: [MiniCssExtractPlugin.loader, "css-loader"],
            },
          ],
        },
        plugins: [
          new HtmlWebpackPlugin({
            template: path.join(__dirname, "fixtures/empty_html.html"),
          }),
          new MiniCssExtractPlugin({ filename: "styles.css" }),
        ],
      },
      [
        '<link href="styles.css"',
        '<script defer src="index_bundle.js"',
      ],
      null,
    );
  });

  it("exposes the webpack configuration to templates", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: {
          app: path.join(__dirname, "fixtures/index.js"),
        },
        output: {
          path: OUTPUT_DIR,
          publicPath: "https://cdn.com",
          filename: "[name]_bundle.js",
        },
        plugins: [
          new HtmlWebpackPlugin({
            template: path.join(__dirname, "fixtures/webpackconfig.html"),
          }),
        ],
      },
      ["Public path is https://cdn.com"],
      null,
    );
  });

  it("fires the html-webpack-plugin-alter-asset-tags event", async () => {
    let eventFired = false;
    const examplePlugin = {
      apply: function (compiler) {
        compiler.hooks.compilation.tap("HtmlWebpackPlugin", (compilation) => {
          HtmlWebpackPlugin.getCompilationHooks(
            compilation,
          ).alterAssetTags.tapAsync(
            "HtmlWebpackPluginTest",
            (object, callback) => {
              expect(Object.keys(object.assetTags)).toEqual([
                "scripts",
                "styles",
                "meta",
              ]);
              eventFired = true;
              callback();
            },
          );
        });
      },
    };

    await testHtmlPlugin(
      {
        mode: "production",
        entry: {
          app: path.join(__dirname, "fixtures/index.js"),
        },
        output: {
          path: OUTPUT_DIR,
          filename: "[name]_bundle.js",
        },
        plugins: [new HtmlWebpackPlugin(), examplePlugin],
      },
      [],
      null,
      () => {
        expect(eventFired).toBe(true);
      },
      false,
      false,
    );
  });

  it("allows events to add a no-value attribute", async () => {
    const examplePlugin = {
      apply: function (compiler) {
        compiler.hooks.compilation.tap("HtmlWebpackPlugin", (compilation) => {
          HtmlWebpackPlugin.getCompilationHooks(
            compilation,
          ).alterAssetTags.tapAsync(
            "HtmlWebpackPluginTest",
            (pluginArgs, callback) => {
              pluginArgs.assetTags.scripts = pluginArgs.assetTags.scripts.map(
                (tag) => {
                  if (tag.tagName === "script") {
                    tag.attributes.specialAttribute = true;
                  }
                  return tag;
                },
              );
              callback(null, pluginArgs);
            },
          );
        });
      },
    };
    await testHtmlPlugin(
      {
        mode: "production",
        entry: {
          app: path.join(__dirname, "fixtures/index.js"),
        },
        output: {
          path: OUTPUT_DIR,
          filename: "[name]_bundle.js",
        },
        plugins: [new HtmlWebpackPlugin(), examplePlugin],
      },
      [
        /[\s]*<script defer specialattribute src="app_bundle.js"><\/script>[\s]*<\/head>/,
      ],
      null,
      false,
      false,
    );
  });

  it("allows events to remove an attribute by setting it to false", async () => {
    const examplePlugin = {
      apply: function (compiler) {
        compiler.hooks.compilation.tap("HtmlWebpackPlugin", (compilation) => {
          HtmlWebpackPlugin.getCompilationHooks(
            compilation,
          ).alterAssetTags.tapAsync(
            "HtmlWebpackPluginTest",
            (pluginArgs, callback) => {
              pluginArgs.assetTags.scripts = pluginArgs.assetTags.scripts.map(
                (tag) => {
                  if (tag.tagName === "script") {
                    tag.attributes.async = false;
                  }
                  return tag;
                },
              );
              callback(null, pluginArgs);
            },
          );
        });
      },
    };
    await testHtmlPlugin(
      {
        mode: "production",
        entry: {
          app: path.join(__dirname, "fixtures/index.js"),
        },
        output: {
          path: OUTPUT_DIR,
          filename: "[name]_bundle.js",
        },
        plugins: [new HtmlWebpackPlugin(), examplePlugin],
      },
      [/<script defer src="app_bundle.js"><\/script>[\s]*<\/head>/],
      null,
      false,
      false,
    );
  });

  it("allows events to remove an attribute by setting it to null", async () => {
    const examplePlugin = {
      apply: function (compiler) {
        compiler.hooks.compilation.tap("HtmlWebpackPlugin", (compilation) => {
          HtmlWebpackPlugin.getCompilationHooks(
            compilation,
          ).alterAssetTags.tapAsync(
            "HtmlWebpackPluginTest",
            (pluginArgs, callback) => {
              pluginArgs.assetTags.scripts = pluginArgs.assetTags.scripts.map(
                (tag) => {
                  if (tag.tagName === "script") {
                    tag.attributes.async = null;
                  }
                  return tag;
                },
              );
              callback(null, pluginArgs);
            },
          );
        });
      },
    };
    await testHtmlPlugin(
      {
        mode: "production",
        entry: {
          app: path.join(__dirname, "fixtures/index.js"),
        },
        output: {
          path: OUTPUT_DIR,
          filename: "[name]_bundle.js",
        },
        plugins: [new HtmlWebpackPlugin(), examplePlugin],
      },
      [/<script defer src="app_bundle.js"><\/script>[\s]*<\/head>/],
      null,
      false,
      false,
    );
  });

  it("allows events to remove an attribute by setting it to undefined", async () => {
    const examplePlugin = {
      apply: function (compiler) {
        compiler.hooks.compilation.tap("HtmlWebpackPlugin", (compilation) => {
          HtmlWebpackPlugin.getCompilationHooks(
            compilation,
          ).alterAssetTags.tapAsync(
            "HtmlWebpackPluginTest",
            (pluginArgs, callback) => {
              pluginArgs.assetTags.scripts = pluginArgs.assetTags.scripts.map(
                (tag) => {
                  if (tag.tagName === "script") {
                    tag.attributes.async = undefined;
                  }
                  return tag;
                },
              );
              callback(null, pluginArgs);
            },
          );
        });
      },
    };
    await testHtmlPlugin(
      {
        mode: "production",
        entry: {
          app: path.join(__dirname, "fixtures/index.js"),
        },
        output: {
          path: OUTPUT_DIR,
          filename: "[name]_bundle.js",
        },
        plugins: [new HtmlWebpackPlugin(), examplePlugin],
      },
      [/<script defer src="app_bundle.js"><\/script>[\s]*<\/head>/],
      null,
      false,
      false,
    );
  });

  it("provides the options to the afterEmit event", async () => {
    let eventArgs;
    const examplePlugin = {
      apply: function (compiler) {
        compiler.hooks.compilation.tap("HtmlWebpackPlugin", (compilation) => {
          HtmlWebpackPlugin.getCompilationHooks(compilation).afterEmit.tapAsync(
            "HtmlWebpackPluginTest",
            (pluginArgs, callback) => {
              eventArgs = pluginArgs;
              callback(null, pluginArgs);
            },
          );
        });
      },
    };
    await testHtmlPlugin(
      {
        mode: "production",
        entry: {
          app: path.join(__dirname, "fixtures/index.js"),
        },
        output: {
          path: OUTPUT_DIR,
          filename: "[name]_bundle.js",
        },
        plugins: [
          new HtmlWebpackPlugin({
            // DIFF: rspack validate the plugin
            // foo: "bar",
            templateParameters: {
              foo: "bar"
            }
          }),
          examplePlugin,
        ],
      },
      [/<script defer src="app_bundle.js"><\/script>[\s]*<\/head>/],
      null,
      () => {
        // DIFF: expect(eventArgs.plugin.options.foo).toBe("bar");
        expect(eventArgs.plugin.options.templateParameters.foo).toBe("bar");
      },
      false,
      false,
    );
  });

  it("provides the outputName to the afterEmit event", async () => {
    let eventArgs;
    const examplePlugin = {
      apply: function (compiler) {
        compiler.hooks.compilation.tap("HtmlWebpackPlugin", (compilation) => {
          HtmlWebpackPlugin.getCompilationHooks(compilation).afterEmit.tapAsync(
            "HtmlWebpackPluginTest",
            (pluginArgs, callback) => {
              eventArgs = pluginArgs;
              callback(null, pluginArgs);
            },
          );
        });
      },
    };
    await testHtmlPlugin(
      {
        mode: "production",
        entry: {
          app: path.join(__dirname, "fixtures/index.js"),
        },
        output: {
          path: OUTPUT_DIR,
          filename: "[name]_bundle.js",
        },
        plugins: [new HtmlWebpackPlugin(), examplePlugin],
      },
      [/<script defer src="app_bundle.js"><\/script>[\s]*<\/head>/],
      null,
      () => {
        expect(eventArgs.outputName).toBe("index.html");
      },
      false,
      false,
    );
  });

  it("fires the html-webpack-plugin-after-template-execution event", async () => {
    let eventFired = false;
    const examplePlugin = {
      apply: function (compiler) {
        compiler.hooks.compilation.tap("HtmlWebpackPlugin", (compilation) => {
          HtmlWebpackPlugin.getCompilationHooks(
            compilation,
          ).afterTemplateExecution.tapAsync(
            "HtmlWebpackPluginTest",
            (object, callback) => {
              eventFired = true;
              callback();
            },
          );
        });
      },
    };

    const shouldExpectWarnings = webpackMajorVersion < 4;
    await testHtmlPlugin(
      {
        mode: "production",
        entry: {
          app: path.join(__dirname, "fixtures/index.js"),
        },
        output: {
          path: OUTPUT_DIR,
          filename: "[name]_bundle.js",
        },
        plugins: [new HtmlWebpackPlugin(), examplePlugin],
      },
      [],
      null,
      () => {
        expect(eventFired).toBe(true);
      },
      false,
      shouldExpectWarnings,
    );
  });

  it("fires the html-webpack-plugin-before-emit event", async () => {
    let eventFired = false;
    const examplePlugin = {
      apply: function (compiler) {
        compiler.hooks.compilation.tap("HtmlWebpackPlugin", (compilation) => {
          HtmlWebpackPlugin.getCompilationHooks(
            compilation,
          ).beforeEmit.tapAsync("HtmlWebpackPluginTest", (object, callback) => {
            eventFired = true;
            callback();
          });
        });
      },
    };
    const shouldExpectWarnings = webpackMajorVersion < 4;
    await testHtmlPlugin(
      {
        mode: "production",
        entry: {
          app: path.join(__dirname, "fixtures/index.js"),
        },
        output: {
          path: OUTPUT_DIR,
          filename: "[name]_bundle.js",
        },
        plugins: [new HtmlWebpackPlugin(), examplePlugin],
      },
      [],
      null,
      () => {
        expect(eventFired).toBe(true);
      },
      false,
      shouldExpectWarnings,
    );
  });

  it("fires the html-webpack-plugin-after-emit event", async () => {
    let eventFired = false;
    const examplePlugin = {
      apply: function (compiler) {
        compiler.hooks.compilation.tap("HtmlWebpackPlugin", (compilation) => {
          HtmlWebpackPlugin.getCompilationHooks(compilation).afterEmit.tapAsync(
            "HtmlWebpackPluginTest",
            (object, callback) => {
              eventFired = true;
              callback();
            },
          );
        });
      },
    };
    await testHtmlPlugin(
      {
        mode: "production",
        entry: {
          app: path.join(__dirname, "fixtures/index.js"),
        },
        output: {
          path: OUTPUT_DIR,
          filename: "[name]_bundle.js",
        },
        plugins: [new HtmlWebpackPlugin(), examplePlugin],
      },
      [],
      null,
      () => {
        expect(eventFired).toBe(true);
      },
    );
  });

  it("allows to modify the html during html-webpack-plugin-before-emit event", async () => {
    let eventFired = false;
    const examplePlugin = {
      apply: function (compiler) {
        compiler.hooks.compilation.tap("HtmlWebpackPlugin", (compilation) => {
          HtmlWebpackPlugin.getCompilationHooks(
            compilation,
          ).beforeEmit.tapAsync("HtmlWebpackPluginTest", (object, callback) => {
            eventFired = true;
            object.html += "Injected by plugin";
            callback();
          });
        });
      },
    };

    const shouldExpectWarnings = webpackMajorVersion < 4;
    await testHtmlPlugin(
      {
        mode: "production",
        entry: {
          app: path.join(__dirname, "fixtures/index.js"),
        },
        output: {
          path: OUTPUT_DIR,
          filename: "[name]_bundle.js",
        },
        plugins: [new HtmlWebpackPlugin(), examplePlugin],
      },
      ["Injected by plugin"],
      null,
      () => {
        expect(eventFired).toBe(true);
      },
      false,
      shouldExpectWarnings,
    );
  });

  it("allows to access all hooks from within a plugin", async () => {
    let hookNames;
    const examplePlugin = {
      apply: function (compiler) {
        compiler.hooks.compilation.tap("HtmlWebpackPlugin", (compilation) => {
          hookNames = Object.keys(
            HtmlWebpackPlugin.getCompilationHooks(compilation),
          ).sort();
        });
      },
    };

    const shouldExpectWarnings = webpackMajorVersion < 4;
    await testHtmlPlugin(
      {
        mode: "production",
        entry: {
          app: path.join(__dirname, "fixtures/index.js"),
        },
        output: {
          path: OUTPUT_DIR,
          filename: "[name]_bundle.js",
        },
        plugins: [new HtmlWebpackPlugin(), examplePlugin],
      },
      [],
      null,
      () => {
        expect(hookNames).toEqual([
          "afterEmit",
          "afterTemplateExecution",
          "alterAssetTagGroups",
          "alterAssetTags",
          "beforeAssetTagGeneration",
          "beforeEmit",
        ]);
      },
      false,
      shouldExpectWarnings,
    );
  });

  it("allows to modify sequentially the html during html-webpack-plugin-before-emit event by edit the given arguments object", async () => {
    let eventFiredForFirstPlugin = false;
    let eventFiredForSecondPlugin = false;
    const examplePlugin = {
      apply: function (compiler) {
        compiler.hooks.compilation.tap("HtmlWebpackPlugin", (compilation) => {
          HtmlWebpackPlugin.getCompilationHooks(
            compilation,
          ).beforeEmit.tapAsync("HtmlWebpackPluginTest", (object, callback) => {
            eventFiredForFirstPlugin = true;
            object.html += "Injected by first plugin";
            callback(null, object);
          });
        });
      },
    };
    const secondExamplePlugin = {
      apply: function (compiler) {
        compiler.hooks.compilation.tap("HtmlWebpackPlugin", (compilation) => {
          HtmlWebpackPlugin.getCompilationHooks(
            compilation,
          ).beforeEmit.tapAsync("HtmlWebpackPluginTest", (object, callback) => {
            eventFiredForSecondPlugin = true;
            object.html += " Injected by second plugin";
            callback(null);
          });
        });
      },
    };

    const shouldExpectWarnings = webpackMajorVersion < 4;
    await testHtmlPlugin(
      {
        mode: "production",
        entry: {
          app: path.join(__dirname, "fixtures/index.js"),
        },
        output: {
          path: OUTPUT_DIR,
          filename: "[name]_bundle.js",
        },
        plugins: [new HtmlWebpackPlugin(), examplePlugin, secondExamplePlugin],
      },
      ["Injected by first plugin Injected by second plugin"],
      null,
      () => {
        expect(eventFiredForFirstPlugin).toBe(true);
        expect(eventFiredForSecondPlugin).toBe(true);
      },
      false,
      shouldExpectWarnings,
    );
  });

  it("allows to modify sequentially the html during html-webpack-plugin-before-emit event either by edit the given arguments object or by return a new object in the callback", async () => {
    let eventFiredForFirstPlugin = false;
    let eventFiredForSecondPlugin = false;
    const examplePlugin = {
      apply: function (compiler) {
        compiler.hooks.compilation.tap("HtmlWebpackPlugin", (compilation) => {
          HtmlWebpackPlugin.getCompilationHooks(
            compilation,
          ).beforeEmit.tapAsync("HtmlWebpackPluginTest", (object, callback) => {
            eventFiredForFirstPlugin = true;
            const result = _.extend(object, {
              html: object.html + "Injected by first plugin",
            });
            callback(null, result);
          });
        });
      },
    };
    const secondExamplePlugin = {
      apply: function (compiler) {
        compiler.hooks.compilation.tap("HtmlWebpackPlugin", (compilation) => {
          HtmlWebpackPlugin.getCompilationHooks(
            compilation,
          ).beforeEmit.tapAsync("HtmlWebpackPluginTest", (object, callback) => {
            eventFiredForSecondPlugin = true;
            object.html += " Injected by second plugin";
            callback(null);
          });
        });
      },
    };

    const shouldExpectWarnings = webpackMajorVersion < 4;
    await testHtmlPlugin(
      {
        mode: "production",
        entry: {
          app: path.join(__dirname, "fixtures/index.js"),
        },
        output: {
          path: OUTPUT_DIR,
          filename: "[name]_bundle.js",
        },
        plugins: [new HtmlWebpackPlugin(), examplePlugin, secondExamplePlugin],
      },
      ["Injected by first plugin Injected by second plugin"],
      null,
      () => {
        expect(eventFiredForFirstPlugin).toBe(true);
        expect(eventFiredForSecondPlugin).toBe(true);
      },
      false,
      shouldExpectWarnings,
    );
  });

  it("allows to modify sequentially the html during html-webpack-plugin-before-emit event by return a new object in the callback", async () => {
    let eventFiredForFirstPlugin = false;
    let eventFiredForSecondPlugin = false;
    const examplePlugin = {
      apply: function (compiler) {
        compiler.hooks.compilation.tap("HtmlWebpackPlugin", (compilation) => {
          HtmlWebpackPlugin.getCompilationHooks(
            compilation,
          ).beforeEmit.tapAsync("HtmlWebpackPluginTest", (object, callback) => {
            eventFiredForFirstPlugin = true;
            const result = _.extend(object, {
              html: object.html + "Injected by first plugin",
            });
            callback(null, result);
          });
        });
      },
    };
    const secondExamplePlugin = {
      apply: function (compiler) {
        compiler.hooks.compilation.tap("HtmlWebpackPlugin", (compilation) => {
          HtmlWebpackPlugin.getCompilationHooks(
            compilation,
          ).beforeEmit.tapAsync("HtmlWebpackPluginTest", (object, callback) => {
            eventFiredForSecondPlugin = true;
            const result = _.extend(object, {
              html: object.html + " Injected by second plugin",
            });
            callback(null, result);
          });
        });
      },
    };

    await testHtmlPlugin(
      {
        mode: "production",
        entry: {
          app: path.join(__dirname, "fixtures/index.js"),
        },
        output: {
          path: OUTPUT_DIR,
          filename: "[name]_bundle.js",
        },
        plugins: [new HtmlWebpackPlugin(), examplePlugin, secondExamplePlugin],
      },
      ["Injected by first plugin Injected by second plugin"],
      null,
      () => {
        expect(eventFiredForFirstPlugin).toBe(true);
        expect(eventFiredForSecondPlugin).toBe(true);
      },
    );
  });

  it("allows to modify the html during html-webpack-plugin-after-template-execution event", async () => {
    let eventFired = false;
    const examplePlugin = {
      apply: function (compiler) {
        compiler.hooks.compilation.tap("HtmlWebpackPlugin", (compilation) => {
          HtmlWebpackPlugin.getCompilationHooks(
            compilation,
          ).afterTemplateExecution.tapAsync(
            "HtmlWebpackPluginTest",
            (object, callback) => {
              eventFired = true;
              object.bodyTags.push(
                HtmlWebpackPlugin.createHtmlTagObject("script", {
                  src: "funky-script.js",
                }),
              );
              // DIFF: swc inject not allow non-space character in page trailer
              // object.html += "Injected by plugin";
              object.html = object.html.replace("</body>", "Injected by plugin</body>");
              callback();
            },
          );
        });
      },
    };

    await testHtmlPlugin(
      {
        mode: "production",
        entry: {
          app: path.join(__dirname, "fixtures/index.js"),
        },
        output: {
          path: OUTPUT_DIR,
          filename: "[name]_bundle.js",
        },
        plugins: [new HtmlWebpackPlugin(), examplePlugin],
      },
      ["Injected by plugin", '<script src="funky-script.js"'],
      null,
      () => {
        expect(eventFired).toBe(true);
      },
      false,
      false,
    );
  });

  // TODO: template with loader
  // it("allows to modify the html during html-webpack-plugin-before-asset-tag-generation event", (done) => {
  //   let eventFired = false;
  //   const examplePlugin = {
  //     apply: function (compiler) {
  //       compiler.hooks.compilation.tap("HtmlWebpackPlugin", (compilation) => {
  //         HtmlWebpackPlugin.getCompilationHooks(
  //           compilation,
  //         ).beforeAssetTagGeneration.tapAsync(
  //           "HtmlWebpackPluginTest",
  //           (object, callback) => {
  //             eventFired = true;
  //             object.assets.js.push("funky-script.js");
  //             callback();
  //           },
  //         );
  //       });
  //     },
  //   };
  //   await testHtmlPlugin(
  //     {
  //       mode: "production",
  //       entry: {
  //         app: path.join(__dirname, "fixtures/index.js"),
  //       },
  //       output: {
  //         path: OUTPUT_DIR,
  //         filename: "[name]_bundle.js",
  //       },
  //       plugins: [
  //         new HtmlWebpackPlugin({
  //           inject: false,
  //           template:
  //             "@webdiscus/pug-loader!" + path.join(__dirname, "fixtures/template.pug"),
  //         }),
  //         examplePlugin,
  //       ],
  //     },
  //     ['<script src="funky-script.js"'],
  //     null,
  //     () => {
  //       expect(eventFired).toBe(true);
  //       done();
  //     },
  //   );
  // });

  it("allows to inject files during html-webpack-plugin-before-asset-tag-generation event", async () => {
    let eventFired = false;
    const examplePlugin = {
      apply: function (compiler) {
        compiler.hooks.compilation.tap("HtmlWebpackPlugin", (compilation) => {
          HtmlWebpackPlugin.getCompilationHooks(
            compilation,
          ).beforeAssetTagGeneration.tapAsync(
            "HtmlWebpackPluginTest",
            (object, callback) => {
              eventFired = true;
              object.assets.js.push("funky-script.js");
              callback();
            },
          );
        });
      },
    };
    await testHtmlPlugin(
      {
        mode: "production",
        entry: {
          app: path.join(__dirname, "fixtures/index.js"),
        },
        output: {
          path: OUTPUT_DIR,
          filename: "[name]_bundle.js",
        },
        plugins: [new HtmlWebpackPlugin(), examplePlugin],
      },
      ['<script defer src="funky-script.js"'],
      null,
      () => {
        expect(eventFired).toBe(true);
      },
    );
  });

  it("fires the events in the correct order", async () => {
    const hookCallOrder = [
      "beforeAssetTagGeneration",
      "alterAssetTags",
      "alterAssetTagGroups",
      "afterTemplateExecution",
      "beforeEmit",
      "afterEmit",
    ];
    let eventsFired = [];
    let hookLength = 0;
    const examplePlugin = {
      apply: function (compiler) {
        compiler.hooks.compilation.tap("HtmlWebpackPlugin", (compilation) => {
          const hooks = HtmlWebpackPlugin.getCompilationHooks(compilation);
          hookLength = hooks.length;
          // Hook into all hooks
          Object.keys(hooks).forEach((hookName) => {
            hooks[hookName].tapAsync(
              "HtmlWebpackPluginTest",
              (object, callback) => {
                eventsFired.push(hookName);
                callback();
              },
            );
          });
        });
      },
    };
    const shouldExpectWarnings = webpackMajorVersion < 4;
    await testHtmlPlugin(
      {
        mode: "production",
        entry: {
          app: path.join(__dirname, "fixtures/index.js"),
        },
        output: {
          path: OUTPUT_DIR,
          filename: "[name]_bundle.js",
        },
        plugins: [new HtmlWebpackPlugin(), examplePlugin],
      },
      [],
      null,
      () => {
        expect(hookLength).not.toBe(0);
        expect(eventsFired).toEqual(hookCallOrder);
      },
      false,
      shouldExpectWarnings,
    );
  });

  it("works with commons chunk plugin", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: {
          util: path.join(__dirname, "fixtures/util.js"),
          index: path.join(__dirname, "fixtures/index.js"),
        },
        output: {
          path: OUTPUT_DIR,
          filename: "[name]_bundle.js",
        },
        optimization: {
          splitChunks: {
            cacheGroups: {
              commons: {
                chunks: "initial",
                name: "common",
                enforce: true,
              },
            },
          },
        },
        plugins: [new HtmlWebpackPlugin()],
      },
      [
        /<script defer src="common_bundle.js">[\s\S]*<script defer src="util_bundle.js">/,
        /<script defer src="common_bundle.js"[\s\S]*<script defer src="index_bundle.js">/,
      ],
      null,
    );
  });

  it("adds a favicon", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: path.join(__dirname, "fixtures/index.js"),
        output: {
          path: OUTPUT_DIR,
          filename: "index_bundle.js",
        },
        plugins: [
          new HtmlWebpackPlugin({
            favicon: path.join(__dirname, "fixtures/favicon.ico"),
          }),
        ],
      },
      [/<link href="[^"]+\.ico" rel="icon">/],
      null,
    );
  });

  it("adds a base tag with attributes", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: path.join(__dirname, "fixtures/index.js"),
        output: {
          path: OUTPUT_DIR,
          filename: "index_bundle.js",
        },
        plugins: [
          new HtmlWebpackPlugin({
            base: {
              href: "http://example.com/page.html",
              target: "_blank",
            },
          }),
        ],
      },
      [/<base href="http:\/\/example\.com\/page\.html" target="_blank">/],
      null,
    );
  });

  it("adds a base tag short syntax", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: path.join(__dirname, "fixtures/index.js"),
        output: {
          path: OUTPUT_DIR,
          filename: "index_bundle.js",
        },
        plugins: [
          new HtmlWebpackPlugin({
            base: "http://example.com/page.html",
          }),
        ],
      },
      [/<base href="http:\/\/example\.com\/page\.html">/],
      null,
    );
  });

  it("adds a meta tag", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: path.join(__dirname, "fixtures/index.js"),
        output: {
          path: OUTPUT_DIR,
          filename: "index_bundle.js",
        },
        plugins: [
          new HtmlWebpackPlugin({
            meta: {
              viewport: {
                name: "viewport",
                content:
                  "width=device-width,initial-scale=1,shrink-to-fit=no",
              },
            },
          }),
        ],
      },
      [
        /<meta content="width=device-width,initial-scale=1,shrink-to-fit=no" name="viewport">/,
      ],
      null,
    );
  });

  // Deprecated: will be removed in next major release of html-webpack-plugin, https://github.com/jantimon/html-webpack-plugin/blob/main/index.js#L222
  // it("avoid duplicate meta tags for default template", (done) => {
  //   await testHtmlPlugin(
  //     {
  //       mode: "production",
  //       entry: path.join(__dirname, "fixtures/index.js"),
  //       context: path.join(__dirname, "fixtures"),
  //       output: {
  //         path: OUTPUT_DIR,
  //         filename: "index_bundle.js",
  //       },
  //       plugins: [new HtmlWebpackPlugin()],
  //     },
  //     [
  //       /<head><meta charset="utf-8"\/><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,minimum-scale=1,user-scalable=no,viewport-fit=cover"><title>src\/index\.ejs<\/title><script defer src="index_bundle.js"><\/script><\/head>/,
  //     ],
  //     null,
  //     done,
  //   );
  // });

  it("adds a meta tag with short notation", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: path.join(__dirname, "fixtures/index.js"),
        output: {
          path: OUTPUT_DIR,
          filename: "index_bundle.js",
        },
        plugins: [
          new HtmlWebpackPlugin({
            meta: {
              viewport: "width=device-width,initial-scale=1,shrink-to-fit=no",
            },
          }),
        ],
      },
      [
        /<meta content="width=device-width,initial-scale=1,shrink-to-fit=no" name="viewport">/,
      ],
      null,
    );
  });

  it("adds a favicon with publicPath set to /some/", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: path.join(__dirname, "fixtures/index.js"),
        output: {
          path: OUTPUT_DIR,
          publicPath: "/some/",
          filename: "index_bundle.js",
        },
        plugins: [
          new HtmlWebpackPlugin({
            favicon: path.join(__dirname, "fixtures/favicon.ico"),
          }),
        ],
      },
      [/<link href="\/some\/+[^"]+\.ico" rel="icon">/],
      null,
    );
  });

  it("adds a favicon with publicPath set to /some", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: path.join(__dirname, "fixtures/index.js"),
        output: {
          path: OUTPUT_DIR,
          publicPath: "/some",
          filename: "index_bundle.js",
        },
        plugins: [
          new HtmlWebpackPlugin({
            favicon: path.join(__dirname, "fixtures/favicon.ico"),
          }),
        ],
      },
      [/<link href="\/some\/+[^"]+\.ico" rel="icon">/],
      null,
    );
  });

  it("adds a favicon with publicPath set to some/", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: path.join(__dirname, "fixtures/index.js"),
        output: {
          path: OUTPUT_DIR,
          publicPath: "some/",
          filename: "index_bundle.js",
        },
        plugins: [
          new HtmlWebpackPlugin({
            favicon: path.join(__dirname, "fixtures/favicon.ico"),
          }),
        ],
      },
      [/<link href="some\/+[^"]+\.ico" rel="icon">/],
      null,
    );
  });

  it("adds a favicon with publicPath undefined root", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: path.join(__dirname, "fixtures/index.js"),
        output: {
          path: OUTPUT_DIR,
          filename: "index_bundle.js",
        },
        plugins: [
          new HtmlWebpackPlugin({
            favicon: path.join(__dirname, "fixtures/favicon.ico"),
          }),
        ],
      },
      [/<link href="[^"]+\.ico" rel="icon">/],
      null,
    );
  });

  it("adds a favicon with publicPath undefined subfolder", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: path.join(__dirname, "fixtures/index.js"),
        output: {
          path: OUTPUT_DIR,
          filename: "index_bundle.js",
        },
        plugins: [
          new HtmlWebpackPlugin({
            favicon: path.join(__dirname, "fixtures/favicon.ico"),
            filename: path.resolve(OUTPUT_DIR, "subfolder", "test.html"),
          }),
        ],
      },
      [/<link href="\.\.\/[^"]+\.ico" rel="icon">/],
      path.join("subfolder", "test.html"),
    );
  });

  it("adds a favicon with a publicPath set to /[hash]/ and replaces the hash", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: path.join(__dirname, "fixtures/index.js"),
        output: {
          path: OUTPUT_DIR,
          publicPath: "/[hash]/",
          filename: "index_bundle.js",
        },
        plugins: [
          new HtmlWebpackPlugin({
            favicon: path.join(__dirname, "fixtures/favicon.ico"),
          }),
        ],
      },
      [/<link href="\/[a-z0-9]{16}\/favicon\.ico" rel="icon">/],
      null,
    );
  });

  it("adds a favicon with a publicPath set to [hash]/ and replaces the hash", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: path.join(__dirname, "fixtures/index.js"),
        output: {
          path: OUTPUT_DIR,
          publicPath: "[hash]/",
          filename: "index_bundle.js",
        },
        plugins: [
          new HtmlWebpackPlugin({
            favicon: path.join(__dirname, "fixtures/favicon.ico"),
          }),
        ],
      },
      [/<link href="[a-z0-9]{16}\/favicon\.ico" rel="icon">/],
      null,
    );
  });

  it("adds a favicon with inject enabled", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: path.join(__dirname, "fixtures/index.js"),
        output: {
          path: OUTPUT_DIR,
          filename: "index_bundle.js",
        },
        plugins: [
          new HtmlWebpackPlugin({
            inject: true,
            favicon: path.join(__dirname, "fixtures/favicon.ico"),
          }),
        ],
      },
      [/<link href="[^"]+\.ico" rel="icon">/],
      null,
    );
  });

  // TODO: support xhtml/minify config
  // it("adds a favicon with xhtml enabled", (done) => {
  //   await testHtmlPlugin(
  //     {
  //       mode: "production",
  //       entry: path.join(__dirname, "fixtures/index.js"),
  //       output: {
  //         path: OUTPUT_DIR,
  //         filename: "index_bundle.js",
  //       },
  //       plugins: [
  //         new HtmlWebpackPlugin({
  //           inject: true,
  //           xhtml: true,
  //           minify: {
  //             keepClosingSlash: true,
  //           },
  //           favicon: path.join(__dirname, "fixtures/favicon.ico"),
  //         }),
  //       ],
  //     },
  //     [/<link rel="icon" href="[^"]+\.ico"\/>/],
  //     null,
  //     done,
  //   );
  // });

  it("shows an error if the favicon could not be load", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: path.join(__dirname, "fixtures/index.js"),
        output: {
          path: OUTPUT_DIR,
          filename: "index_bundle.js",
        },
        optimization: {
          emitOnErrors: true,
        },
        plugins: [
          new HtmlWebpackPlugin({
            inject: true,
            favicon: path.join(__dirname, "fixtures/does_not_exist.ico"),
          }),
        ],
      },
      ["Error: HtmlRspackPlugin: could not load file"],
      null,
      true,
    );
  });

  it("works with webpack BannerPlugin", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: path.join(__dirname, "fixtures/index.js"),
        output: {
          path: OUTPUT_DIR,
          filename: "index_bundle.js",
        },
        plugins: [
          new webpack.BannerPlugin("Copyright and such."),
          new HtmlWebpackPlugin(),
        ],
      },
      ["<html"],
      null,
    );
  });

  it("shows an error when a template fails to load", async () => {
    await testHtmlPlugin(
      {
        mode: "development",
        entry: path.join(__dirname, "fixtures/index.js"),
        output: {
          path: OUTPUT_DIR,
          filename: "index_bundle.js",
        },
        plugins: [
          new HtmlWebpackPlugin({
            template: path.join(
              __dirname,
              "fixtures/non-existing-template.html",
            ),
          }),
        ],
      },
      [
        // DIFF:
        // Number(webpackMajorVersion) >= 5
        //   ? "Child compilation failed:\n  Module not found:"
        //   : "Child compilation failed:\n  Entry module not found:",
        "Error: HtmlRspackPlugin: could not load file",
      ],
      null,
      true,
    );
  });

  it("should sort the chunks in auto mode", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: {
          util: path.join(__dirname, "fixtures/util.js"),
          index: path.join(__dirname, "fixtures/index.js"),
        },
        output: {
          path: OUTPUT_DIR,
          filename: "[name]_bundle.js",
        },
        optimization: {
          splitChunks: {
            cacheGroups: {
              commons: {
                chunks: "initial",
                name: "common",
                enforce: true,
              },
            },
          },
        },
        plugins: [
          new HtmlWebpackPlugin({
            chunksSortMode: "auto",
          }),
        ],
      },
      [
        /(<script defer src="common_bundle.js">.+<script defer src="util_bundle.js">.+<script defer src="index_bundle.js">)|(<script defer src="common_bundle.js">.+<script defer src="index_bundle.js">.+<script defer src="util_bundle.js">)/,
      ],
      null,
    );
  });

  // TODO: support `chunksSortMode`
  // it("should sort the chunks in custom (reverse alphabetical) order", (done) => {
  //   await testHtmlPlugin(
  //     {
  //       mode: "production",
  //       entry: {
  //         b: path.join(__dirname, "fixtures/index.js"),
  //         c: path.join(__dirname, "fixtures/util.js"),
  //         a: path.join(__dirname, "fixtures/index.js"),
  //       },
  //       output: {
  //         path: OUTPUT_DIR,
  //         filename: "[name]_bundle.js",
  //       },
  //       plugins: [
  //         new HtmlWebpackPlugin({
  //           chunksSortMode: function (a, b) {
  //             if (a < b) {
  //               return 1;
  //             }
  //             if (a > b) {
  //               return -1;
  //             }
  //             return 0;
  //           },
  //         }),
  //       ],
  //     },
  //     [
  //       /<script defer src="c_bundle.js">.+<script defer src="b_bundle.js">.+<script defer src="a_bundle.js">/,
  //     ],
  //     null,
  //     done,
  //   );
  // });

  it("should sort manually by the chunks", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: {
          b: path.join(__dirname, "fixtures/util.js"),
          a: path.join(__dirname, "fixtures/theme.js"),
          d: path.join(__dirname, "fixtures/util.js"),
          c: path.join(__dirname, "fixtures/theme.js"),
        },
        output: {
          path: OUTPUT_DIR,
          filename: "[name]_bundle.js",
        },
        module: {
          rules: [{ test: /\.css$/, loader: "css-loader" }],
        },
        optimization: {
          splitChunks: {
            cacheGroups: {
              commons: {
                chunks: "initial",
                name: "common",
                enforce: true,
              },
            },
          },
        },
        plugins: [
          new HtmlWebpackPlugin({
            chunksSortMode: "manual",
            chunks: ["common", "a", "b", "c"],
          }),
        ],
      },
      [
        /<script defer src="common_bundle.js">.+<script defer src="a_bundle.js">.+<script defer src="b_bundle.js">.+<script defer src="c_bundle.js">/,
      ],
      null,
    );
  });

  it("should add the webpack compilation object as a property of the templateParam object", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: path.join(__dirname, "fixtures/index.js"),
        output: {
          path: OUTPUT_DIR,
          filename: "index_bundle.js",
        },
        plugins: [
          new HtmlWebpackPlugin({
            template: path.join(__dirname, "fixtures/templateParam.js"),
            inject: false,
          }),
        ],
      },
      // DIFF: ['templateParams keys: "compilation,webpackConfig,htmlWebpackPlugin"'],
      ['templateParams keys: "compilation,htmlRspackPlugin,rspackConfig"'],
      null,
    );
  });

  it("should add the webpack compilation object as a property of the templateParam object with cjs", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: path.join(__dirname, "fixtures/index.js"),
        output: {
          path: OUTPUT_DIR,
          filename: "index_bundle.js",
        },
        plugins: [
          new HtmlWebpackPlugin({
            template: path.join(__dirname, "fixtures/templateParam.cjs"),
            inject: false,
          }),
        ],
      },
      // DIFF: ['templateParams keys: "compilation,webpackConfig,htmlWebpackPlugin"'],
      ['templateParams keys: "compilation,htmlRspackPlugin,rspackConfig"'],
      null,
    );
  });

  it("should allow to disable template parameters", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: path.join(__dirname, "fixtures/index.js"),
        output: {
          path: OUTPUT_DIR,
          filename: "index_bundle.js",
        },
        plugins: [
          new HtmlWebpackPlugin({
            template: path.join(__dirname, "fixtures/templateParam.js"),
            inject: false,
            templateParameters: false,
          }),
        ],
      },
      ['templateParams keys: ""'],
      null,
    );
  });

  it("should allow to set specific template parameters", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: path.join(__dirname, "fixtures/index.js"),
        output: {
          path: OUTPUT_DIR,
          filename: "index_bundle.js",
        },
        plugins: [
          new HtmlWebpackPlugin({
            template: path.join(__dirname, "fixtures/templateParam.js"),
            inject: false,
            templateParameters: { foo: "bar" },
          }),
        ],
      },
      [
        // DIFF: 'templateParams keys: "compilation,webpackConfig,htmlWebpackPlugin,foo"',
        'templateParams keys: "compilation,foo,htmlRspackPlugin,rspackConfig"',
      ],
      null,
    );
  });

  it("should allow to set specific template parameters using a function", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: path.join(__dirname, "fixtures/index.js"),
        output: {
          path: OUTPUT_DIR,
          filename: "index_bundle.js",
        },
        plugins: [
          new HtmlWebpackPlugin({
            template: path.join(__dirname, "fixtures/templateParam.js"),
            inject: false,
            templateParameters: function () {
              return { foo: "bar" };
            },
          }),
        ],
      },
      ['templateParams keys: "foo"'],
      null,
    );
  });

  it("should allow to set specific template parameters using a async function", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: path.join(__dirname, "fixtures/index.js"),
        output: {
          path: OUTPUT_DIR,
          filename: "index_bundle.js",
        },
        plugins: [
          new HtmlWebpackPlugin({
            template: path.join(__dirname, "fixtures/templateParam.js"),
            inject: false,
            templateParameters: function () {
              return Promise.resolve({ foo: "bar" });
            },
          }),
        ],
      },
      ['templateParams keys: "foo"'],
      null,
    );
  });

  it("should not treat templateContent set to an empty string as missing", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: { app: path.join(__dirname, "fixtures/index.js") },
        output: {
          path: OUTPUT_DIR,
          filename: "app_bundle.js",
        },
        plugins: [
          new HtmlWebpackPlugin({
            templateContent: "",
          }),
        ],
      },
      [/<head><script defer src="app_bundle\.js"><\/script><\/head>/],
      null,
    );
  });

  it("allows you to inject the assets into the body of the given spaced closing tag template", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: path.join(__dirname, "fixtures/index.js"),
        output: {
          path: OUTPUT_DIR,
          filename: "index_bundle.js",
        },
        plugins: [
          new HtmlWebpackPlugin({
            inject: "body",
            template: path.join(__dirname, "fixtures/spaced_plain.html"),
          }),
        ],
      },
      [
        /<body>[\s]*<script defer src="index_bundle.js"><\/script>[\s]*<\/body>/,
      ],
      null,
    );
  });

  it("allows you to inject the assets into the head of the given spaced closing tag template", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: path.join(__dirname, "fixtures/index.js"),
        output: {
          path: OUTPUT_DIR,
          filename: "index_bundle.js",
        },
        plugins: [
          new HtmlWebpackPlugin({
            inject: "head",
            template: path.join(__dirname, "fixtures/spaced_plain.html"),
          }),
        ],
      },
      [/<script defer src="index_bundle.js"><\/script>[\s]*<\/head>/],
      null,
    );
  });

  it("should minify by default when mode is production", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: path.join(__dirname, "fixtures/index.js"),
        output: {
          path: OUTPUT_DIR,
          filename: "index_bundle.js",
        },
        plugins: [new HtmlWebpackPlugin()],
      },
      [/<!doctype html><html><head><meta charset="utf-8">/],
      null,
    );
  });

  it("should not minify by default when mode is development", async () => {
    await testHtmlPlugin(
      {
        mode: "development",
        entry: path.join(__dirname, "fixtures/index.js"),
        output: {
          path: OUTPUT_DIR,
          filename: "index_bundle.js",
        },
        plugins: [new HtmlWebpackPlugin()],
      },
      [/<!DOCTYPE html>\s+<html>\s+<head>\s+<meta charset="utf-8">/],
      null,
    );
  });

  it("should minify in production if options.minify is true", async () => {
    await testHtmlPlugin(
      {
        mode: "development",
        entry: path.join(__dirname, "fixtures/index.js"),
        output: {
          path: OUTPUT_DIR,
          filename: "index_bundle.js",
        },
        plugins: [new HtmlWebpackPlugin({ minify: true })],
      },
      [/<!doctype html><html><head><meta charset="utf-8">/],
      null,
    );
  });

  it("should minify in development if options.minify is true", async () => {
    await testHtmlPlugin(
      {
        mode: "development",
        entry: path.join(__dirname, "fixtures/index.js"),
        output: {
          path: OUTPUT_DIR,
          filename: "index_bundle.js",
        },
        plugins: [new HtmlWebpackPlugin({ minify: true })],
      },
      [/<!doctype html><html><head><meta charset="utf-8">/],
      null,
    );
  });

  it("should not minify in production if options.minify is false", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: path.join(__dirname, "fixtures/index.js"),
        output: {
          path: OUTPUT_DIR,
          filename: "index_bundle.js",
        },
        plugins: [new HtmlWebpackPlugin({ minify: false })],
      },
      [/<!DOCTYPE html>\s+<html>\s+<head>\s+<meta charset="utf-8">/],
      null,
    );
  });

  it("should not minify in development if options.minify is false", async () => {
    await testHtmlPlugin(
      {
        mode: "development",
        entry: path.join(__dirname, "fixtures/index.js"),
        output: {
          path: OUTPUT_DIR,
          filename: "index_bundle.js",
        },
        plugins: [new HtmlWebpackPlugin({ minify: false })],
      },
      [/<!DOCTYPE html>\s+<html>\s+<head>\s+<meta charset="utf-8">/],
      null,
    );
  });

  // TODO: support minify options
  // it("should allow custom minify options and not merge them with the defaults", (done) => {
  //   await testHtmlPlugin(
  //     {
  //       mode: "production",
  //       entry: path.join(__dirname, "fixtures/index.js"),
  //       output: {
  //         path: OUTPUT_DIR,
  //         filename: "index_bundle.js",
  //       },
  //       plugins: [
  //         new HtmlWebpackPlugin({
  //           minify: {
  //             useShortDoctype: true,
  //           },
  //         }),
  //       ],
  //     },
  //     [/<!doctype html>\s+<html>\s+<head>\s+<meta charset="utf-8">/],
  //     null,
  //     done,
  //   );
  // });

  it('should allow to inject scripts with a defer attribute', async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: path.join(__dirname, "fixtures/index.js"),
        output: {
          path: OUTPUT_DIR,
          filename: "index_bundle.js",
        },
        plugins: [
          new HtmlWebpackPlugin({
            scriptLoading: "defer",
          }),
        ],
      },
      [/<script defer .+<body>/],
      null,
    );
  });

  it('should allow to inject scripts with a type="module" attribute', async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: path.join(__dirname, "fixtures/index.js"),
        output: {
          path: OUTPUT_DIR,
          filename: "index_bundle.js",
        },
        plugins: [
          new HtmlWebpackPlugin({
            scriptLoading: "module",
          }),
        ],
      },
      [/<script src="index_bundle.js" type="module"><\/script>.+<body>/],
      null,
    );
  });

  it('should allow to inject scripts with a type="systemjs-module" attribute', async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: path.join(__dirname, "fixtures/index.js"),
        output: {
          path: OUTPUT_DIR,
          filename: "index_bundle.js",
        },
        plugins: [
          new HtmlWebpackPlugin({
            scriptLoading: "systemjs-module",
          }),
        ],
      },
      [
        /<script src="index_bundle.js" type="systemjs-module"><\/script>.+<body>/,
      ],
      null,
    );
  });

  it('should allow to inject scripts with a defer attribute to the body', async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: path.join(__dirname, "fixtures/index.js"),
        output: {
          path: OUTPUT_DIR,
          filename: "index_bundle.js",
        },
        plugins: [
          new HtmlWebpackPlugin({
            scriptLoading: "defer",
            inject: "body",
          }),
        ],
      },
      [/<body>.*<script defer/],
      null,
    );
  });

  it('should allow to inject scripts with a defer in front of styles', async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: path.join(__dirname, "fixtures/theme.js"),
        output: {
          path: OUTPUT_DIR,
          filename: "index_bundle.js",
        },
        module: {
          rules: [
            {
              test: /\.css$/,
              use: [MiniCssExtractPlugin.loader, "css-loader"],
            },
          ],
        },
        plugins: [
          new HtmlWebpackPlugin({
            scriptLoading: "defer",
          }),
          new MiniCssExtractPlugin({ filename: "styles.css" }),
        ],
      },
      [/<script defer.+<link href="styles.css"/],
      null,
    );
  });

  // TODO: swc allow self closing 
  // it("should keep closing slashes from the template", (done) => {
  //   await testHtmlPlugin(
  //     {
  //       mode: "production",
  //       entry: path.join(__dirname, "fixtures/theme.js"),
  //       output: {
  //         path: OUTPUT_DIR,
  //         filename: "index_bundle.js",
  //       },
  //       module: {
  //         rules: [
  //           {
  //             test: /\.css$/,
  //             use: [MiniCssExtractPlugin.loader, "css-loader"],
  //           },
  //         ],
  //       },
  //       plugins: [
  //         new HtmlWebpackPlugin({
  //           scriptLoading: "defer",
  //           templateContent: "<html><body> <selfclosed /> </body></html>",
  //         }),
  //         new MiniCssExtractPlugin({ filename: "styles.css" }),
  //       ],
  //     },
  //     [/<selfclosed\/>/],
  //     null,
  //     done,
  //   );
  // });

  it("should add the javascript assets to the head for inject:true with scriptLoading:defer", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: path.join(__dirname, "fixtures/theme.js"),
        output: {
          path: OUTPUT_DIR,
          filename: "index_bundle.js",
        },
        module: {
          rules: [
            {
              test: /\.css$/,
              use: [MiniCssExtractPlugin.loader, "css-loader"],
            },
          ],
        },
        plugins: [
          new MiniCssExtractPlugin({ filename: "styles.css" }),
          new HtmlWebpackPlugin({
            scriptLoading: "defer",
            inject: true,
          }),
        ],
      },
      [
        '<script defer src="index_bundle.js"></script><link href="styles.css" rel="stylesheet"></head>',
      ],
      null,
    );
  });

  // TODO: support templateContent function
  it("should allow to use headTags and bodyTags directly in string literals", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: path.join(__dirname, "fixtures/theme.js"),
        output: {
          path: OUTPUT_DIR,
          filename: "index_bundle.js",
        },
        module: {
          rules: [
            {
              test: /\.css$/,
              use: [MiniCssExtractPlugin.loader, "css-loader"],
            },
          ],
        },
        plugins: [
          new MiniCssExtractPlugin({ filename: "styles.css" }),
          new HtmlWebpackPlugin({
            scriptLoading: "blocking",
            inject: false,
            // DIFF:
            // templateContent: ({ htmlWebpackPlugin }) => `
            // <html>
            //   <head>${htmlWebpackPlugin.tags.headTags}</head>
            //   <body>${htmlWebpackPlugin.tags.bodyTags}</body>
            // </html>
            // `,
            templateContent: ({ htmlRspackPlugin }) => `
            <html>
              <head>${htmlRspackPlugin.tags.headTags}</head>
              <body>${htmlRspackPlugin.tags.bodyTags}</body>
            </html>
            `,
          }),
        ],
      },
      [
        '<head><link href="styles.css" rel="stylesheet"></head>',
        '<script src="index_bundle.js"></script></body>',
      ],
      null,
    );
  });

  it("should add the javascript assets to the head for inject:true with scriptLoading:defer", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: path.join(__dirname, "fixtures/theme.js"),
        output: {
          path: OUTPUT_DIR,
          filename: "index_bundle.js",
        },
        module: {
          rules: [
            {
              test: /\.css$/,
              use: [MiniCssExtractPlugin.loader, "css-loader"],
            },
          ],
        },
        plugins: [
          new MiniCssExtractPlugin({ filename: "styles.css" }),
          new HtmlWebpackPlugin({
            scriptLoading: "defer",
            inject: true,
          }),
        ],
      },
      [
        '<script defer src="index_bundle.js"></script><link href="styles.css" rel="stylesheet"></head>',
      ],
      null,
    );
  });

  it("should allow to use headTags and bodyTags directly in string literals", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: path.join(__dirname, "fixtures/theme.js"),
        output: {
          path: OUTPUT_DIR,
          filename: "index_bundle.js",
        },
        module: {
          rules: [
            {
              test: /\.css$/,
              use: [MiniCssExtractPlugin.loader, "css-loader"],
            },
          ],
        },
        plugins: [
          new MiniCssExtractPlugin({ filename: "styles.css" }),
          new HtmlWebpackPlugin({
            inject: false,
            // DIFF:
            // templateContent: ({ htmlWebpackPlugin }) => `
            // <html>
            //   <head>${htmlWebpackPlugin.tags.headTags}</head>
            //   <body>${htmlWebpackPlugin.tags.bodyTags}</body>
            // </html>
            // `,
            templateContent: ({ htmlRspackPlugin }) => `
            <html>
              <head>${htmlRspackPlugin.tags.headTags}</head>
              <body>${htmlRspackPlugin.tags.bodyTags}</body>
            </html>
            `,
          }),
        ],
      },
      [
        '<head><script defer src="index_bundle.js"></script><link href="styles.css" rel="stylesheet"></head>',
      ],
      null,
    );
  });

  it("should allow to use experiments:{outputModule:true}", async () => {
    await testHtmlPlugin(
      {
        mode: "production",
        entry: path.join(__dirname, "fixtures/index.js"),
        output: {
          path: OUTPUT_DIR,
          filename: "index_bundle.js",
          module: true,
        },
        experiments: { outputModule: true },
        plugins: [new HtmlWebpackPlugin({})],
      },
      ['<script defer src="index_bundle.js"></script>'],
      null,
    );
  });

  // TODO: template with loader
  // it("generates relative path for asset/resource", (done) => {
  //   await testHtmlPlugin(
  //     {
  //       mode: "development",
  //       entry: path.join(__dirname, "fixtures/index.js"),
  //       output: {
  //         path: OUTPUT_DIR,
  //         filename: "index_bundle.js",
  //         assetModuleFilename: "assets/demo[ext]",
  //       },
  //       module: {
  //         rules: [{ test: /\.png$/, type: "asset/resource" }],
  //       },
  //       plugins: [
  //         new HtmlWebpackPlugin({
  //           template:
  //             "html-loader!" + path.join(__dirname, "fixtures/logo.html"),
  //           filename: "demo/index.js",
  //         }),
  //       ],
  //     },
  //     ['<img src="../assets/demo.png'],
  //     "demo/index.js",
  //     done,
  //   );
  // });

  // TODO: template with loader
  // it("uses the absolute path for asset/resource", (done) => {
  //   await testHtmlPlugin(
  //     {
  //       mode: "development",
  //       entry: path.join(__dirname, "fixtures/index.js"),
  //       output: {
  //         path: OUTPUT_DIR,
  //         filename: "index_bundle.js",
  //         assetModuleFilename: "assets/demo[ext]",
  //       },
  //       module: {
  //         rules: [{ test: /\.png$/, type: "asset/resource" }],
  //       },
  //       plugins: [
  //         new HtmlWebpackPlugin({
  //           template:
  //             "html-loader!" + path.join(__dirname, "fixtures/logo.html"),
  //           filename: "demo/index.js",
  //           publicPath: "/foo/",
  //         }),
  //       ],
  //     },
  //     ['<img src="/foo/assets/demo.png'],
  //     "demo/index.js",
  //     done,
  //   );
  // });

  it("generates an html file if entry is empty", async () => {
    await testHtmlPlugin(
      {
        mode: "development",
        entry: {},
        output: {
          path: OUTPUT_DIR,
          filename: "index_bundle.js",
          assetModuleFilename: "assets/demo[ext]",
        },
        plugins: [new HtmlWebpackPlugin({})],
      },
      ["<body>"],
      null,
    );
  });
  it('syntax-support', async () => {
    await testHtmlPlugin(
      {
        entry: {},
        output: {
          path: OUTPUT_DIR,
          filename: "index_bundle.js",
          assetModuleFilename: "assets/demo[ext]",
        },
        plugins: [new HtmlWebpackPlugin(
          {
            minify: false,
            templateContent: '<%= myHtml %><%- myHtml %>',
            templateParameters: {
              "myHtml": "<span>Rspack</span>"
            }
          })]
      },
      [`
<html>
<head></head><body><span>Rspack</span>&lt;span&gt;Rspack&lt;/span&gt;</body></html>`], null);
  });
  // TODO: html-webpack-plugin loader
  // it("allows to set custom loader interpolation settings", (done) => {
  //   await testHtmlPlugin(
  //     {
  //       mode: "production",
  //       entry: {
  //         app: path.join(__dirname, "fixtures/index.js"),
  //       },
  //       output: {
  //         path: OUTPUT_DIR,
  //         filename: "[name]_bundle.js",
  //       },
  //       module: {
  //         rules: [
  //           {
  //             test: /\.html$/,
  //             loader: require.resolve("../lib/loader.js"),
  //             options: {
  //               interpolate: /\{%=([\s\S]+?)%\}/g,
  //             },
  //           },
  //         ],
  //       },
  //       plugins: [
  //         new HtmlWebpackPlugin({
  //           title: "Interpolation Demo",
  //           template: path.join(__dirname, "fixtures/interpolation.html"),
  //         }),
  //       ],
  //     },
  //     ["Interpolation Demo"],
  //     null,
  //     () => {
  //       done();
  //     },
  //   );
  // });
});
