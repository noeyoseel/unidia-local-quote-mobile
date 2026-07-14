const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, {
  input: "./global.css",
  // Force write CSS to file system instead of virtual modules.
  // This fixes iOS styling issues in local development, but writing into
  // node_modules confuses Metro's file crawler in container builds (Railway)
  // with a "Failed to get the SHA-1" error, so it's disabled for production.
  forceWriteFileSystem: process.env.NODE_ENV !== "production",
});
