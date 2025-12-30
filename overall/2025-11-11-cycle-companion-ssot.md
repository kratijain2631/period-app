# Cycle Companion Single Source of Truth (SSOT)
_Date: 2025-11-11_

## 1. Product Overview
Cycle Companion is the React Native iOS app providing a social interpretation layer on top of Apple Health menstrual tracking. Users already logging menstrual flow, PMS signals, and symptoms in Apple Health get: (1) a daily snapshot in the feed summarizing their current phase, key symptoms, and suggested social actions; (2) contextual friend notifications and Friend Sync augmentations so they can send boops, reactions, or recommendations; and (3) assurance that data stays read-only, privacy-controlled via Supabase row-level security (RLS), and never written back to Apple Health. Notifications include in-app surfaces plus opt-in push alerts for friend events. The experience explicitly excludes new logging inputs, calendar views, and Android/watchOS clients for V0.

### Personas & Goals
- **Reflective Tracker:** Needs up-to-date context without re-entering data, plus transparent freshness indicators.
- **Social Supporter:** Wants quick cues on friends’ states (PMS, menstruation) to time boops/reactions.
- **New Joiner:** Requires clear onboarding that explains read-only permissions, Supabase storage, and how friend sharing consent works.

## 2. Functional Scope & Flows
1. **Onboarding & Permissions:** After Sign in with Apple (SIWA), users land on `CompanionIntroScreen`, review the read-only promise, and grant HealthKit access. Denials show inline education and retry controls.
2. **Feed Snapshot (`DailySummaryCard`):** Appears at the top of `FeedScreen` showing phase badge, timestamps, symptom chips (PMS, cramps, mood), and CTAs to view Friend Sync or send a boop/reaction. Card hides if data is >24h stale.
3. **Notifications:** When friends enter PMS/menstruation, `NotificationsBell` badges and opens a sheet listing those events; tapping routes to the relevant feed entry with prefilled boop metadata. If push permissions are granted, send an opt-in push notification that deep-links to the same entry.
4. **Friend Sync Augmentation:** `FriendSyncScreen` displays overlap timelines, dummy sync score, and recommendation chips only when mutual sharing consent exists. Otherwise an explanatory empty state appears.
5. **Profile Filters:** `ProfileScreen` shows user phase summary and segmented friend filters (by phase) that deep-link to Friend Sync views.
6. **Friend Add & Requests:** `ProfileScreen` includes an add-friend CTA (search/invite), plus inbound/outbound request states and accept/decline actions before `friend_sharing` consent is enabled.
7. **Offline Handling:** If Supabase or HealthKit is unavailable, the feed card shows the last cached snapshot from SQLite plus a “Retry sync” banner, while boops/reactions queue for later replay.

## 3. Architecture Summary
### Client Layers (Expo-managed React Native)
| Layer | Responsibilities | Key Modules |
| --- | --- | --- |
| Presentation | Screens, navigation, theming | `AppNavigator.tsx`, `FeedScreen.tsx`, `CompanionIntroScreen.tsx`, `FriendSyncScreen.tsx`, `ProfileScreen.tsx` |
| State/Data | Session store, feature hooks, React Query caches, offline queues | `app/state/sessionStore.ts`, `useCycleSnapshot.ts`, `connectionStore`, `boopQueue.ts` |
| Domain & Models | TypeScript types + helpers | `packages/domain/cycles/models.ts`, `packages/domain/social/syncScore.ts` |
| Services | HealthKit, Supabase, analytics/logging | `healthkit/permissions.ts`, `healthkit/syncHealthData.ts`, `supabase/cycleEvents.ts`, `supabase/notifications.ts`, `analytics/segmentClient.ts` |
| Storage | Local caching | `app/storage/sqlite/cycleSnapshotStore.ts`, `boopQueue` tables |

### Data & State Flow
1. **Auth:** SIWA via Supabase Auth; Phase 3 adds the real token exchange with Supabase (Apple identity token -> access/refresh tokens) so `sessionStore` persists the server-backed session and drives navigation to Companion intro when `hasSeenCompanionIntro` is false.
2. **Permissions:** `requestCyclePermissions()` (HealthKit JS API) requests read-only access to `HKCategoryTypeIdentifierMenstrualFlow`. Result stored in `sessionStore.permissions`.
3. **Sync Pipeline:** `syncHealthData.ts` pulls HealthKit samples, normalizes to `CycleSample`/`CycleSnapshot`, writes to SQLite (`cycle_snapshots` table) and upserts to Supabase `cycle_events`. Emits `snapshotUpdated` event for UI invalidation.
4. **Feed Consumption:** `useCycleSnapshot` merges SQLite data with React Query caching. TTL logic hides the feed card after 24h without new sync.
5. **Notifications:** Supabase edge function watches `cycle_events` for friends entering PMS/menstruation, writes to `notifications` table, and sends opt-in push notifications to stored device tokens; client `useNotifications` (realtime channel) sets `NotificationsBell` badge and pre-configures boop suggestions.
6. **Friend Requests:** `friend_requests` tracks inbound/outbound invites; acceptance writes to `friend_sharing` which gates cross-user reads and Friend Sync eligibility.
7. **Friend Sync:** `FriendSyncScreen` fetches user snapshot + Supabase RPC exposing overlap timeline and dummy sync score. Consent enforced via `friend_sharing` table + RLS.
8. **Offline Queue:** `boopQueue.ts` logs actions locally; on reconnect, queue flushes to Supabase, preserving timestamps. `connectionStore` (NetInfo) prevents redundant sync attempts while offline.

### Backend & Data Schema
- **Supabase Tables**
  - `users` (existing, keyed by SIWA `sub`).
  - `cycle_events` (user_id, event_type, phase, symptoms JSONB, starts_at, created_at).
  - `cycle_snapshots` (user_id, last_synced_at, snapshot JSONB) for sharing data with friends where consent allows.
  - `notifications` (id, user_id, friend_id, event_id, payload) for PMS alerts.
  - `device_tokens` (user_id, token, platform, created_at) for push delivery.
  - `friend_requests` (id, from_user_id, to_user_id, status, created_at).
  - `friend_sharing` (user_id, friend_id, has_shared boolean) gating cross-user reads.
- **Edge Functions / RPCs**
  - `notifications-handler`: triggered on `cycle_events` insert to create records for accepted friends and send push notifications when tokens exist.
  - `sync-score` RPC: returns placeholder overlap timeline + dummy score for Friend Sync UI.
- **Policies**
  - RLS ensures users read only their own rows; friend views require mutual `friend_sharing.has_shared=true`.
- **Infrastructure**
  - Expo config adds HealthKit entitlements + usage strings.
  - SQLite tables created via migration scripts executed at app startup.

## 4. Privacy, Consent, and Reliability
- **Read-only Assurance:** All copy (permissions, feed footer) states the app never writes to Apple Health. `@kingstinct/react-native-healthkit` usage limited to read APIs.
- **Consent:** Friend insights appear only when both sides opt in. Non-consented scenarios hide data and show explanatory text.
- **Push Permissions:** Push notifications are opt-in; device tokens are stored per user and deleted on sign-out or revocation.
- **Data Freshness:** Feed snapshot invalidated after 24h; empty state instructs users to retry sync/permissions.
- **Logging:** Client/server logs redact PHI beyond what Apple Health already exposes; hashed user IDs used in telemetry.
- **Offline Behavior:** Cached data served from SQLite; actions queue and are replayed once Supabase connectivity resumes; UI banners warn users when data may be stale.

## 5. Implementation Plan (Backlog)
1. **Foundations**
   - Update `app.json`/`eas.json` with HealthKit usage strings; configure EAS builds.
   - Extend `sessionStore` with `hasSeenCompanionIntro`, `permissions.granted` (persist + migrate state).
   - **Testing:** Run `eas build --profile preview` to confirm entitlements compile, then launch the dev client via `expo start --dev-client` and verify `sessionStore` flags hydrate correctly in Reactotron or by logging state on cold start.
2. **Permissions & Sync Service**
   - Build `CompanionIntroScreen` with SIWA completion state, CTA, denial education.
   - Implement `healthkit/permissions.ts` and integrate with intro CTA; support retry flows.
   - Implement `syncHealthData.ts` (read samples, normalize, emit events) and hook into foreground/background triggers.
   - **Testing:** On a HealthKit-enabled simulator/device, run `expo run:ios` and step through onboarding. Deny permissions once to confirm the inline education renders, then grant access and use Xcode’s Health data inspector (or the Health app on device) to add menstrual flow events; observe Metro logs showing `snapshotUpdated` plus verify SQLite entries via `expo-sqlite` console helper.
3. **Supabase Auth Session Exchange (Phase 3)**
   - Exchange SIWA identity tokens with Supabase Auth to obtain access/refresh tokens and replace the client-only session stub.
   - Persist Supabase session data in `sessionStore`, rehydrate on launch, and subscribe to auth state changes for refresh and sign-out.
   - **Testing:** Sign in via dev client, restart the app, confirm session restoration, and validate a simple RLS-protected query succeeds with the Supabase session.
4. **Local Storage & TTL**
   - Create SQLite `cycleSnapshotStore` schema + helpers; enforce 24h TTL.
   - Build `useCycleSnapshot` hook (React Query + SQLite listener) for the feed and profile.
   - **Testing:** Use Jest time-mocking to assert TTL behavior, then manually toggle the device clock (Settings → General → Date & Time) or inject a fake `last_synced_at` via `sqlite-utils` to confirm the feed card hides after 24h in the dev client. Validate reappear after `syncHealthData` executes.
5. **Supabase Layer**
   - Ship migrations for `cycle_events`, `cycle_snapshots`, `notifications`, `device_tokens`, `friend_requests`, `friend_sharing` + RLS policies.
   - Implement `cycleEvents` service for upserts; `notifications` service + realtime hook + push dispatch; `sync-score` RPC for Friend Sync.
   - **Testing:** Run migrations locally with `supabase db push`, then execute integration tests (`pnpm test:supabase`) to assert RLS. From the dev app, trigger a sync and inspect Supabase tables via the dashboard SQL editor (`select * from cycle_events order by created_at desc`) to ensure new rows reflect Apple Health data. For notifications, manually insert a PMS event via SQL and confirm the dev client receives realtime payloads (check badge).
6. **Feed & Notifications UI**
   - Implement `DailySummaryCard` (phase badge, symptom chips, CTAs, stale banner) and mount as `FeedScreen` header.
   - Build `NotificationsSheet` and wire to `NotificationsBell` + navigation (scroll to friend entry).
   - Request push permission, register device token, and deep-link pushes to the relevant feed entry.
   - **Testing:** With the dev client running, ensure the feed loads with the summary card atop the list showing the latest phase and symptom chips; tap the Friend CTA and confirm navigation to `FriendSyncScreen`, then tap the Reaction CTA to open the composer. Simulate a notification (insert row or trigger real friend event) and verify the bell shows a badge, the sheet lists the friend name/event, and selecting it scrolls the feed to the correct entry with prefilled boop UI. Trigger a push from Supabase and confirm the deep link opens the correct entry.
7. **Profile & Friend Sync Enhancements**
   - Add `CycleCompanionSection` to `FriendSyncScreen` (overlap timeline, dummy score, recommendation chips, consent gating).
   - Add friend search/invite flow with inbound/outbound request states and accept/decline actions.
   - Update `BoopButton` to accept prefilled metadata; ensure offline queue integration.
   - Enhance `ProfileScreen` with phase summary + segmented friend filters linking to Friend Sync.
   - **Testing:** Create two demo accounts in Supabase with mutual `friend_sharing=true`, run the app for each (or mock data). Verify `FriendSyncScreen` shows overlap timeline + dummy score; toggle consent to false for one friend and confirm the section hides with explanatory copy. On `ProfileScreen`, tap each phase filter and check the listed friends update, then select a friend to navigate to their sync view. Use the notification prefill to send a boop and ensure metadata (message, emoji) is present even offline.
8. **Offline & Reliability**
   - Implement `boopQueue` SQLite-backed queue, plus connectivity detection via NetInfo.
   - Surface offline banners and hide snapshot when TTL exceeded.
   - **Testing:** Enable Airplane Mode, launch the app, and attempt to send a boop; verify the UI shows “queued” feedback and that `boopQueue` records exist (inspect via dev logging). Re-enable connectivity and confirm queued actions flush to Supabase (check table). Trigger stale-state by adjusting device time and ensure the banner displays with a functioning “Retry sync” button that re-runs the HealthKit fetch once online.
9. **Privacy & Content**
   - Add “Learn more” link in permission copy and feed footer pointing to `ResourcesSheet` (await final copy).
   - Ensure consent checks in all Supabase queries; update logger to redact symptom text.
   - **Testing:** Click the “Learn more” link on both the intro screen and feed card to verify `ResourcesSheet` opens with placeholder copy. Run automated logging tests to assert redaction, and manually review console output during a sync to ensure no raw symptom strings leak. Attempt to access a friend’s data without mutual consent (toggle `friend_sharing` to false) and verify Supabase rejects the query and UI hides the section gracefully.
10. **Release Preparation**
   - Update App Store metadata/screenshots to highlight read-only HealthKit experience.
   - Run full CI (`pnpm lint && pnpm test && pnpm detox:ios`) and produce EAS TestFlight build.
   - Conduct privacy/security review verifying RLS, consent, logging compliance.
   - Pilot internal TestFlight rollout, monitor logs/analytics, and expand per launch plan.
   - **Testing:** After CI, install the TestFlight build on a physical device, run through the full user journey (SIWA → permissions → feed → notification → friend sync) and capture screen recordings for QA. Use Supabase dashboard + Segment/Sentry dashboards during the pilot to confirm metrics/logs stream as expected before widening distribution.

## 6. Sequencing & Readiness Criteria
- **Critical Path:** HealthKit permissions + sync (Task 2) -> Supabase auth exchange (Task 3) -> local storage & TTL (Task 4) -> Supabase schema (Task 5) -> Feed/Profile/Friend UI (Tasks 6-7).
- **Parallel Work:** Profile/Friend Sync UI can proceed once data hooks stubbed; offline queue work can run alongside privacy/content tasks.
- **Dependencies:** Final “Learn more” content (Task 9), Supabase migrations deployed (Task 5), CI green builds (Task 10).

**Launch Readiness Checklist**
- [ ] HealthKit permissions + sync validated on physical device.
- [ ] Supabase migrations deployed and RLS tests passing.
- [ ] Feed card, notifications, profile filters pass Detox flows.
- [ ] Push notification permission + deep link flow validated on device.
- [ ] Offline queue + TTL behaviors verified.
- [ ] “Learn more” content approved/localized.
- [ ] App Store metadata updated; TestFlight build distributed; monitoring in place.

**Path:** `overall/2025-11-11-cycle-companion-ssot.md`
