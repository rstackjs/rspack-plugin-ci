/* eslint-env browser */
/* eslint-disable no-console */

import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const rspackPath = require.resolve('@rspack/core');
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  rstest,
} from 'rstack/test';
const hotModuleReplacement = (
  await import(path.join(rspackPath, '../cssExtractHmr.js'))
).cssReload;
// const hotLoader = require(path.join(rspackPath, './cssExtractHmr.js')).cssReload;
function getLoadEvent() {
  const event = document.createEvent('Event');

  event.initEvent('load', false, false);

  return event;
}

function getErrorEvent() {
  const event = document.createEvent('Event');

  event.initEvent('error', false, false);

  return event;
}

describe('HMR', () => {
  let consoleMock = null;

  beforeEach(() => {
    consoleMock = rstest
      .spyOn(console, 'log')
      .mockImplementation(() => () => {});

    rstest.spyOn(Date, 'now').mockImplementation(() => 1479427200000);

    document.head.innerHTML = '<link rel="stylesheet" href="/dist/main.css" />';
    document.body.innerHTML = '<script src="/dist/main.js"></script>';
  });

  afterEach(() => {
    consoleMock.mockClear();
  });

  it('should works', async () => {
    const update = hotModuleReplacement('./src/style.css', {});

    update();

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(console.log.mock.calls[0][0]).toMatchSnapshot();

    const links = Array.prototype.slice.call(document.querySelectorAll('link'));

    expect(links[0].visited).toBe(true);
    expect(document.head.innerHTML).toMatchSnapshot();

    links[1].dispatchEvent(getLoadEvent());

    expect(links[1].isLoaded).toBe(true);
  });

  it('should works with multiple updates', async () => {
    const update = hotModuleReplacement('./src/style.css', {});

    update();

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(console.log.mock.calls[0][0]).toMatchSnapshot();

    const links = Array.prototype.slice.call(document.querySelectorAll('link'));

    expect(links[0].visited).toBe(true);
    expect(document.head.innerHTML).toMatchSnapshot();

    links[1].dispatchEvent(getLoadEvent());

    expect(links[1].isLoaded).toBe(true);

    rstest.spyOn(Date, 'now').mockImplementation(() => 1479427200001);

    const update2 = hotModuleReplacement('./src/style.css', {});

    update2();

    await new Promise((resolve) => setTimeout(resolve, 100));
    const links2 = Array.prototype.slice.call(
      document.querySelectorAll('link'),
    );

    expect(links2[0].visited).toBe(true);
    expect(links2[0].isLoaded).toBe(true);
    expect(document.head.innerHTML).toMatchSnapshot();

    links2[1].dispatchEvent(getLoadEvent());

    expect(links2[1].isLoaded).toBe(true);
  });

  it('should reloads with locals', async () => {
    const update = hotModuleReplacement('./src/style.css', {
      locals: { foo: 'bar' },
    });

    update();

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(console.log.mock.calls[0][0]).toMatchSnapshot();

    const links = Array.prototype.slice.call(document.querySelectorAll('link'));

    expect(links[0].visited).toBe(true);
    expect(document.head.innerHTML).toMatchSnapshot();

    links[1].dispatchEvent(getLoadEvent());

    expect(links[1].isLoaded).toBe(true);
  });

  it('should work reload all css', async () => {
    const update = hotModuleReplacement('./src/style.css', {
      filename: 'unreload_url',
    });

    update();

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(console.log.mock.calls[0][0]).toMatchSnapshot();

    const links = Array.prototype.slice.call(document.querySelectorAll('link'));

    expect(links[0].visited).toBe(true);
    expect(document.head.innerHTML).toMatchSnapshot();

    links[1].dispatchEvent(getLoadEvent());

    expect(links[1].isLoaded).toBe(true);
  });

  it('should reloads with non http/https link href', async () => {
    document.head.innerHTML =
      '<link rel="stylesheet" href="/dist/main.css" /><link rel="shortcut icon" href="data:;base64,=" />';

    const update = hotModuleReplacement('./src/style.css', {});

    update();

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(console.log.mock.calls[0][0]).toMatchSnapshot();

    const links = Array.prototype.slice.call(document.querySelectorAll('link'));

    expect(links[0].visited).toBe(true);
    expect(document.head.innerHTML).toMatchSnapshot();

    links[1].dispatchEvent(getLoadEvent());

    expect(links[1].isLoaded).toBe(true);
    expect(links[2].visited).toBeUndefined();
  });

  it('should reloads with # link href', async () => {
    document.head.innerHTML =
      '<link rel="stylesheet" href="/dist/main.css" /><link rel="shortcut icon" href="#href" />';

    const update = hotModuleReplacement('./src/style.css', {});

    update();

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(console.log.mock.calls[0][0]).toMatchSnapshot();

    const links = Array.prototype.slice.call(document.querySelectorAll('link'));

    expect(links[0].visited).toBe(true);
    expect(document.head.innerHTML).toMatchSnapshot();

    links[1].dispatchEvent(getLoadEvent());

    expect(links[1].isLoaded).toBe(true);
    expect(links[2].visited).toBeUndefined();
  });

  it('should reloads with link without href', async () => {
    document.head.innerHTML =
      '<link rel="stylesheet" href="/dist/main.css" /><link rel="shortcut icon" />';

    const update = hotModuleReplacement('./src/style.css', {});

    update();

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(console.log.mock.calls[0][0]).toMatchSnapshot();

    const links = Array.prototype.slice.call(document.querySelectorAll('link'));

    expect(links[0].visited).toBe(true);
    expect(document.head.innerHTML).toMatchSnapshot();

    links[1].dispatchEvent(getLoadEvent());

    expect(links[1].isLoaded).toBe(true);
    expect(links[2].visited).toBeUndefined();
  });

  it('should reloads with absolute remove url', async () => {
    document.head.innerHTML =
      '<link rel="stylesheet" href="/dist/main.css" /><link rel="stylesheet" href="http://dev.com/dist/main.css" />';

    const update = hotModuleReplacement('./src/style.css', {});

    update();

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(console.log.mock.calls[0][0]).toMatchSnapshot();

    const links = Array.prototype.slice.call(document.querySelectorAll('link'));

    expect(links[0].visited).toBe(true);
    expect(document.head.innerHTML).toMatchSnapshot();

    links[1].dispatchEvent(getLoadEvent());

    expect(links[1].isLoaded).toBe(true);
    expect(links[2].visited).toBeUndefined();
  });

  it('should reloads with browser extension protocol', async () => {
    document.head.innerHTML =
      '<link rel="stylesheet" href="/dist/main.css" /><link rel="stylesheet" href="chrome-extension://main.css" />';

    const update = hotModuleReplacement('./src/style.css', {});

    update();

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(console.log.mock.calls[0][0]).toMatchSnapshot();

    const links = Array.prototype.slice.call(document.querySelectorAll('link'));

    expect(links[0].visited).toBe(true);
    expect(document.head.innerHTML).toMatchSnapshot();

    links[1].dispatchEvent(getLoadEvent());

    expect(links[1].isLoaded).toBe(true);
    expect(links[2].visited).toBeUndefined();
  });

  it('should reloads with non-file script in the end of page', async () => {
    document.body.appendChild(document.createElement('script'));

    const update = hotModuleReplacement('./src/non_file_styles.css', {});

    update();

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(console.log.mock.calls[0][0]).toMatchSnapshot();

    const links = Array.prototype.slice.call(document.querySelectorAll('link'));

    expect(links[0].visited).toBe(true);
    expect(document.head.innerHTML).toMatchSnapshot();

    links[1].dispatchEvent(getLoadEvent());

    expect(links[1].isLoaded).toBe(true);
  });

  it('should handle error event', async () => {
    const update = hotModuleReplacement('./src/style.css', {});

    update();

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(console.log.mock.calls[0][0]).toMatchSnapshot();

    const links = Array.prototype.slice.call(document.querySelectorAll('link'));

    expect(links[0].visited).toBe(true);
    expect(document.head.innerHTML).toMatchSnapshot();

    links[1].dispatchEvent(getErrorEvent());

    expect(links[1].isLoaded).toBe(true);
  });

  it('should not remove old link when new link is loaded twice', async () => {
    const link = document.createElement('link');

    link.innerHTML = '<link rel="preload stylesheet" href="./dist/main.css" />';
    document.head.appendChild(link);
    document.head.removeChild = rstest.fn();

    const update = hotModuleReplacement('./dist/main.css', {});

    update();

    await new Promise((resolve) => setTimeout(resolve, 100));
    const links = Array.prototype.slice.call(document.querySelectorAll('link'));

    links[1].dispatchEvent(getLoadEvent());
    links[1].dispatchEvent(getLoadEvent());

    expect(document.head.removeChild).toHaveBeenCalledTimes(1);
  });

  // it("hotLoader works for non-locals", () => {
  //   const o = Date.now;
  //   Date.now = () => 1;
  //   const code = hotLoader("//content;", {
  //     loaderContext: {
  //       context: __dirname,
  //     },
  //   });
  //   Date.now = o;
  //   expect(code).toMatchSnapshot();
  // });

  // it("hotLoader works for locals", () => {
  //   const o = Date.now;
  //   Date.now = () => 1;
  //   const code = hotLoader("//content;", {
  //     loaderContext: {
  //       context: __dirname,
  //     },
  //     locals: { foo: "bar" },
  //   });
  //   Date.now = o;
  //   expect(code).toMatchSnapshot();
  // });
});
