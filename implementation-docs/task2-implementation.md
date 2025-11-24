# Task 2 – Apple Health Permissions & Sync Service Implementation Plan

Goal: deliver the onboarding step that teaches users about the Cycle Companion, requests Apple Health access, and kicks off the first HealthKit sync so later features have trustworthy data caches. Sources: SSOT §2–5, detailed tasks §2, requirements doc §UI & Data.

## 1. Prepare dependencies and folders
- [x] Add runtime dependencies for HealthKit, navigation, and background work: `expo install @kingstinct/react-native-healthkit expo-task-manager expo-background-fetch expo-device expo-application` and `npx expo install react-native-safe-area-context react-native-screens`, then `npm install @react-navigation/native @react-navigation/native-stack` for stack navigation.
- [x] Run `npx pod-install` inside `ios` so CocoaPods picks up the new native modules, and confirm the HealthKit capability toggle stays on from Task 1.
- [x] Create the scaffolding folders that Task 2 relies on: `app/navigation`, `app/features/companion/screens`, `app/features/companion/components`, `app/services/healthkit`, `app/services/healthkit/__mocks__`, and `packages/domain/cycles`.
- [x] Update `tsconfig.json` so it includes `packages/**/*` and add simple path aliases (for example `"@/features/*"`) to avoid fragile relative imports as the feature tree grows.

## 2. Wire basic navigation and gating
- [x] Install and configure React Navigation: add `NavigationContainer` + `createNativeStackNavigator` in a new `app/navigation/AppNavigator.tsx`, and wrap it with the React Navigation required providers (`SafeAreaProvider`).
- [x] Replace the placeholder UI in `App.tsx` with `AppNavigator`, keeping the `StatusBar` but moving the rest of the UI into stack screens.
- [x] Create `app/features/auth/screens/AuthScreen.tsx` as a stub Sign in with Apple (SIWA) screen so we can redirect authenticated users into the Cycle Companion later. The stub can reuse the existing copy from `App.tsx` until the Auth feature arrives.
- [x] Add a lightweight `HomeScreen` placeholder (even if it only shows "Coming soon") so the navigator has a destination once the intro screen is dismissed.
- [x] Implement gating logic inside `AppNavigator`: when `useSessionStore` reports no session, show `AuthScreen`; when a session exists and `hasSeenCompanionIntro` is `false`, push `CompanionIntroScreen`; otherwise show `HomeScreen`. Log the transitions so QA can confirm the flow.

## 3. Define domain models for cycle data
- [x] Create `packages/domain/cycles/models.ts` exporting TypeScript types for `CyclePhase`, `CycleSample`, and `CycleSnapshot`. Include utility helpers like `normalizeFlowSample(rawSample)` so all HealthKit parsing happens in one place.
- [ ] Model enums such as `CyclePhase` as simple TypeScript unions (`'follicular' | 'ovulation' | ...`) and document what each phase means so later UI work can reuse the definitions.
- [ ] Add small pure functions for tasks such as determining the latest sample, converting prediction windows into ISO timestamps, and creating display strings. Write Jest tests that feed mock raw samples and assert the helpers return normalized objects.

## 4. Implement the HealthKit permissions module
- [x] Inside `app/services/healthkit/healthkitClient.ts`, wrap the `@kingstinct/react-native-healthkit` export so the rest of the app calls a single client. Document that HealthKit is Apple’s health data API and we are only reading menstrual flow (`HKCategoryTypeIdentifierMenstrualFlow`).
- [x] Build `app/services/healthkit/permissions.ts` with functions `checkCyclePermissions()` and `requestCyclePermissions()`. The request function should await the HealthKit client’s `requestPermissions` call, trap known errors (user cancelled, Health data unavailable), and resolve to a simple `{ granted: boolean; error?: string }` object that UI components can show.
- [x] Update `sessionStore` helpers if needed so `setHealthPermissions` can accept explicit `lastPromptedAt` values (useful for analytics) without always overwriting with `new Date()`; this prevents duplicate prompts during rapid retries.
- [x] Add a convenience `ensureCyclePermissions()` helper that performs `check -> request (if needed)` and only prompts the user if permissions are missing. Emit analytics/log statements for both denial and success paths.
- [ ] Create Jest tests in `app/services/healthkit/__tests__/permissions.test.ts` using a manual mock of the HealthKit package to validate success, denial, and error handling branches.

## 5. Build the sync service that normalizes data
- [x] Add `app/services/healthkit/syncStateStore.ts` that saves the last sync cursor (the ISO string of the last sample we processed) to `AsyncStorage` so repeated syncs only pull new data.
- [x] Implement `app/services/healthkit/syncHealthData.ts` exporting `syncHealthData({ trigger }: { trigger: 'manual' | 'foreground' | 'background' })`. The function should:
  1. Check `useSessionStore` to ensure a user is signed in and permissions are granted; bail gracefully otherwise.
  2. Read the last cursor from `syncStateStore` and compute the date range to pass to HealthKit (fallback to `Date.now() - 30 days` on the first run).
  3. Call the wrapped HealthKit client’s `queryCategorySamples` for menstrual flow and, if available, prediction samples, batching the requests to avoid timeouts.
  4. Normalize the raw samples via the domain helpers into `CycleSample[]` and derive a `CycleSnapshot` summarizing the current phase, symptoms, and timestamps.
  5. Emit the snapshot through a typed event channel such as `DeviceEventEmitter.emit('companion/snapshotUpdated', snapshot)` so future feed components can listen. (Explain that `DeviceEventEmitter` is React Native’s built-in event bus.)
  6. Persist the new cursor and return the snapshot to the caller for immediate use in the intro screen.
- [x] Add thorough error handling: wrap the HealthKit call in try/catch, categorize errors (permissions revoked, iOS limitations), surface friendly messages, and rethrow unexpected failures to Sentry once that module lands.
- [ ] Create Jest tests that mock the HealthKit client and assert the sync function requests the right date range, normalizes data, and updates the cursor.

## 6. Register foreground and background sync triggers
- [x] Add `app/services/healthkit/backgroundSync.ts` that defines an Expo Task Manager task (for example `CYCLE_COMPANION_BACKGROUND_SYNC`). Document that Expo Background Fetch wakes the app periodically so we can run `syncHealthData` even when the UI is not open.
- [x] Implement helpers `registerCompanionBackgroundSync()` and `unregisterCompanionBackgroundSync()` that the app can call once permissions are granted or revoked.
- [x] In `AppNavigator` (or a new `app/hooks/useCompanionSync.ts`), listen to React Native’s `AppState` and `Navigation` focus events. Whenever the app moves to the foreground and permissions are granted, call `syncHealthData({ trigger: 'foreground' })` so the intro card always reflects the latest Apple Health data.
- [x] Update `App.tsx` startup logic so that after the user finishes the Sign in with Apple flow and lands back on the intro screen, we immediately register the background task and kick off an initial `syncHealthData({ trigger: 'manual' })`.

## 7. Build `CompanionIntroScreen`
- [x] Create `app/features/companion/screens/CompanionIntroScreen.tsx`. Layout: hero illustration placeholder, short paragraphs explaining the read-only promise, a CTA (call-to-action) button labeled “Connect Apple Health”, a secondary button “Not now”, and a tertiary “Learn more” link that opens the resources sheet.
- [x] Hook the buttons to the permission helpers: tapping the CTA calls `requestCyclePermissions()`, updates `sessionStore`, and on success immediately runs `syncHealthData({ trigger: 'manual' })`. Show inline guidance if the user denies the prompt and reuse the retry logic.
- [x] When the first sync succeeds, call `markCompanionIntroSeen()` and navigate to `HomeScreen`. Persist the loading/error states locally so the UI can show a spinner while awaiting HealthKit.
- [x] Surface contextual info such as when the user was last prompted (using `permissions.lastPromptedAt`) and highlight that we only read menstrual data—spell this out in plain language so copy reviewers can sign off.
- [x] Add lightweight analytics hooks (even simple console logs for now) to trace how many users tap Connect vs. Not now.

## 8. Testing, developer tooling, and docs
- [ ] Extend the Jest config to pick up the new folders and mocks. Write unit tests for `CompanionIntroScreen` using React Native Testing Library to cover default, denied, and success states (mocking the permission module).
- [ ] Add a mock implementation of `@kingstinct/react-native-healthkit` under `app/services/healthkit/__mocks__` so Metro bundler can run the app in simulators without the native module (useful for storybook/dev-client builds).
- [ ] Document manual QA steps in `README.md`: include instructions for installing the dev client on an iOS simulator with HealthKit data, how to add fake menstrual flow samples in the Health app, and how to confirm background fetches by inspecting Metro logs.
- [ ] Update the privacy copy reference doc (or note in `implementation-docs`) with the final wording used on the intro screen so design/content can sign off.
