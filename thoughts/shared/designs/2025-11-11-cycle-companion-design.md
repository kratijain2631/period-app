# Cycle Companion Design Doc

## Overview & Goals
Cycle Companion delivers a read-only social layer on top of Apple Health menstrual tracking. The feature ingests Apple Health data via `@kingstinct/react-native-healthkit`, persists normalized state in Supabase, caches locally for offline use, and renders guidance within Feed, Profile, and Friend Sync surfaces. The goal is to help Apple Health users interpret their own cycle data and respond to friends’ states using existing InSync actions (boops, reactions, manage friend) without adding new data capture flows. Success criteria: onboarding clarifies read-only permissions, Feed/Notification/Profile surfaces always reflect the most recent Apple Health sync or an explicit stale state, and privacy guardrails ensure only mutually consented friends see shared insights.

## Inputs & Source Documents Summary
- **Architecture (Step 1)**: Expo-managed RN app with modular `app/features/*`, domain models in `packages/domain/*`, Supabase backend, HealthKit ingestion via existing package, offline caching, and privacy constraints (RLS, read-only HealthKit).
- **Feature Narrative (Step 2)**: Defined personas, flows (intro screen, daily Feed card, notifications, Friend Sync augmentations, profile filters), offline fallback, 24h freshness TTL, and explicit sharing consent requirements.
- **Requirements (Step 3)**: EARS requirements for UI, data/state, privacy. Highlights: `CompanionIntroScreen`, `DailySummaryCard`, `NotificationsBell` badge behavior, offline queue of boops/reactions, TTL enforcement, and “Learn more” link.
- **Spec (reference/spec.md)**: Reinforces read-only ingestion, friend feed focus, friend sync score interactions, boops/reactions, and absence of push notifications in V0.

## Detailed Architecture
### Module Overview
| Module | Responsibility |
| --- | --- |
| `app/features/companion/screens/CompanionIntroScreen.tsx` | Post-auth intro screen with permission copy, denial education, and retry action. |
| `app/features/feed/components/DailySummaryCard.tsx` | Feed entry summarizing user’s latest Apple Health data with CTAs. |
| `app/features/feed/hooks/useCycleSnapshot.ts` | React Query hook fetching cached snapshot (local + Supabase) and subscribing to updates. |
| `app/features/notifications/components/NotificationsBell.tsx` | Badge + onPress routing when friends enter PMS/menstruation. |
| `app/features/friends/screens/FriendSyncScreen.tsx` | Displays overlap timelines, dummy sync score, recommendation chips. |
| `app/features/profile/screens/ProfileScreen.tsx` | Shows user phase, friend filters by phase, deep links to Friend Sync and Feed card. |
| `app/services/healthkit/permissions.ts` | Wraps HealthKit read-only permission prompts. |
| `app/services/healthkit/syncHealthData.ts` | Schedules reads, normalizes into domain models, writes to SQLite + Supabase. |
| `app/storage/sqlite/cycleSnapshotStore.ts` | Exposes CRUD for cached snapshots, TTL enforcement. |
| `app/services/supabase/notifications.ts` | Inserts friend-state notifications + metadata. |
| `app/services/offlineQueue/boopQueue.ts` | Caches outbound boop/reaction actions with replay logic. |

### Data Flow
1. **Auth**: `AuthScreen` completes SIWA → `sessionStore` hydrates Supabase client → navigation directs to `CompanionIntroScreen` if `hasSeenCompanionIntro` flag is false.
2. **Permissions**: `CompanionIntroScreen` triggers `requestCyclePermissions()`; success sets `permissions.granted=true` and kicks off initial sync; denial sets local state to show education + retry.
3. **HealthKit Sync**: `syncHealthData.ts` runs via `useEffect` on app focus + background fetch listeners. Flow: HealthKit samples → domain `CycleSample` models → SQLite `cycle_snapshots` table (latest per day) → Supabase `cycle_events` table via upsert. Hook publishes `snapshotUpdated` event via `DeviceEventEmitter` for UI.
4. **Feed Snapshot Rendering**: `useCycleSnapshot` listens to SQLite table (via custom hook) + React Query cache keyed `cycleSnapshot`. TTL logic hides card after 24h without new data. Snapshot includes fields: `phase`, `predictedWindow`, `symptoms[]`, `lastSyncedAt`.
5. **Notifications & Friend Hooks**: Supabase Edge function monitors `cycle_events` for accepted friends. When a friend enters PMS/menstruation, it inserts a `notification` row with payload `{friendId, eventId, suggestedBoopId}`. Client `useNotifications` listens via Supabase realtime channel → sets badge on `NotificationsBell` and preconfigures `BoopButton` props when navigating.
6. **Friend Sync Augmentation**: `FriendSyncScreen` fetches overlap data from Supabase RPC (dummy sync score). If both `user.hasShared` and `friend.hasShared` flags true, show recommendation shelf; else hide with info copy.
7. **Offline Handling**: `cycleSnapshotStore` caches latest snapshot; `boopQueue` persists pending actions. `DailySummaryCard` reads from store when `connectionStore.isOffline` or `permissions` missing → shows banner with retry CTA.

### Sequence: Initial Onboarding
| Step | Actor | Detail |
| --- | --- | --- |
| 1 | User | Completes SIWA. |
| 2 | App | `sessionStore` persists session, flags `needsCompanionIntro=true`. |
| 3 | App | Navigates to `CompanionIntroScreen`; displays read-only message + CTA. |
| 4 | User | Taps “Allow Apple Health access.” |
| 5 | HealthKit module | Presents permission sheet for `HKCategoryTypeIdentifierMenstrualFlow`. |
| 6 | App | On success, calls `syncHealthData()`; on failure, shows education + retry button. |
| 7 | Sync service | Reads samples, writes to SQLite + Supabase, emits `snapshotUpdated`. |
| 8 | Feed | `DailySummaryCard` sees cache update, renders phase info + CTAs. |

### Sequence: Friend PMS Notification
| Step | Actor | Detail |
| --- | --- | --- |
| 1 | Supabase Edge | Detects friend event (enter PMS). |
| 2 | Supabase | Inserts `notifications` row with metadata. |
| 3 | Client | `useNotifications` subscription receives payload, sets `badgeCount++` and stores `prefillBoop`. |
| 4 | User | Taps `NotificationsBell`; navigation pushes the friend’s feed event. |
| 5 | Feed | `DailySummaryCard` context highlights friend reason; `BoopButton` prefilled. |

## React Native UI/UX Design Notes
- **CompanionIntroScreen**: Use `ScrollView` with hero illustration, bullet copy, SIWA completion state. Primary CTA triggers permission request, secondary “Not now” leads to limited feed with empty state. Component consumes `usePermissions` hook.
- **DailySummaryCard**: Card lives in `FlatList` header on `FeedScreen`. Layout: phase badge, timestamp, symptom chips (scrolling PillRow), CTA buttons using `ButtonGroup`. Banner variant appears when offline/stale.
- **NotificationsBell**: Renders as header button in navigation. `badgeCount` derived from `useNotifications`. On press, open `NotificationsSheet` (ActionSheet) with friend events; selecting event navigates to `FeedScreen` with scroll-to-index for that friend entry.
- **FriendSyncScreen**: Extend existing layout with `CycleCompanionSection` component showing overlap timeline (horizontal timeline), dummy sync score (progress dial), and `RecommendationChips`. Hide section behind consent gating.
- **ProfileScreen filters**: Add `SegmentedControl` listing phases (Follicular, Ovulation, Luteal, Menstruation). Each chip shows friend count; tapping filters list and deep-links to `FriendSyncScreen` on selection.

## Apple Health + Supabase Data, Privacy, and Security Considerations
- **HealthKit**: Use `@kingstinct/react-native-healthkit` permission + observer queries. Configure entitlements via `app.json` and EAS build profile. Ensure background delivery events update SQLite even when app cold-starts.
- **Supabase**: Tables required: `cycle_events` (user_id, event_type, phase, symptoms JSONB, starts_at), `cycle_snapshots` (derived), `notifications`, `friend_sharing` flags. All queries go through `app/services/supabase` to centralize auth headers and logging. RLS policies enforce user_id match and accepted friend relationships for cross-user reads.
- **Local Storage & TTL**: `cycleSnapshotStore` table columns: `id`, `user_id`, `phase`, `symptoms`, `last_synced_at`. TTL enforcement implemented in selector: if `Date.now() - last_synced_at > 24h`, return `null` so UI hides card.
- **Consent Handling**: `friend_sharing` table keyed by `user_id` + `friend_id` with boolean `has_shared`. `FriendSyncScreen` query joins on this table; UI copy explains why sections may hide. Consent toggles live elsewhere (profile settings) but design ensures read-only reference.
- **Privacy Messaging**: All permission texts and summary footers mention read-only approach; `DailySummaryCard` footer includes `ResourcesSheet` link.

## Testing & Observability Strategy
- **Unit/Component Tests**: Jest for `useCycleSnapshot`, `syncHealthData` normalization, `cycleSnapshotStore` TTL logic; React Testing Library for `DailySummaryCard`, `CompanionIntroScreen`, `FriendSyncSection` gating.
- **Integration/E2E**: Detox flows for onboarding (SIWA → permissions), feed rendering, notification badge interactions, offline queue scenario.
- **Backend Tests**: Supabase edge functions (`notifications`, `sync-score`) covered via Deno tests verifying payload shape + RLS enforcement. Migration tests ensure schema aligns with domain models.
- **Observability**: Instrument `syncHealthData` with `app/services/analytics` events (`companion_sync_start/success/failure`, `snapshot_stale`) logged to Segment. Use Sentry breadcrumbs for permission denials and sync errors. Supabase monitors track edge function latency and error rates.
- **Logging**: Client logs redact symptom text; store hashed user IDs when logging events.

## Deployment
- **Feature Flag**: Wrap Cycle Companion entry points in `cycleCompanion.v1` Remote Config flag for staged rollout.
- **Migrations**: Ship Supabase migrations (tables + RLS) via CI; require backfill job to populate `friend_sharing` defaults.
- **Expo Config**: Update `app.json` with HealthKit entitlements and usage descriptions. Use EAS Build profiles to include new permissions.
- **CI/CD**: Extend GitHub Actions to run new tests; gating on `lint`, `tsc`, `jest`, `Detox`. Use Fastlane lane for beta distribution.

## Risks, Trade-offs, and Open Issues
- **Learn More Content**: Pending approved copy; placeholder text must be replaced pre-release.
- **Notification Load**: Realtime subscriptions might increase battery/network use; mitigate via server-side filtering and client debounce.
- **Offline TTL**: 24h expiration may hide data for infrequent sync users; monitor analytics to adjust.
- **Consent UX**: Friend sharing toggles not owned by this feature; risk of confusion if users cannot find where to enable sharing. Need follow-up with profile settings team.

**Path:** `thoughts/shared/designs/2025-11-11-cycle-companion-design.md`
