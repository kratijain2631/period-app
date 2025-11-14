# period-app

Where your cycle meets your circle.

## Getting Started

```bash
# install dependencies
npm install

# set up EAS credentials (one-time)
eas login
eas build:configure

# run the dev client
npm run start
```

### Preview/Test Builds

```bash
# build an internal iOS preview (uses HealthKit + SIWA entitlements)
eas build --profile preview --platform ios
```

Before running the preview build, confirm that `app.json` has the correct `ios.bundleIdentifier` tied to your Apple Developer account and that HealthKit capability is enabled for that App ID. If the build fails with pod-related errors, ensure `@react-native-community/cli` dev dependencies are installed (already included in `package.json`) and try again.
