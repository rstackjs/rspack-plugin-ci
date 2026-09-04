import path from 'path';
import fs from 'fs';
import rspack from '@rspack/core';

import { run, runEmit, runChange } from './helpers/run';
import { readAssets, getCompiler, compile } from './helpers';
import { rimrafSync } from 'rimraf';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { beforeEach, describe, expect, it } from 'rstack/test';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const FIXTURES_DIR = path.join(__dirname, 'fixtures');
describe('CopyPlugin', () => {
  beforeEach(() => {
    rimrafSync(path.join(__dirname, 'build'));
  });
  describe('basic', () => {
    it('should copy a file', async () => {
      await runEmit({
        expectedAssetKeys: ['file.txt'],
        patterns: [
          {
            from: 'file.txt',
          },
        ],
      });
    });

    it('should copy files', async () => {
      await runEmit({
        expectedAssetKeys: [
          '.dottedfile',
          'directoryfile.txt',
          'nested/deep-nested/deepnested.txt',
          'nested/nestedfile.txt',
        ],
        patterns: [
          {
            from: 'directory',
          },
        ],
      });
    });

    it('should copy files when the directory name contains brackets', async () => {
      await runEmit({
        expectedAssetKeys: ['file[1].txt'],
        patterns: [
          {
            from: 'directory[1]',
          },
        ],
      });
    });

    it('should copy files to new directory', async () => {
      await runEmit({
        expectedAssetKeys: [
          'newdirectory/.dottedfile',
          'newdirectory/directoryfile.txt',
          'newdirectory/nested/deep-nested/deepnested.txt',
          'newdirectory/nested/nestedfile.txt',
        ],
        patterns: [
          {
            from: 'directory',
            to: 'newdirectory',
          },
        ],
      });
    });

    it('should copy files to new directory with context', async () => {
      await runEmit({
        expectedAssetKeys: [
          'newdirectory/deep-nested/deepnested.txt',
          'newdirectory/nestedfile.txt',
        ],
        patterns: [
          {
            from: 'nested',
            context: 'directory',
            to: 'newdirectory',
          },
        ],
      });
    });

    it('should copy files using glob', async () => {
      await runEmit({
        expectedAssetKeys: [
          'directory/directoryfile.txt',
          'directory/nested/deep-nested/deepnested.txt',
          'directory/nested/nestedfile.txt',
        ],
        patterns: [
          {
            from: 'directory/**/*',
          },
        ],
      });
    });

    it('should copy files using glob to new directory', async () => {
      await runEmit({
        expectedAssetKeys: [
          'newdirectory/directory/directoryfile.txt',
          'newdirectory/directory/nested/deep-nested/deepnested.txt',
          'newdirectory/directory/nested/nestedfile.txt',
        ],
        patterns: [
          {
            from: 'directory/**/*',
            to: 'newdirectory',
          },
        ],
      });
    });

    it('should copy files using glob to new directory with context', async () => {
      await runEmit({
        expectedAssetKeys: [
          'newdirectory/nested/deep-nested/deepnested.txt',
          'newdirectory/nested/nestedfile.txt',
        ],
        patterns: [
          {
            from: 'nested/**/*',
            context: 'directory',
            to: 'newdirectory',
          },
        ],
      });
    });

    it('should copy a file to a new file', async () => {
      await run({
        expectedAssetKeys: ['newfile.txt'],
        patterns: [
          {
            from: 'file.txt',
            to: 'newfile.txt',
          },
        ],
      }).then(({ stats, compilation }) => {
        const assetInfo = stats.compilation.getAsset('newfile.txt');
        expect(assetInfo.info.sourceFilename).toBe('file.txt');
        expect(assetInfo.name).toBe('newfile.txt');
        expect(compilation.assets['newfile.txt']).toBeDefined();
      });
    });

    it('should copy a file to a new file with context', async () => {
      await runEmit({
        expectedAssetKeys: ['newfile.txt'],
        patterns: [
          {
            from: 'directoryfile.txt',
            context: 'directory',
            to: 'newfile.txt',
          },
        ],
      });
    });

    it('should multiple files to a new file', async () => {
      await runEmit({
        expectedAssetKeys: ['newfile.txt', 'newbinextension.bin'],
        patterns: [
          {
            from: 'file.txt',
            to: 'newfile.txt',
          },
          {
            from: 'binextension.bin',
            to: 'newbinextension.bin',
          },
        ],
      });
    });

    it('should copy multiple files with same "from"', async () => {
      await runEmit({
        expectedAssetKeys: ['first/file.txt', 'second/file.txt'],
        patterns: [
          {
            from: 'file.txt',
            to: 'first/file.txt',
          },
          {
            from: 'file.txt',
            to: 'second/file.txt',
          },
        ],
      });
    });

    it('should works with multiple patterns as String', async () => {
      await runEmit({
        expectedAssetKeys: [
          'binextension.bin',
          'file.txt',
          'noextension',
          'file[1].txt',
        ],
        patterns: [
          'binextension.bin',
          'file.txt',
          'noextension',
          'file[1].txt',
        ],
      });
    });

    it('should works with multiple patterns as Object', async () => {
      await runEmit({
        expectedAssetKeys: [
          'binextension.bin',
          'file.txt',
          'noextension',
          'file[1].txt',
        ],
        patterns: [
          {
            from: 'binextension.bin',
          },
          {
            from: 'file.txt',
          },
          {
            from: 'noextension',
          },
          {
            from: 'file[1].txt',
          },
        ],
      });
    });

    it('should work with linux path segment separation path when "from" is glob', async () => {
      await runEmit({
        expectedAssetKeys: ['directory/nested/nestedfile.txt'],
        patterns: [
          {
            from: 'directory/nested/*',
          },
        ],
      });
    });

    it('should work when "from" is a glob ending with /**', async () => {
      await runEmit({
        expectedAssetKeys: [
          'directory/nested/nestedfile.txt',
          'directory/nested/deep-nested/deepnested.txt',
        ],
        patterns: [
          {
            from: 'directory/nested/**',
          },
        ],
      });
    });

    it.skip('should exclude path with linux path segment separators', async () => {
      await runEmit({
        expectedAssetKeys: [
          '[(){}[]!+@escaped-test^$]/hello.txt',
          '[special$directory]/(special-*file).txt',
          '[special$directory]/directoryfile.txt',
          '[special$directory]/nested/nestedfile.txt',
          'dir (86)/file.txt',
          'dir (86)/nesteddir/deepnesteddir/deepnesteddir.txt',
          'dir (86)/nesteddir/nestedfile.txt',
        ],
        patterns: [
          {
            from: '!(directory)/**/*.txt',
          },
        ],
      });
    });

    it.skip('should copy files with "copied" flags', async () => {
      expect.assertions(5);

      const expectedAssetKeys = [
        '.dottedfile',
        'directoryfile.txt',
        'nested/deep-nested/deepnested.txt',
        'nested/nestedfile.txt',
      ];

      await run({
        preCopy: {
          additionalAssets: [
            { name: 'foo-bar.txt', data: 'Content', info: { custom: true } },
            {
              name: 'nested/nestedfile.txt',
              data: 'Content',
              info: { custom: true },
            },
          ],
        },
        expectedAssetKeys,
        patterns: [
          {
            from: 'directory',
            force: true,
          },
        ],
      }).then(({ stats }) => {
        for (const name of expectedAssetKeys) {
          const { info } = stats.compilation.getAsset(name);

          expect(info.copied).toBe(true);

          if (name === 'nested/nestedfile.txt') {
            expect(info.custom).toBe(true);
          }
        }
      });
    });

    it.skip('should copy files with "copied" flags', async () => {
      expect.assertions(5);

      const expectedAssetKeys = [
        'directoryfile.5d7817ed5bc246756d73.txt',
        '.dottedfile.5e294e270db6734a42f0',
        'nested/nestedfile.31d6cfe0d16ae931b73c.txt',
        'nested/deep-nested/deepnested.31d6cfe0d16ae931b73c.txt',
      ];

      await run({
        preCopy: {
          additionalAssets: [
            {
              name: 'directoryfile.5d7817ed5bc246756d73.txt',
              data: 'Content',
              info: { custom: true },
            },
          ],
        },
        expectedAssetKeys,
        patterns: [
          {
            from: 'directory',
            to: '[path][name].[contenthash][ext]',
            force: true,
          },
        ],
      }).then(({ stats }) => {
        for (const name of expectedAssetKeys) {
          const { info } = stats.compilation.getAsset(name);

          expect(info.immutable).toBe(true);

          if (name === 'directoryfile.5d7817ed5bc246756d73.txt') {
            expect(info.immutable).toBe(true);
          }
        }
      });
    });

    it('should copy files and print "copied" in the string representation ', async () => {
      expect.assertions(1);

      const expectedAssetKeys = [
        '.dottedfile',
        'directoryfile.txt',
        'nested/deep-nested/deepnested.txt',
        'nested/nestedfile.txt',
      ];

      await run({
        withExistingAsset: true,
        expectedAssetKeys,
        patterns: [
          {
            from: 'directory',
          },
        ],
      }).then(({ stats }) => {
        const stringStats = stats.toString({ assets: true });

        expect(stringStats.match(/\[copied]/g).length).toBe(4);
      });
    });

    it('should work with multi compiler mode', async () => {
      const compiler = rspack([
        {
          mode: 'development',
          context: path.resolve(__dirname, './fixtures'),
          devtool: false,
          plugins: [
            new rspack.CopyRspackPlugin({
              patterns: [
                {
                  from: path.resolve(__dirname, './fixtures/directory'),
                },
              ],
            }),
          ],
          entry: path.resolve(__dirname, './helpers/enter.js'),
          output: {
            path: path.resolve(__dirname, './outputs/multi-compiler/dist/a'),
          },
        },
        {
          plugins: [
            new rspack.CopyRspackPlugin({
              patterns: [
                {
                  context: path.resolve(__dirname, './fixtures'),
                  from: path.resolve(__dirname, './fixtures/directory'),
                },
              ],
            }),
          ],
          mode: 'development',
          entry: path.resolve(__dirname, './helpers/enter.js'),
          devtool: false,
          output: {
            path: path.resolve(__dirname, './outputs/multi-compiler/dist/b'),
          },
        },
      ]);

      // TODO: output fs system
      // compiler.compilers.forEach((item) => {
      //   // eslint-disable-next-line no-param-reassign
      //   item.outputFileSystem = createFsFromVolume(new Volume());
      // });

      const { stats } = await compile(compiler);

      stats.stats.forEach((item, index) => {
        expect(item.compilation.errors).toMatchSnapshot('errors');
        expect(item.compilation.warnings).toMatchSnapshot('warnings');
        expect(readAssets(compiler.compilers[index], item)).toMatchSnapshot(
          'assets',
        );
      });
    });

    it('should work with transform fn', async () => {
      const compiler = rspack([
        {
          mode: 'development',
          context: path.resolve(__dirname, './fixtures'),
          devtool: false,
          plugins: [
            new rspack.CopyRspackPlugin({
              patterns: [
                {
                  from: path.resolve(__dirname, './fixtures/directory'),
                  transform: (source) => {
                    return source + 'transform aaaa';
                  },
                },
              ],
            }),
          ],
          entry: path.resolve(__dirname, './helpers/enter.js'),
          output: {
            path: path.resolve(__dirname, './outputs/dist/b'),
          },
        },
      ]);

      const { stats } = await compile(compiler);

      stats.stats.forEach((item, index) => {
        expect(readAssets(compiler.compilers[index], item)).toMatchSnapshot(
          'assets',
        );
      });
    });

    it('should work with transform async fn', async () => {
      const compiler = rspack([
        {
          mode: 'development',
          context: path.resolve(__dirname, './fixtures'),
          devtool: false,
          plugins: [
            new rspack.CopyRspackPlugin({
              patterns: [
                {
                  from: path.resolve(__dirname, './fixtures/directory'),
                  transform: (source) => {
                    expect(Buffer.isBuffer(source)).toBeTruthy();
                    return Promise.resolve(source + 'transform aaaa');
                  },
                },
              ],
            }),
          ],
          entry: path.resolve(__dirname, './helpers/enter.js'),
          output: {
            path: path.resolve(__dirname, './outputs/dist/b'),
          },
        },
      ]);

      const { stats } = await compile(compiler);

      stats.stats.forEach((item, index) => {
        expect(readAssets(compiler.compilers[index], item)).toMatchSnapshot(
          'assets',
        );
      });
    });

    it('should work with to fn', async () => {
      const compiler = rspack([
        {
          mode: 'development',
          context: path.resolve(__dirname, './fixtures'),
          devtool: false,
          plugins: [
            new rspack.CopyRspackPlugin({
              patterns: [
                {
                  from: path.resolve(__dirname, './fixtures/directory'),
                  to: () => {
                    return 'directory';
                  },
                },
              ],
            }),
          ],
          entry: path.resolve(__dirname, './helpers/enter.js'),
          output: {
            path: path.resolve(__dirname, './outputs/dist/b'),
          },
        },
      ]);

      const { stats } = await compile(compiler);

      stats.stats.forEach((item, index) => {
        expect(readAssets(compiler.compilers[index], item)).toMatchSnapshot(
          'assets',
        );
      });
    });
  });

  describe('watch mode', () => {
    it('should add the file to the watch list when "from" is a file', async () => {
      const expectedAssetKeys = ['file.txt'];

      await run({
        patterns: [
          {
            from: 'file.txt',
          },
        ],
      }).then(({ compiler, stats }) => {
        expect(
          Array.from(Object.keys(readAssets(compiler, stats))).sort(),
        ).toEqual(expectedAssetKeys);
      });
    });

    it('should add a directory to the watch list when "from" is a directory', async () => {
      await run({
        patterns: [
          {
            from: 'directory',
          },
        ],
      }).then(({ stats }) => {
        const { contextDependencies } = stats.compilation;
        const isIncludeDependency = contextDependencies.has(
          path.join(FIXTURES_DIR, 'directory'),
        );

        expect(isIncludeDependency).toBe(true);
      });
    });

    it('should add a directory to the watch list when "from" is a glob', async () => {
      await run({
        patterns: [
          {
            from: 'directory/**/*',
          },
        ],
      }).then(({ stats }) => {
        const { contextDependencies } = stats.compilation;
        const isIncludeDependency = contextDependencies.has(
          path.join(FIXTURES_DIR, 'directory'),
        );

        expect(isIncludeDependency).toBe(true);
      });
    });

    it('should not add the directory to the watch list when glob is a file', async () => {
      const expectedAssetKeys = ['directoryfile.txt'];

      await run({
        patterns: [
          {
            from: 'directory/directoryfile.txt',
          },
        ],
      }).then(({ compiler, stats }) => {
        expect(Array.from(Object.keys(readAssets(compiler, stats)))).toEqual(
          expectedAssetKeys,
        );
      });
    });

    it('should include files that have changed when `from` is a file', async () => {
      await runChange({
        expectedAssetKeys: ['tempfile1.txt', 'tempfile2.txt'],
        newFileLoc1: path.join(FIXTURES_DIR, 'watch', '_t5', 'tempfile1.txt'),
        newFileLoc2: path.join(FIXTURES_DIR, 'watch', '_t5', 'tempfile2.txt'),
        patterns: [
          {
            from: 'tempfile1.txt',
            context: 'watch/_t5',
          },
          {
            from: 'tempfile2.txt',
            context: 'watch/_t5',
          },
        ],
      });
    });

    it('should include all files when `from` is a directory', async () => {
      await runChange({
        expectedAssetKeys: ['.gitkeep', 'tempfile1.txt', 'tempfile2.txt'],
        newFileLoc1: path.join(
          FIXTURES_DIR,
          'watch',
          '_t4',
          'directory',
          'tempfile1.txt',
        ),
        newFileLoc2: path.join(
          FIXTURES_DIR,
          'watch',
          '_t4',
          'directory',
          'tempfile2.txt',
        ),
        patterns: [
          {
            from: 'watch/_t4/directory',
          },
        ],
      });
    });

    it('should include all files when `from` is a glob', async () => {
      await runChange({
        expectedAssetKeys: [
          '_t3/dest1/tempfile1.txt',
          '_t3/dest1/tempfile2.txt',
        ],
        newFileLoc1: path.join(
          FIXTURES_DIR,
          'watch',
          '_t3',
          'directory',
          'tempfile1.txt',
        ),
        newFileLoc2: path.join(
          FIXTURES_DIR,
          'watch',
          '_t3',
          'directory',
          'tempfile2.txt',
        ),
        patterns: [
          {
            context: 'watch/_t3/directory',
            from: '**/*.txt',
            to: '_t3/dest1',
          },
        ],
      });
    });

    it('should include all files when multiple patterns used', async () => {
      await runChange({
        expectedAssetKeys: [
          '_t2/dest1/tempfile1.txt',
          '_t2/dest1/tempfile2.txt',
          '_t2/dest2/tempfile1.txt',
          '_t2/dest2/tempfile2.txt',
        ],
        newFileLoc1: path.join(
          FIXTURES_DIR,
          'watch',
          '_t2',
          'directory',
          'tempfile1.txt',
        ),
        newFileLoc2: path.join(
          FIXTURES_DIR,
          'watch',
          '_t2',
          'directory',
          'tempfile2.txt',
        ),
        patterns: [
          {
            context: 'watch/_t2/directory',
            from: '**/*.txt',
            to: '_t2/dest1',
          },
          {
            context: 'watch/_t2/directory',
            from: '**/*.txt',
            to: '_t2/dest2',
          },
        ],
      });
    });

    it('should include all files when multiple patterns with difference contexts', async () => {
      await runChange({
        expectedAssetKeys: [
          '_t1/dest1/tempfile1.txt',
          '_t1/dest2/directory/tempfile1.txt',
          '_t1/dest2/tempfile2.txt',
        ],
        newFileLoc1: path.join(
          FIXTURES_DIR,
          'watch',
          '_t1',
          'directory',
          'tempfile1.txt',
        ),
        newFileLoc2: path.join(FIXTURES_DIR, 'watch', '_t1', 'tempfile2.txt'),
        patterns: [
          {
            context: 'watch/_t1/directory',
            from: '**/*.txt',
            to: '_t1/dest1',
          },
          {
            context: 'watch/_t1',
            from: '**/*.txt',
            to: '_t1/dest2',
          },
        ],
      });
    });

    it('should run once on child compilation', async () => {
      const expectedAssetKeys = ['file.txt'];

      await run({
        patterns: [
          {
            from: 'file.txt',
          },
        ],
      }).then(({ compiler, stats }) => {
        expect(
          Array.from(Object.keys(readAssets(compiler, stats))).sort(),
        ).toEqual(expectedAssetKeys);
      });
    });
  });

  describe.skip('cache', () => {
    it('should work with the "memory" cache', async () => {
      const compiler = getCompiler({
        cache: {
          type: 'memory',
        },
        plugins: [
          new rspack.CopyRspackPlugin({
            patterns: [
              {
                from: path.resolve(__dirname, './fixtures/directory'),
              },
            ],
          }),
        ],
      });

      const { stats } = await compile(compiler);

      expect(stats.compilation.emittedAssets.size).toBe(5);
      expect(readAssets(compiler, stats)).toMatchSnapshot('assets');
      expect(stats.toJson().errors).toMatchSnapshot('errors');
      expect(stats.toJson().warnings).toMatchSnapshot('warnings');

      const { stats: newStats } = await compile(compiler);

      expect(newStats.compilation.emittedAssets.size).toBe(0);
      expect(readAssets(compiler, newStats)).toMatchSnapshot('assets');
      expect(newStats.toJson().errors).toMatchSnapshot('errors');
      expect(newStats.toJson().warnings).toMatchSnapshot('warnings');
    });

    it('should work with the "filesystem" cache', async () => {
      const cacheDirectory = path.resolve(__dirname, './outputs/.cache/simple');

      try {
        fs.rmdirSync(cacheDirectory, { recursive: true });
      } catch (_) {
        // Nothing
      }

      const compiler = getCompiler({
        cache: {
          type: 'filesystem',
          cacheDirectory,
        },
        plugins: [
          new rspack.CopyRspackPlugin({
            patterns: [
              {
                from: path.resolve(__dirname, './fixtures/directory'),
              },
            ],
          }),
        ],
      });

      const { stats } = await compile(compiler);

      expect(stats.compilation.emittedAssets.size).toBe(5);
      expect(readAssets(compiler, stats)).toMatchSnapshot('assets');
      expect(stats.toJson().errors).toMatchSnapshot('errors');
      expect(stats.toJson().warnings).toMatchSnapshot('warnings');

      const { stats: newStats } = await compile(compiler);

      expect(newStats.compilation.emittedAssets.size).toBe(0);
      expect(readAssets(compiler, newStats)).toMatchSnapshot('assets');
      expect(newstats.toJson().errors).toMatchSnapshot('errors');
      expect(newstats.toJson().warnings).toMatchSnapshot('warnings');
    });

    it('should work with the "filesystem" cache and multi compiler mode', async () => {
      const cacheDirectoryA = path.resolve(
        __dirname,
        './outputs/.cache/multi-compiler/a',
      );
      const cacheDirectoryB = path.resolve(
        __dirname,
        './outputs/.cache/multi-compiler/b',
      );

      try {
        fs.rmdirSync(cacheDirectoryA, { recursive: true });
        fs.rmdirSync(cacheDirectoryB, { recursive: true });
      } catch (_) {
        // Nothing
      }

      const compiler = rspack([
        {
          mode: 'development',
          context: path.resolve(__dirname, './fixtures'),
          entry: path.resolve(__dirname, './helpers/enter.js'),
          output: {
            path: path.resolve(__dirname, './outputs/multi-compiler/dist/a'),
          },
          cache: {
            type: 'filesystem',
            cacheDirectory: cacheDirectoryA,
          },
          plugins: [
            new rspack.CopyRspackPlugin({
              patterns: [
                {
                  from: path.resolve(__dirname, './fixtures/directory'),
                },
              ],
            }),
          ],
        },
        {
          mode: 'development',
          entry: path.resolve(__dirname, './helpers/enter.js'),
          output: {
            path: path.resolve(__dirname, './outputs/multi-compiler/dist/b'),
          },
          cache: {
            type: 'filesystem',
            cacheDirectory: cacheDirectoryB,
          },
          plugins: [
            new rspack.CopyRspackPlugin({
              patterns: [
                {
                  context: path.resolve(__dirname, './fixtures'),
                  from: path.resolve(__dirname, './fixtures/directory'),
                },
              ],
            }),
          ],
        },
      ]);

      // TODO output fs system
      // compiler.compilers.forEach((item) => {
      //   // eslint-disable-next-line no-param-reassign
      //   item.outputFileSystem = createFsFromVolume(new Volume());
      // });

      const { stats } = await compile(compiler);

      stats.stats.forEach((item, index) => {
        expect(item.compilation.emittedAssets.size).toBe(5);
        expect(item.compilation.errors).toMatchSnapshot('errors');
        expect(item.compilation.warnings).toMatchSnapshot('warnings');
        expect(readAssets(compiler.compilers[index], item)).toMatchSnapshot(
          'assets',
        );
      });
      const { stats: newStats } = await compile(compiler);

      newStats.stats.forEach((item, index) => {
        expect(item.compilation.emittedAssets.size).toBe(0);
        expect(item.compilation.errors).toMatchSnapshot('errors');
        expect(item.compilation.warnings).toMatchSnapshot('warnings');
        expect(readAssets(compiler.compilers[index], item)).toMatchSnapshot(
          'assets',
        );
      });
    });
  });

  describe('stats', () => {
    it('should minify', async () => {
      const compiler = getCompiler({
        mode: 'production',
        entry: path.resolve(__dirname, './helpers/enter-with-asset-modules.js'),
        plugins: [
          new rspack.CopyRspackPlugin({
            patterns: [
              {
                from: path.resolve(__dirname, './fixtures/js'),
                info: {
                  minimized: false,
                },
              },
            ],
          }),
        ],
      });

      const { stats } = await compile(compiler);

      expect(readAssets(compiler, stats)).toMatchSnapshot('assets');
    });

    it('should not minify', async () => {
      const compiler = getCompiler({
        mode: 'production',
        entry: path.resolve(__dirname, './helpers/enter-with-asset-modules.js'),
        plugins: [
          new rspack.CopyRspackPlugin({
            patterns: [
              {
                from: path.resolve(__dirname, './fixtures/js'),
                info: {
                  minimized: true,
                },
              },
            ],
          }),
        ],
      });

      const { stats } = await compile(compiler);

      expect(readAssets(compiler, stats)).toMatchSnapshot('assets');
    });
  });

  describe.skip('logging', () => {
    it('should logging when "from" is a file', async () => {
      const expectedAssetKeys = ['file.txt'];

      await run({
        patterns: [
          {
            from: 'file.txt',
          },
        ],
      }).then(({ compiler, stats }) => {
        const root = path.resolve(__dirname).replace(/\\/g, '/');
        const logs = stats.compilation.logging
          .get('copy-rspack-plugin')
          .map((entry) =>
            entry.args[0].replace(/\\/g, '/').split(root).join('.'),
          )
          .sort();

        expect(
          Array.from(Object.keys(readAssets(compiler, stats))).sort(),
        ).toEqual(expectedAssetKeys);
        expect({ logs }).toMatchSnapshot('logs');
      });
    });

    it('should logging when "from" is a directory', async () => {
      const expectedAssetKeys = [
        '.dottedfile',
        'directoryfile.txt',
        'nested/deep-nested/deepnested.txt',
        'nested/nestedfile.txt',
      ];

      await run({
        patterns: [
          {
            from: 'directory',
          },
        ],
      }).then(({ compiler, stats }) => {
        const root = path.resolve(__dirname).replace(/\\/g, '/');
        const logs = stats.compilation.logging
          .get('copy-rspack-plugin')
          .map((entry) =>
            entry.args[0].replace(/\\/g, '/').split(root).join('.'),
          )
          .sort();

        expect(
          Array.from(Object.keys(readAssets(compiler, stats))).sort(),
        ).toEqual(expectedAssetKeys);
        expect({ logs }).toMatchSnapshot('logs');
      });
    });

    it('should logging when "from" is a glob', async () => {
      const expectedAssetKeys = [
        'directory/directoryfile.txt',
        'directory/nested/deep-nested/deepnested.txt',
        'directory/nested/nestedfile.txt',
      ];

      await run({
        patterns: [
          {
            from: 'directory/**',
            globOptions: {
              onlyFiles: false,
            },
          },
        ],
      }).then(({ compiler, stats }) => {
        const root = path.resolve(__dirname).replace(/\\/g, '/');
        const logs = stats.compilation.logging
          .get('copy-rspack-plugin')
          .map((entry) =>
            entry.args[0].replace(/\\/g, '/').split(root).join('.'),
          )
          .sort();

        expect(
          Array.from(Object.keys(readAssets(compiler, stats))).sort(),
        ).toEqual(expectedAssetKeys);
        expect({ logs }).toMatchSnapshot('logs');
      });
    });

    it("should logging when 'to' is a function", async () => {
      const expectedAssetKeys = ['newFile.txt'];

      await run({
        patterns: [
          {
            from: 'file.txt',
            to() {
              return 'newFile.txt';
            },
          },
        ],
      }).then(({ compiler, stats }) => {
        expect(
          Array.from(Object.keys(readAssets(compiler, stats))).sort(),
        ).toEqual(expectedAssetKeys);
        expect({ logs }).toMatchSnapshot('logs');
      });
    });
  });
});
