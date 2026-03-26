module.exports = function (api) {
  api.cache(true);
  const plugins = [];
  if (process.env.NODE_ENV === 'production') {
    plugins.push('babel-plugin-transform-remove-console');
  }
  return {
    presets: [
      '@babel/preset-typescript'
    ],
    plugins
  };
};