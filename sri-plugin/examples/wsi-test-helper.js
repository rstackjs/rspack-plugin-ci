/**
 * Copyright (c) 2020-present, Waysact Pty Ltd
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */


import getPort from "get-port";
import puppeteer from "puppeteer";
import Fastify from "fastify";
import FastifyStatic from "fastify-static";
import { resolve, join } from "path";
import HtmlWebpackPlugin from "html-webpack-plugin";
import { HtmlRspackPlugin, SubresourceIntegrityPlugin } from "../test-utils.js";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

function createPrinter(prefix) {
  return (message) => {
    process.stderr.write(`${prefix}: ${String(message)}\n`);
  };
}

const defaultError = createPrinter("Error");
const defaultPageError = createPrinter("Page Error");

function defaultConsoleError(text) {
  process.stderr.write("Console: error: " + text + "\n");
}

function createResultPromise(page, options) {
  return new Promise((resolve, reject) => {
    page.on("console", (msg) => {
      Promise.all(msg.args().map((arg) => arg.jsonValue())).then((args) => {
        if (args.length === 0) {
          if (msg.type() === "error") {
            (options.onConsoleError || defaultConsoleError)(msg.text());
          }
        } else if (args[0] === "ok") {
          resolve();
        } else if (args[0] === "error") {
          reject(new Error(args.slice(1).join(" ")));
        } else {
          process.stderr.write("Console: " + args.join(" ") + "\n");
        }
      });
    });
  });
}

function createTimeoutPromise(delayMillis) {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error("Timeout loading page"));
    }, delayMillis).unref();
  });
}

async function handlePage(
  page,
  options,
  port
) {
  page.on("pageerror", options.onPageError || defaultPageError);
  page.on("error", options.onError || defaultError);

  await Promise.all([
    page.goto(`http://localhost:${port}/`, {
      waitUntil: "networkidle0",
    }),
    Promise.race([
      createResultPromise(page, options),
      createTimeoutPromise(10000),
    ]),
  ]);
}

async function testWithPuppeteer(
  stats,
  options
) {
  if (options.onStart) {
    await Promise.resolve(options.onStart(stats));
  }

  const port = await getPort();
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const fastify = Fastify({ logger: true });

  try {
    fastify.register(FastifyStatic, {
      root: resolve(stats.compilation.compiler.options.output.path),
    });

    /* const address = */ await fastify.listen(port);

    const page = await browser.newPage();

    await handlePage(page, options, port);

    if (options.onDone) options.onDone();
  } finally {
    browser.close();
    fastify.close();
  }
}

class RunInPuppeteerPlugin { 
  constructor(options = {}) {
    this.options = options;
  }

  apply(compiler) {
    compiler.hooks.done.tapPromise("wsi-test", async (stats) => {
      if (stats.compilation.errors.length === 0) {
        await testWithPuppeteer(stats, this.options);
      }
    });
  }
}

const { HTML_PLUGIN } = process.env;

function createHtmlPlugin(config = {}) {
  const plugin = HTML_PLUGIN === "webpack" ? HtmlWebpackPlugin : HtmlRspackPlugin;
  if (HTML_PLUGIN === "rspack") {
    config.minify = false;
  }
  return new plugin(config);
}

function createIntegrityPlugin(config = {}) {
  if (HTML_PLUGIN === "webpack") {
    config.htmlPlugin = require.resolve("html-webpack-plugin");
  }
  return new SubresourceIntegrityPlugin(config);
}

function getHtmlPlugin() {
  return HTML_PLUGIN === "webpack" ? HtmlWebpackPlugin : HtmlRspackPlugin;
}

function getDist(dir) {
  return join(dir, `dist/${HTML_PLUGIN || "webpack"}`);
}

export {
  RunInPuppeteerPlugin,
  testWithPuppeteer,
  createHtmlPlugin,
  createIntegrityPlugin,
  getHtmlPlugin,
  getDist
};
