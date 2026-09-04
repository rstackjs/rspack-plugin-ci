/* eslint-env browser */
import path from 'path';
import { CssExtractRspackPlugin } from '@rspack/core';
import { describe, expect, it } from 'rstack/test';
import {
  compile,
  getCompiler,
  getErrors,
  getWarnings,
  runInJsDom,
} from './helpers/index.js';

describe('linkType option', () => {
  const outputRoot = path.resolve(import.meta.dirname, 'js', 'link-tag-option');

  it(`should work without linkType option`, async () => {
    const compiler = getCompiler(
      'attributes.js',
      {},
      {
        output: {
          publicPath: '',
          path: outputRoot,
          filename: '[name].bundle.js',
        },
        plugins: [
          new CssExtractRspackPlugin({
            filename: '[name].css',
          }),
        ],
      },
    );
    const stats = await compile(compiler);

    runInJsDom('main.bundle.js', compiler, stats, (dom) => {
      expect(dom.serialize()).toMatchSnapshot('DOM');
    });

    expect(getWarnings(stats)).toMatchSnapshot('warnings');
    expect(getErrors(stats)).toMatchSnapshot('errors');
  });

  it(`should work when linkType option is "false"`, async () => {
    const compiler = getCompiler(
      'attributes.js',
      {},
      {
        output: {
          publicPath: '',
          path: outputRoot,
          filename: '[name].bundle.js',
        },
        plugins: [
          new CssExtractRspackPlugin({
            linkType: false,
            filename: '[name].css',
          }),
        ],
      },
    );
    const stats = await compile(compiler);

    runInJsDom('main.bundle.js', compiler, stats, (dom) => {
      expect(dom.serialize()).toMatchSnapshot('DOM');
    });

    expect(getWarnings(stats)).toMatchSnapshot('warnings');
    expect(getErrors(stats)).toMatchSnapshot('errors');
  });

  it(`should work when linkType option is "text/css"`, async () => {
    const compiler = getCompiler(
      'attributes.js',
      {},
      {
        output: {
          publicPath: '',
          path: outputRoot,
          filename: '[name].bundle.js',
        },
        plugins: [
          new CssExtractRspackPlugin({
            linkType: 'text/css',
            filename: '[name].css',
          }),
        ],
      },
    );
    const stats = await compile(compiler);

    runInJsDom('main.bundle.js', compiler, stats, (dom) => {
      expect(dom.serialize()).toMatchSnapshot('DOM');
    });

    expect(getWarnings(stats)).toMatchSnapshot('warnings');
    expect(getErrors(stats)).toMatchSnapshot('errors');
  });
});
