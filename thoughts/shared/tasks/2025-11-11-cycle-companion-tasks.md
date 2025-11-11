# Cycle Companion Implementation Tasks

Scope confirmation: Matches Step 1–4 artifacts plus `reference/spec.md`. Deliver a read-only Cycle Companion across Feed/Profile/Friend Sync with Apple Health ingestion, Supabase persistence, offline caching, notifications badge, and privacy guardrails. No new capture flows, no calendar view, no push notifications.

## 1. Foundations
1.1 Update Expo config (`app.json`, `eas.json`) with HealthKit usage descriptions and entitlements; run `eas build:configure`. Dep: Apple developer account access.
1.2 Extend `sessionStore` to add `hasSeenCompanionIntro` and `permissions.granted` flags with hydration + migrations.

## 2. Apple Health Permissions & Sync Service
2.1 Build `app/features/companion/screens/CompanionIntroScreen.tsx` with copy, CTA, denial state. Add navigation from `AuthScreen` post-SIWA.
2.2 Implement `app/services/healthkit/permissions.ts` (wrap package call, handle re-prompts) and integrate into intro screen CTA.
2.3 Create `app/services/healthkit/syncHealthData.ts`:
- Read `HKCategoryTypeIdentifierMenstrualFlow` + prediction samples via `@kingstinct/react-native-healthkit`.
- Normalize into `packages/domain/cycles/models.ts` (`CycleSample`, `CycleSnapshot`).
- Emit `snapshotUpdated` event.
2.4 Schedule background/foreground sync triggers (`App.tsx` focus listeners, Expo Task Manager for background fetch) calling sync service.

## 3. Local Storage & TTL
3.1 Scaffold SQLite store `app/storage/sqlite/cycleSnapshotStore.ts` with schema migrations (id, user_id, phase, symptoms JSON, last_synced_at).
3.2 Implement CRUD helpers (insert/update latest snapshot, fetch current, purge stale >24h) and integrate with sync service.
3.3 Add `app/features/feed/hooks/useCycleSnapshot.ts` using React Query + store subscriptions; apply TTL logic.

## 4. Supabase Data Layer
4.1 Add Supabase migrations:
- Tables `cycle_events`, `cycle_snapshots`, `notifications`, `friend_sharing`.
- RLS policies ensuring user + friend consent constraints.
4.2 Implement `app/services/supabase/cycleEvents.ts` for upserts triggered by sync service.
4.3 Implement `app/services/supabase/notifications.ts` (edge function + client hook) to insert friend PMS events and stream to app.
4.4 Update `app/services/supabase/index.ts` to expose typed clients and realtime subscriptions for notifications.
4.5 Create Supabase RPC/edge function for dummy sync score + overlap timeline (`supabase/functions/sync-score/index.ts`) returning placeholder data.

## 5. Feed & Notification UI
5.1 Build `DailySummaryCard.tsx`:
- Display phase badge, timestamp, symptom chips, CTAs.
- Banner variant for offline/stale states with retry action hooking `syncHealthData`.
5.2 Integrate card as `ListHeaderComponent` in `FeedScreen.tsx`.
5.3 Implement CTA routing: Friend CTA → `FriendSyncScreen` (with props), Reaction CTA → existing composer.
5.4 Enhance `NotificationsBell.tsx` to consume `useNotifications` hook, show badge count, and open sheet listing friend PMS events.
5.5 Build `NotificationsSheet.tsx` (ActionSheet) showing events; selecting navigates to feed entry (scroll-to-index) with prefilled boop data.

## 6. Profile & Friend Sync Enhancements
6.1 Extend `FriendSyncScreen.tsx` with `CycleCompanionSection` component:
- Show overlap timeline, dummy sync score, recommendation chips.
- Respect consent flags; show explanatory empty state otherwise.
6.2 Update `app/features/friends/components/BoopButton.tsx` to accept prefill metadata from notifications and offline queue.
6.3 Update `ProfileScreen.tsx`:
- Display user phase summary (reuse `DailySummaryCard` subcomponents).
- Add segmented friend filters by phase; tapping navigates to `FriendSyncScreen`.
6.4 Wire `FriendSyncScreen` data fetch to Supabase RPC + `useCycleSnapshot` for the user baseline context.

## 7. Offline Queue & Reliability
7.1 Implement `app/services/offlineQueue/boopQueue.ts` persisting pending actions in SQLite; integrate with boop/reaction clients.
7.2 Add connectivity detection via `@react-native-community/netinfo`, expose `connectionStore`, and block duplicate sync attempts when offline.
7.3 Add stale snapshot banner logic: hide card after 24h, show empty state with instructions and retry CTA.

## 8. Privacy, Consent, and Content
8.1 Update permission copy and `DailySummaryCard` footer to include “Learn more” link referencing `ResourcesSheet.tsx` (placeholder until content ready).
8.2 Implement `friend_sharing` consent checks in all Supabase queries and UI surfaces; ensure missing consent hides friend data.
8.3 Ensure client logs redact symptom text; update `app/services/logging/logger.ts` and add tests.
8.4 Coordinate with design/content for final `ResourcesSheet` assets and copy (blocking release).

## 9. Release Preparation
9.1 Update App Store metadata/screenshots to showcase Cycle Companion, emphasizing read-only HealthKit usage.
9.2 Run full CI pipeline (`pnpm lint && pnpm test && pnpm detox:ios`) plus EAS build for beta testers.
9.3 Conduct privacy/security review ensuring RLS, consent, logging policies satisfied.
9.4 Pilot rollout: distribute internal TestFlight build, monitor logs/analytics, then stage broader release per launch plan.

## Sequencing & Parallelization
- **Critical path**: Permissions + sync service (Tasks 2–3) before UI surfaces can ship. Supabase schema (Task 4) must land before feed/notification features (Tasks 5–6).
- **Parallelizable**: Profile/Friend Sync UI (Task 6) can progress alongside feed card once data hooks stubbed. Offline queue (Task 7) can run in parallel with copy/content work (Task 8) post-sync implementation.
- **Dependencies**: Consent copy (Task 8.4) blocks final release; Notification sheet depends on Supabase notifications (Task 4.3). Release tasks (Task 9) require CI green from earlier testing steps.

## Launch Readiness Checklist
- [ ] HealthKit permissions + sync verified on-device.
- [ ] Supabase migrations deployed with RLS tests passing.
- [ ] Feed card, notifications, profile filters passing Detox.
- [ ] Offline queue + TTL behavior validated.
- [ ] Content for “Learn more” approved and localized.
- [ ] App Store metadata updated; EAS build published; staged rollout plan documented.

**Path:** `thoughts/shared/tasks/2025-11-11-cycle-companion-tasks.md`
