# Cadence

Where your cycle meets your circle.

> **Names & identifiers:** the app's display name, bundle ids, EAS project, scheme, and other identifiers are documented in [IDENTIFIERS.md](IDENTIFIERS.md). The display name lives in one place — `APP_NAME` in `app.config.ts`.

**Project docs:** [Release notes](RELEASE_NOTES.md) · [Identifiers](IDENTIFIERS.md) · [Open todos](TODO.md)

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

### Run the app without a full rebuild (dev client)
HealthKit and Apple Sign in with Apple require a custom dev client (Expo Go is insufficient). Build once, then iterate with Metro:

```bash
# build the dev client once (installs native HealthKit/SIWA deps)
eas build --profile development --platform ios

# install the .ipa from the EAS build page on your device

# start Metro for the dev client (hot reloads JS)
npx expo start --dev-client
```

Make sure the device and your computer are on the same network, or pass `--tunnel` if LAN is blocked. Open the dev client app on your device and scan the QR from the Metro terminal.

### Preview/Test Builds

```bash
# build an internal iOS preview (uses HealthKit + SIWA entitlements)
eas build --profile preview --platform ios
```

Before running the preview build, confirm that `app.json` has the correct `ios.bundleIdentifier` tied to your Apple Developer account and that HealthKit capability is enabled for that App ID. If the build fails with pod-related errors, ensure `@react-native-community/cli` dev dependencies are installed (already included in `package.json`) and try again.
