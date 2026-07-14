const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Metro's file crawler tries to hash react-native-css-interop's own cache
// directory and fails ("Failed to get the SHA-1") in container builds
// (Railway) where that directory may already exist from a cached
// node_modules layer. It's never a real source module, so block it outright
// instead of relying on it not being written (forceWriteFileSystem: false
// alone wasn't enough once a stale cache dir was already on disk).
config.resolver.blockList = [
  ...config.resolver.blockList,
  /node_modules[\\/]react-native-css-interop[\\/]\.cache[\\/].*/,
];

module.exports = withNativeWind(config, {
  input: "./global.css",
  forceWriteFileSystem: false,
});
