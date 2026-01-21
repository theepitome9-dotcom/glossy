const { getDefaultConfig } = require("expo/metro-config");
const { withVibecodeMetro } = require("@vibecodeapp/sdk/metro");

const config = getDefaultConfig(__dirname);

// Disable Watchman for Windows
config.resolver.useWatchman = false;

// SVG + Vibecode support
withVibecodeMetro(config);

config.transformer = {
  ...config.transformer,
  unstable_allowRequireContext: true,
};

module.exports = config;
