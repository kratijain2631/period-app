const { withPodfile } = require('@expo/config-plugins');

const POD_SNIPPET =
  "  pod 'NitroModules', :path => File.expand_path('../node_modules/react-native-nitro-modules/NitroModules.podspec', __dir__)\n";

module.exports = function withNitroModulesPod(config) {
  return withPodfile(config, (config) => {
    if (config.modResults.contents.includes("react-native-nitro-modules/NitroModules.podspec")) {
      return config;
    }

    config.modResults.contents = config.modResults.contents.replace(
      /use_expo_modules!\s*/,
      (match) => `${match}${POD_SNIPPET}`,
    );

    return config;
  });
};
