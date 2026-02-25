/**
 * Copyright (c) 2015-present, Waysact Pty Ltd
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { resolve, dirname } from "path";
import rspack from "@rspack/core";
import HtmlWebpackPlugin from "html-webpack-plugin";
import { SubresourceIntegrityPlugin } from "@rspack/core";
import { rstest, test, expect, describe } from "@rstest/core";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// rstest.unmock("html-webpack-plugin");

describe("sri-plugin/unit", () => {
  function assert(value, message) {
    if (!value) {
      throw new Error(message);
    }
  }

  process.on("unhandledRejection", (error) => {
    console.log(error); // eslint-disable-line no-console
    process.exit(1);
  });

  test("throws an error when options is not an object", async () => {
    expect(() => {
      new SubresourceIntegrityPlugin(function dummy() {
        // dummy function, never called
      }); // eslint-disable-line no-new
    }).toThrow(
      /argument must be an object/
    );
  });

  const runCompilation = (compiler) =>
    new Promise((resolve, reject) => {
      compiler.run((err, stats) => {
        if (err) {
          reject(err);
        } else if (!stats) {
          reject(new Error("Missing stats"));
        } else {
          resolve(stats.compilation);
        }
      });
    });

  const disableOutputPlugin = {
    apply(compiler) {
      compiler.hooks.compilation.tap(
        "DisableOutputWebpackPlugin",
        (compilation) => {
          compilation.hooks.afterProcessAssets.tap(
            {
              name: "DisableOutputWebpackPlugin",
              stage: 10000,
            },
            (compilationAssets) => {
              Object.keys(compilation.assets).forEach((asset) => {
                delete compilation.assets[asset];
              });
              Object.keys(compilationAssets).forEach((asset) => {
                delete compilationAssets[asset];
              });
            }
          );
        }
      );
    },
  };

  const defaultOptions = {
    mode: "none",
    entry: resolve(import.meta.dirname, "./__fixtures__/simple-project/src/."),
    output: {
      crossOriginLoading: "anonymous",
    },
  };

  // CHANGED: throw error when not standard hash function because it can not be supported by rust
  // test("warns when no standard hash function name is specified", async () => {
  test("throw error when not standard hash function name is specified", async () => {
    const plugin = new SubresourceIntegrityPlugin({
      hashFuncNames: ["md5"],
    });

    const compilation = await runCompilation(
      rspack({
        ...defaultOptions,
        plugins: [plugin],
      })
    );

    // expect(compilation.errors).toEqual([]);
    // expect(compilation.warnings[0]?.message).toMatch(
    //   new RegExp(
    //     "It is recommended that at least one hash function is part of " +
    //     "the set for which support is mandated by the specification"
    //   )
    // );
    // expect(compilation.warnings[1]).toBeUndefined();
    expect(compilation.warnings.length).toEqual(0);
    expect(compilation.errors[0]?.message).toMatch(
      /Expect SRI hash function to be 'sha256', 'sha384' or 'sha512', but got 'md5'/
    );
    expect(compilation.warnings[1]).toBeUndefined();
  });

  test("supports new constructor with array of hash function names", async () => {
    const plugin = new SubresourceIntegrityPlugin({
      hashFuncNames: ["sha256", "sha384"],
    });

    const compilation = await runCompilation(
      rspack({
        ...defaultOptions,
        plugins: [plugin, disableOutputPlugin],
      })
    );

    expect(compilation.errors.length).toBe(0);
    expect(compilation.warnings.length).toBe(0);
  });

  test("errors if hash function names is not an array", async () => {
    const plugin = new SubresourceIntegrityPlugin({
      hashFuncNames: "sha256",
    });

    const compilation = await runCompilation(
      rspack({
        ...defaultOptions,
        plugins: [plugin, disableOutputPlugin],
      })
    );

    expect(compilation.errors.length).toBe(1);
    expect(compilation.warnings.length).toBe(0);
    expect(compilation.errors[0]?.message).toMatch(
      /InvalidArg, Given napi value is not an array on RawSubresourceIntegrityPluginOptions.hashFuncNames/
    );
  });

  test("errors if hash function names contains non-string", async () => {
    const plugin = new SubresourceIntegrityPlugin({
      hashFuncNames: [1234],
    });

    const compilation = await runCompilation(
      rspack({
        ...defaultOptions,
        plugins: [plugin, disableOutputPlugin],
      })
    );

    expect(compilation.errors.length).toBe(1);
    expect(compilation.warnings.length).toBe(0);
    expect(compilation.errors[0]?.message).toMatch(
      /StringExpected, Failed to convert JavaScript value `Number 1234 ` into rust type `String` on RawSubresourceIntegrityPluginOptions.hashFuncNames/
    );
  });

  test("errors if hash function names are empty", async () => {
    const plugin = new SubresourceIntegrityPlugin({
      hashFuncNames: [],
    });

    const compilation = await runCompilation(
      rspack({
        ...defaultOptions,
        plugins: [plugin, disableOutputPlugin],
      })
    );

    expect(compilation.errors.length).toBe(1);
    expect(compilation.warnings.length).toBe(0);
    expect(compilation.errors[0]?.message).toMatch(
      /Expect at least one SRI hash function name/
    );
  });

  test("errors if hash function names contains unsupported digest", async () => {
    const plugin = new SubresourceIntegrityPlugin({
      hashFuncNames: ["frobnicate"],
    });

    const compilation = await runCompilation(
      rspack({
        ...defaultOptions,
        plugins: [plugin, disableOutputPlugin],
      })
    );

    expect(compilation.errors.length).toBe(1);
    expect(compilation.warnings.length).toBe(0);
    expect(compilation.errors[0]?.message).toMatch(
      /Expect SRI hash function to be 'sha256', 'sha384' or 'sha512', but got 'frobnicate'/
    );
  });

  // TODO: support hashLoading option
  // test("errors if hashLoading option uses unknown value", async () => {
  //   const plugin = new SubresourceIntegrityPlugin({
  //     hashLoading:
  //       "invalid" as unknown as SubresourceIntegrityPluginOptions["hashLoading"],
  //   });

  //   const compilation = await runCompilation(
  //     rspack({
  //       ...defaultOptions,
  //       plugins: [plugin, disableOutputPlugin],
  //     })
  //   );

  //   expect(compilation.errors.length).toBe(1);
  //   expect(compilation.warnings.length).toBe(0);
  //   expect(compilation.errors[0]?.message).toMatch(
  //     /options.hashLoading must be one of 'eager', 'lazy', instead got 'invalid'/
  //   );
  // });

  test("uses default options", async () => {
    const plugin = new SubresourceIntegrityPlugin({
      hashFuncNames: ["sha256"],
    });

    const compilation = await runCompilation(
      rspack({
        ...defaultOptions,
        plugins: [plugin, disableOutputPlugin],
      })
    );

    expect(plugin["options"].hashFuncNames).toEqual(["sha256"]);
    expect(plugin["options"].enabled).toBeTruthy();
    expect(compilation.errors.length).toBe(0);
    expect(compilation.warnings.length).toBe(0);
  });

  test("should warn when output.crossOriginLoading is not set", async () => {
    const plugin = new SubresourceIntegrityPlugin({ hashFuncNames: ["sha256"] });

    // CHANGED: not support main template hooks, use runtime hooks instead
    const compilation = await runCompilation(
      rspack({
        ...defaultOptions,
        output: { crossOriginLoading: false },
        plugins: [plugin, disableOutputPlugin, {
          apply(compiler) {
            const { RuntimeGlobals } = compiler.webpack;
            compiler.hooks.compilation.tap("test", (compilation) => {
              compilation.hooks.additionalTreeRuntimeRequirements.tap("test", (chunk, set) => {
                set.add(RuntimeGlobals.loadScript);
                set.add(RuntimeGlobals.ensureChunkHandlers);
                set.add(RuntimeGlobals.preloadChunkHandlers);
                set.add(RuntimeGlobals.preloadChunk);
              });
            });
          },
        }],
      })
    );

    // compilation.mainTemplate.hooks.jsonpScript.call("", {});
    // compilation.mainTemplate.hooks.linkPreload.call("", {});

    expect(compilation.errors.length).toBe(1);
    expect(compilation.warnings.length).toBe(1);
    expect(compilation.warnings[0]?.message).toMatch(
      /SRI requires a cross-origin policy/
    );
    expect(compilation.errors[0]?.message).toMatch(
      /Subresource integrity is not applied to async chunks/
    );
  });

  test("should ignore tags without attributes", async () => {
    const plugin = new SubresourceIntegrityPlugin({ hashFuncNames: ["sha256"] });

    const compilation = await runCompilation(
      rspack({
        ...defaultOptions,
        plugins: [plugin, disableOutputPlugin],
      })
    );

    const tag = {
      tagName: "script",
      voidTag: false,
      attributes: {},
      meta: {},
    };

    HtmlWebpackPlugin.getHooks(
      compilation
    ).alterAssetTagGroups.promise({
      headTags: [],
      bodyTags: [tag],
      outputName: "foo",
      publicPath: "public",
      plugin: new HtmlWebpackPlugin(),
    });

    expect(Object.keys(tag.attributes)).not.toContain(["integrity"]);
    expect(compilation.errors.length).toEqual(0);
    expect(compilation.warnings.length).toEqual(0);
  });

  test("positive assertion", () => {
    assert(true, "Pass");
  });

  test("negative assertion", () => {
    expect(() => {
      assert(false, "Fail");
    }).toThrow(new Error("Fail"));
  });

  test("errors with unresolved integrity", async () => {
    const plugin = new SubresourceIntegrityPlugin({
      hashFuncNames: ["sha256", "sha384"],
    });

    const compilation = await runCompilation(
      rspack({
        ...defaultOptions,
        entry: resolve(import.meta.dirname, "./__fixtures__/unresolved/src/."),
        plugins: [plugin, disableOutputPlugin],
      })
    );

    expect(compilation.errors.length).toBe(1);
    expect(compilation.warnings.length).toBe(0);

    expect(compilation.errors[0]?.message).toMatch(
      new RegExp("contains unresolved integrity placeholders")
    );
  });
});

