const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, {
  input: "./global.css",
  // Writing NativeWind's CSS cache into node_modules confuses Metro's file
  // crawler in container builds (Railway) with a "Failed to get the SHA-1"
  // error. This project is web-only (no iOS dev workflow in use), so it's
  // always off rather than depending on NODE_ENV being set correctly.
  forceWriteFileSystem: false,
});
