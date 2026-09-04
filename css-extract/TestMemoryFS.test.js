import path from 'path';
import { createFsFromVolume, Volume } from 'memfs';
import webpack from '@rspack/core';
import { describe, expect, it } from 'rstack/test';

const assetsNames = (assets) => assets.map((asset) => asset.name);

describe('TestMemoryFS', () => {
  it('should preserve asset even if not emitted', async () => {
    const casesDirectory = path.resolve(import.meta.dirname, 'cases');
    const directoryForCase = path.resolve(
      casesDirectory,
      'publicpath-default-auto',
    );
    // eslint-disable-next-line import/no-dynamic-require, global-require
    const webpackConfig = (
      await import(path.resolve(directoryForCase, 'webpack.config.mjs'))
    ).default;
    const compiler = webpack({
      ...webpackConfig,
      mode: 'development',
      context: directoryForCase,
      cache: false,
    });

    compiler.outputFileSystem = createFsFromVolume(new Volume());

    await new Promise((resolve, reject) => {
      compiler.run((err1, stats1) => {
        if (err1) {
          reject(err1);

          return;
        }

        // CHANGE: The compilation instance of Rspack will be dropped on the Rust side after compilation.
        // So we should obtain all the assets information after the next time the compile.
        const names1 = assetsNames(stats1.compilation.getAssets());

        compiler.run((err2, stats2) => {
          if (err2) {
            reject(err2);

            return;
          }

          const names2 = assetsNames(stats2.compilation.getAssets());
          expect(names1).toEqual(names2);

          resolve();
        });
      });
    });
  });
});
