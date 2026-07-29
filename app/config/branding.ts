import Constants from 'expo-constants';

// Display name for use in JS/UI. Derived from the app config's `name`
// (set once in app.config.ts) so there is a single source of truth.
export const APP_NAME = (Constants.expoConfig?.name as string | undefined) ?? 'Cadence';

// Tagline shown on the launch screen and usable elsewhere in the UI.
export const APP_TAGLINE = 'where your cycle meets your circle';

// Public install link shared from the "Invite Friends" button. Points at the
// TestFlight join link for now; swap to the App Store URL at public launch.
// See docs/TODO.md.
export const APP_INVITE_URL = 'https://testflight.apple.com/join/akMkE8kW';
