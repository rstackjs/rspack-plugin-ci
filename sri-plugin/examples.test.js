/**
 * Copyright (c) 2015-present, Waysact Pty Ltd
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { readdirSync, readFileSync } from "fs";
import spawn from "cross-spawn";
import { join, dirname } from "path";
import { rimraf } from "rimraf";
import { platform } from "os";
import { describe, rstest, test } from "@rstest/core";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

rstest.setConfig({ testTimeout: 120000 });

const DISABLED_CASES = [
  "hwp-externals", // TODO: html-webpack-externals-plugin failed
  "lazy-hashes-cycles", // TODO: support hashLoading: "lazy"
  "lazy-hashes-group", // TODO: support hashLoading: "lazy"
  "lazy-hashes-multiple-parents", // TODO: support hashLoading: "lazy"
  "lazy-hashes-simple", // TODO: support hashLoading: "lazy"
  "no-error-invalid-config", // TODO: support compilation.hooks.renderManifest
  "sourcemap-code-splitting", // TODO: sourcemap hash content failed
  "webpack-assets-manifest", // TODO: support webpack-assets-manifest plugin
  "webpack-fix-style-only-entries", // TODO: support webpack-assets-manifest plugin
  "issue-147", // TODO: deprecated hooks
  "wsi-test-helper.js",
];

const DISABLED_RSPACK_CASES = [
  ...DISABLED_CASES,
];

const exampleDir = join(__dirname, "examples");
const rspackCliBin = join(__dirname, "../node_modules/@rspack/cli/bin/rspack.js");

function createTestCases(type) {
   readdirSync(exampleDir)
    .filter(i => !(type === "rspack" ? DISABLED_RSPACK_CASES : DISABLED_CASES).includes(i))
    .forEach((example) => {
      const exampleDirectory = join(exampleDir, example);
      const configFile = "webpack.config.js";
      const configContent = readFileSync(join(exampleDirectory, configFile));
      if (type === "rspack" && !configContent.includes("createHtmlPlugin")) {
        return;
      }
      // Warning: test.concurrent will lead puppeteer to timeout on macos
      const testFn = platform() === "darwin" ? test : test.concurrent;
      testFn(`${example}/${type}`, async () => {
        rimraf.sync(join(exampleDirectory, "dist", type));
        await new Promise((resolve, reject) => {
          const stdout = [];
          const stderr = [];
          // CHANGED: run rspack and remove coverage
          const cmd = spawn(
            "node",
            [rspackCliBin, "build", "-c", configFile],
            {
              cwd: exampleDirectory,
              stdio: "pipe",
              env: {
                HTML_PLUGIN: type,
                ...process.env
              }
            }
          );
          cmd.stdout?.on("data", (data) => {
            stdout.push(data);
          });
          cmd.stderr?.on("data", (data) => {
            stderr.push(data);
          });
          cmd.on("exit", (code) => {
            if (code === 0) {
              resolve();
            } else {
              reject(
                new Error(
                  `child process exited with code ${code}: ${stdout.join(
                    ""
                  )} ${stderr.join("")}`
                )
              );
            }
          });
          cmd.on("error", reject);
        });
        await new Promise((resolve) => setTimeout(resolve, 0));
      }, 60000);
    });
}

describe("sri-plugin/examples/webpack", () => {
  createTestCases("webpack");
});

describe("sri-plugin/examples/rspack", () => {
  createTestCases("rspack");
});
