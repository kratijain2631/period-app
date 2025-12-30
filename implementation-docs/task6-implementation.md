# Task 6 - Feed & Notifications UI Implementation Plan

Goal: deliver the Daily Summary card in the feed/home experience and the in-app notifications UI, including realtime updates and push deep-link handling. Sources: SSOT section 5 (Task 6), designs, requirements.

## 1. Daily Summary card
- [x] Build `DailySummaryCard` component (phase badge, last sync timestamp, sample counts).
- [x] Add CTA buttons for Friend Sync and Boop/Reactions (placeholder handlers).
- [x] Show stale banner if TTL has expired (based on `useCycleSnapshot` returning `null`).

## 2. Notifications UI
- [x] Add `NotificationsBell` with badge count.
- [x] Add `NotificationsSheet` modal listing recent notifications.
- [x] Add `useNotifications` hook to fetch + subscribe to realtime inserts.

## 3. Push + deep-link handling
- [x] Ensure push registration runs on sign-in (app lifecycle hook).
- [x] On notification tap, route to Home and surface the payload context.
- [x] Add `expo-notifications` config plugin for dev-client builds.

## 4. Testing and QA
- [ ] Manual QA: trigger Supabase notification insert and confirm bell badge increments.
- [ ] Manual QA: send push and confirm tap opens the app with the payload.

## Key decisions
- Keep notification payloads minimal (event type, phase, friend id) and hydrate details later.
- Use a lightweight Modal for the notification list to avoid adding new UI dependencies.
- Use a simple "Bell" label instead of an icon to avoid extra asset dependencies.
- Treat `snapshot === null` as stale/missing data for the banner until TTL-aware UI states are added.
