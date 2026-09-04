import rspack, {
  HtmlRspackPlugin,
  SubresourceIntegrityPlugin,
} from '@rspack/core';

export { HtmlRspackPlugin, SubresourceIntegrityPlugin };

const errorFromStats = (stats) => {
  const errors = stats?.toJson()?.errors;
  if (!errors) {
    return new Error('No stats');
  }
  return new Error('Error:' + errors.map((error) => error.message).join(', '));
};

export const runRspack = (options) =>
  new Promise((resolve, reject) => {
    rspack(options, (err, stats) => {
      if (err) {
        reject(err);
      } else if (stats?.hasErrors() === false) {
        resolve(stats);
      } else {
        reject(errorFromStats(stats));
      }
    });
  });
