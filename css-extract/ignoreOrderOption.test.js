import path from 'path';
import { rspack as webpack } from '@rspack/core';
import { createRequire } from 'module';
import { describe, expect, it } from 'rstack/test';
const require = createRequire(import.meta.url);

describe('IgnoreOrder', () => {
  const outputRoot = path.resolve(import.meta.dirname, 'js', 'ignore-order');

  it('should emit warnings', async () => {
    const casesDirectory = path.resolve(import.meta.dirname, 'cases');
    const directoryForCase = path.resolve(casesDirectory, 'ignoreOrderFalse');
    // eslint-disable-next-line import/no-dynamic-require, global-require
    const webpackConfig = (
      await import(path.resolve(directoryForCase, 'webpack.config.mjs'))
    ).default;
    const compiler = webpack({
      ...webpackConfig,
      output: {
        path: path.join(outputRoot, 'ignoreOrderFalse'),
      },
      mode: 'development',
      context: directoryForCase,
      cache: false,
      experiments: {
        css: false,
      },
    });
    await new Promise((resolve) => {
      compiler.run((err1, stats) => {
        expect(stats.hasWarnings()).toBe(true);
        resolve();
      });
    });
  });

  it('should not emit warnings', async () => {
    const casesDirectory = path.resolve(import.meta.dirname, 'cases');
    const directoryForCase = path.resolve(casesDirectory, 'ignoreOrder');
    // eslint-disable-next-line import/no-dynamic-require, global-require
    const webpackConfig = (
      await import(path.resolve(directoryForCase, 'webpack.config.mjs'))
    ).default;
    const compiler = webpack({
      ...webpackConfig,
      output: {
        path: path.join(outputRoot, 'ignoreOrder'),
      },
      mode: 'development',
      context: directoryForCase,
      cache: false,
      experiments: {
        css: false,
      },
    });
    await new Promise((resolve) => {
      compiler.run((err1, stats) => {
        expect(stats.hasWarnings()).toBe(false);
        resolve();
      });
    });
  });
});
