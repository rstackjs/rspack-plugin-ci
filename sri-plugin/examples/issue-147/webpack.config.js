import { createHtmlPlugin, createIntegrityPlugin, getDist } from '../wsi-test-helper.js';
import path from 'path';
import ScriptExtHtmlWebpackPlugin from 'script-ext-html-webpack-plugin';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);





export default () => ({
  entry: {
    app: path.resolve(__dirname, "index"),
  },
  output: {
    path: path.join(getDist(__dirname), "inline"),
    crossOriginLoading: "anonymous",
  },
  optimization: {
    runtimeChunk: {
      // Put webpack runtime code in a single separate chunk called "runtime.js"
      name: "runtime",
    },
  },
  plugins: [
    createHtmlPlugin({
      inject: "body",
    }),
    new ScriptExtHtmlWebpackPlugin({
      inline: {
        // Inline "runtime.js" as a <script> tag in the HTML
        chunks: "initial",
        test: "runtime",
      },
    }),
    createIntegrityPlugin({
    }),
  ],
});
