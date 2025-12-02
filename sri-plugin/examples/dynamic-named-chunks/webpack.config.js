const { RunInPuppeteerPlugin, createIntegrityPlugin, createHtmlPlugin, getDist } = require("../wsi-test-helper");

module.exports = {
  entry: {
    index: "./index.js",
  },
  output: {
    crossOriginLoading: "anonymous",
    path: getDist(__dirname),
  },
  optimization: {
    chunkIds: "named",
    minimize: false
  },
  plugins: [
    createIntegrityPlugin({
      hashFuncNames: ["sha256", "sha384"],
    }),
    createHtmlPlugin(),
    new RunInPuppeteerPlugin(),
  ],
};
