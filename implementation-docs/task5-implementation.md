# Task 5 - Supabase Layer Implementation Plan

Goal: ship the Supabase schema, policies, and client services needed for cycle events, notifications (including push), friend requests, and Friend Sync data access. Sources: SSOT section 5 (Task 5), architecture, requirements.

## 1. Migrations and policies
- [x] Create migrations for `cycle_events`, `cycle_snapshots`, `notifications`, `device_tokens`, `friend_requests`, and `friend_sharing` (`supabase/migrations/20251229215000_cycle-companion-core.sql`).
- [x] Add RLS policies using `auth.uid()` for self-access and mutual consent for friend access.
- [x] Add indexes for read-heavy tables (`cycle_events.user_id`, `notifications.user_id`, `friend_requests.to_user_id`).
- [x] Push migration to Supabase via `supabase db push`.

## 2. Supabase client services
- [x] Add `app/services/supabase/cycleEvents.ts` for inserts/upserts from sync.
- [x] Add `app/services/supabase/notifications.ts` for realtime subscriptions + fetch.
- [x] Add `app/services/supabase/deviceTokens.ts` to register and revoke push tokens.
- [x] Add `app/services/supabase/friendRequests.ts` for send/accept/decline flows.
- [x] Add `app/services/supabase/friendSharing.ts` to read consent states.
- [x] Add `app/services/supabase/syncScore.ts` to call the RPC.

## 3. Edge functions and push pipeline
- [x] Implement `notifications-handler` to insert notification rows on `cycle_events` for mutual friends.
- [x] Store minimal payloads (event type, friend id, created_at) and let the client hydrate UI.
- [x] Dispatch push via Expo Push API from `notifications-handler` using `device_tokens`.
- [x] Deploy `notifications-handler` via `supabase functions deploy notifications-handler`.
- [ ] Set `EXPO_PUSH_ACCESS_TOKEN` in Supabase edge function secrets (optional but recommended).
- [x] Wire client push registration and deep-link handler.
- [ ] Validate deep links route to the relevant feed entry.

## 4. Friend requests flow
- [x] Define request lifecycle: `pending` -> `accepted` or `declined`.
- [x] On accept, write reciprocal `friend_sharing` rows and update request status.
- [x] Add query helpers for inbound/outbound requests.

## 5. Testing and QA
- [x] Add Supabase policy test script (`supabase/tests/rls-cycle-companion.sql`).
- [ ] Execute the RLS script with real user IDs and confirm expected counts (script now pre-filled with the provided user IDs).
- [ ] Manual QA: insert events, verify realtime updates, and send a push to confirm deep link.

## Key decisions
- Use `device_tokens` for push delivery and de-duplicate by `(user_id, token)`.
- Keep `friend_requests` as a simple status machine (`pending`, `accepted`, `declined`).
- Store minimal notification payloads; hydrate rich data in the app.
- Use a unique key `(user_id, starts_at, event_type)` in `cycle_events` to allow idempotent upserts.
- Use Expo Push API with optional `EXPO_PUSH_ACCESS_TOKEN` for server-side notifications.
- Push registration uses Expo Notifications with `device_tokens` upsert and stored token revocation on sign-out.
