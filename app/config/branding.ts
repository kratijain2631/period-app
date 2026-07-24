import Constants from 'expo-constants';

// Display name for use in JS/UI. Derived from the app config's `name`
// (set once in app.config.ts) so there is a single source of truth.
export const APP_NAME = (Constants.expoConfig?.name as string | undefined) ?? 'Cadence';
