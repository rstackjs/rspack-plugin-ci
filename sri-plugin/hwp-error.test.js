/**
 * Copyright (c) 2015-present, Waysact Pty Ltd
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { jest, test, expect } from "@jest/globals";
import { resolve } from "path";
import { runRspack, SubresourceIntegrityPlugin } from "./test-utils";

jest.unstable_mockModule("html-webpack-plugin", () => ({
  get getHooks() {
    throw new Error("bogus hwp accessed");
  },
}));

describe("sri-plugin/hwp-error", () => {
  test("error when loading html-webpack-plugin", async () => {
    await expect(
      runRspack({
        output: {
          crossOriginLoading: "anonymous",
        },
        entry: resolve(import.meta.dirname, "./__fixtures__/simple-project/src/"),
        plugins: [new SubresourceIntegrityPlugin({
          htmlPlugin: resolve(import.meta.dirname, "./__mocks__/html-webpack-plugin.cjs")
        })],
      })
    ).rejects.toThrow("bogus hwp accessed");
  });
});

