module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // ← kein reanimated plugin mehr!
  };
};