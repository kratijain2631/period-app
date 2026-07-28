import Constants from 'expo-constants';

// Display name for use in JS/UI. Derived from the app config's `name`
// (set once in app.config.ts) so there is a single source of truth.
export const APP_NAME = (Constants.expoConfig?.name as string | undefined) ?? 'Cadence';

// Tagline shown on the launch screen and usable elsewhere in the UI.
export const APP_TAGLINE = 'where your cycle meets your circle';

// Public TestFlight join link, shared from the "Invite Friends" button so
// people can install the (beta) app. Update when the TestFlight/App Store
// distribution link changes. See docs/TODO.md.
export const TESTFLIGHT_INVITE_URL = 'https://testflight.apple.com/join/akMkE8kW';
