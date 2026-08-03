import { ExpoConfig } from 'expo/config';

// ───────────────────────────────────────────────────────────────────────────
// Project names & identifiers — single source of truth.
// Full explanation of each (and how costly it is to change) lives in docs/IDENTIFIERS.md.
// ───────────────────────────────────────────────────────────────────────────

// Display name — user-facing (home screen, Health prompts, in-app text via
// app/config/branding.ts). Safe to change anytime; rebuild to apply natively.
const APP_NAME = 'Cadence';

// Deep-link URL scheme. Cosmetic; safe to change (affects deep links only).
const SCHEME = 'cadence';

// EAS project slug. Tied to the EAS project — change only with care.
const SLUG = 'period-app';

// EAS account that owns the project.
const EAS_OWNER = 'kratijain26';

// EAS project id — created/managed by `eas init`; do NOT hand-edit.
const EAS_PROJECT_ID = '2cd3e909-0079-4c58-9308-ca3262bef969';

// iOS bundle identifier. DO NOT change — wired to the Apple App ID, the signing
// credentials, and the Supabase Apple sign-in provider. Users never see it.
const IOS_BUNDLE_ID = 'com.syncsisters.cycle';

// Android application id — intentionally unset. This app is iOS-only for now
// (no Android build exists). Before any Google Play release, set a unique,
// permanent package id here (it can never be changed once published).
const ANDROID_PACKAGE: string | undefined = undefined;

const healthShareDescription = `${APP_NAME} reads menstrual health data from Apple Health to create social insights for you and your friends.`;
// Apple REQUIRES this key whenever the HealthKit entitlement is present, even for
// a read-only app (App Store validation rejects the build without it — learned
// 2026-08-02). We never write to Apple Health, so the string says exactly that.
const healthUpdateDescription = `${APP_NAME} does not write any data back to Apple Health.`;

const config: ExpoConfig = {
  name: APP_NAME,
  slug: SLUG,
  version: '1.0.10',
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  scheme: SCHEME,
  jsEngine: 'hermes',
  plugins: [
    [
      'expo-build-properties',
      {
        ios: {
          deploymentTarget: '15.1',
          newArchEnabled: true,
        },
      },
    ],
    [
      '@kingstinct/react-native-healthkit',
      {
        NSHealthShareUsageDescription: healthShareDescription,
        // Required by Apple for the HealthKit entitlement even though we're
        // read-only — see the const's note. Do NOT remove (fails App Store review).
        NSHealthUpdateUsageDescription: healthUpdateDescription,
        background: true,
      },
    ],
    './plugins/withNitroModulesPod',
    'expo-sqlite',
    'expo-notifications',
    'expo-image-picker',
  ],
  ios: {
    supportsTablet: false,
    bundleIdentifier: IOS_BUNDLE_ID,
    usesAppleSignIn: true,
    entitlements: {
      'com.apple.developer.healthkit': true,
    },
    infoPlist: {
      NSHealthShareUsageDescription: healthShareDescription,
      NSHealthUpdateUsageDescription: healthUpdateDescription,
      NSFaceIDUsageDescription: 'Face ID is used to secure your account if enabled in device settings.',
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  // Android config is omitted until there's an Android release (see ANDROID_PACKAGE).
  ...(ANDROID_PACKAGE ? { android: { package: ANDROID_PACKAGE } } : {}),
  extra: {
    eas: {
      projectId: EAS_PROJECT_ID,
    },
  },
  owner: EAS_OWNER,
};

export default config;
