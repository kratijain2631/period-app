# Remove Friends Flow + Profile HIG Refresh

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

PLANS.md is not present in this repository. This plan follows the ExecPlan requirements provided in the task prompt and must be maintained accordingly.

## Purpose / Big Picture

After this change, a signed-in user can manage their friends from a dedicated Friends screen: they can remove a friend with a clear confirmation, view Friend Sync, and handle incoming/outgoing requests in a focused layout. The Profile tab becomes a clean, Apple HIG-aligned summary screen with a clear entry point to friend management, matching the visual language of the Friend Sync screen. You can see this working by opening Profile, tapping "Manage Friends," removing a friend (confirming the destructive prompt), and observing that the friend disappears from the list and the "Friends" summary updates.

## Progress

- [x] (2026-01-12 20:20Z) Create initial ExecPlan document.
- [x] (2026-01-12 21:05Z) Add Supabase `remove_friend` function and client helper.
- [x] (2026-01-12 21:12Z) Split Profile into a HIG-styled summary screen and a dedicated Friends management screen with removal UI.
- [x] (2026-01-12 21:35Z) Validate in simulator with real friend data created in Supabase; confirm removal flow works end-to-end.

## Surprises & Discoveries

- Observation: None yet.
  Evidence: N/A.

## Decision Log

- Decision: Create a dedicated Friends management screen and keep Profile as a lightweight summary.
  Rationale: Reduces cognitive load on the Profile screen and aligns with iOS patterns of drilling into management tasks from summary surfaces.
  Date/Author: 2026-01-12 20:20Z / Codex
- Decision: Implement friend removal via a Supabase security-definer function that updates both sharing rows and deletes the request.
  Rationale: Current RLS allows only the owner to update a sharing row; a server-side function ensures both directions are revoked safely.
  Date/Author: 2026-01-12 20:20Z / Codex

## Outcomes & Retrospective

Completed: Added Supabase removal function, split Profile and Friends screens, and validated the remove flow end-to-end in the iOS simulator using a seeded friend. The profile summary updates after removal and the Friends screen shows the empty state as expected.

## Context and Orientation

This app is a React Native + Expo client that uses Supabase for data. Friends are represented by two tables: `public.friend_requests` (a request with status `pending`, `accepted`, or `declined`) and `public.friend_sharing` (a directional sharing row with `has_shared` true/false). The app considers two users "friends" when both directional `friend_sharing` rows are `has_shared = true`. The Profile screen currently owns all friend management UI in `app/features/profile/screens/ProfileScreen.tsx`, which mixes account identity, cycle status, add friend form, friend filters, friend list, and request lists on a single screen. The Friend Sync screen (`app/features/friends/screens/FriendSyncScreen.tsx`) already uses a system-color palette and grouped card layout aligned with Apple HIG.

We will add a Supabase database function named `remove_friend` that revokes sharing in both directions and deletes any friend request rows between the current user and the target. In Supabase, a "function" in this context is a stored SQL or PL/pgSQL routine callable via `supabase.rpc(...)` from the app; it runs on the database with elevated permissions when marked as `security definer`.

## Plan of Work

First, add a new migration in `supabase/migrations` that creates the `remove_friend(friend_id uuid)` function. The function should verify `auth.uid()` is not null, update `public.friend_sharing` to set `has_shared = false` for both `(auth.uid(), friend_id)` and `(friend_id, auth.uid())`, and delete any `public.friend_requests` rows between the two users. Grant `execute` to the `authenticated` role, and revoke from `public`.

Next, add a client helper `removeFriend` in `app/services/supabase/friendSharing.ts` that calls `supabase.rpc('remove_friend', { friend_id })` and throws on error. This keeps removal logic in one place and avoids direct multi-table mutations from the client.

Then, split the current Profile experience into two screens. Create a new `FriendsScreen` (for example at `app/features/friends/screens/FriendsScreen.tsx`) that contains the existing friend management flows: add friend by alias/email, friend filters, the friend list with View Sync, incoming requests with Accept/Decline, and outgoing requests. Add a "Remove" action to each friend row that uses a destructive confirmation (React Native `Alert`) and then calls `removeFriend` followed by reloading friend data. Style this screen using the same system palette and grouped-card layout approach as Friend Sync.

Update `ProfileScreen.tsx` to be a clean summary surface: show the avatar/name/ID, a "Your Cycle" card, and a "Friends" card with a concise description and a button that navigates to the new Friends screen. Adjust Profile styling to use the same iOS palette and card styling as Friend Sync so it conforms to Apple HIG guidance and feels consistent.

Finally, wire the new screen into navigation in `app/navigation/AppNavigator.tsx` and validate the flow in the simulator by creating a friend relationship in Supabase, removing it from the Friends screen, and verifying the UI updates.

## Concrete Steps

1. Add a migration file `supabase/migrations/<timestamp>_remove-friend.sql` that defines `public.remove_friend(friend_id uuid)` and its grants.
2. Update `app/services/supabase/friendSharing.ts` to export `removeFriend(friendId: string): Promise<void>` calling `supabase.rpc('remove_friend', { friend_id: friendId })`.
3. Create `app/features/friends/screens/FriendsScreen.tsx` by moving friend management logic from `ProfileScreen.tsx`, adding a removal action with `Alert.alert` confirmation, and restyling to HIG-aligned cards and system colors.
4. Simplify `app/features/profile/screens/ProfileScreen.tsx` to a summary layout and a "Manage Friends" navigation entry.
5. Update `app/navigation/AppNavigator.tsx` to register the new `Friends` screen and allow navigation from Profile.
6. Apply the migration to Supabase and seed at least one friend connection for the test user so the removal flow can be exercised.

## Validation and Acceptance

- Launch the app and open the Profile tab. The screen shows a clean summary layout with system colors (no purple background), and a clear "Manage Friends" entry.
- Tap "Manage Friends" to open the new Friends screen. The screen displays friends, filters, and request sections in grouped cards that match the Friend Sync visual language.
- Tap "Remove" on a friend, confirm the destructive prompt, and verify the friend disappears from the list. The Friend Sync entry for that friend should no longer be reachable from Profile/Friends.
- Re-open Profile to confirm the summary still renders and the friend count/empty state reflects the removal.

## Idempotence and Recovery

The migration is additive and safe to re-run because it uses `create or replace function`. If a step fails, re-run the failed command after fixing the error. Removing a friend is reversible by sending a new friend request after removal; no data is permanently destroyed beyond the friend connection.

## Artifacts and Notes

Example confirmation prompt copy for removal:

  Remove friend?
  They will no longer see your updates, and you'll need to send a new request to reconnect.

Example SQL to seed a friend connection (replace IDs):

  insert into public.friend_requests (from_user_id, to_user_id, status)
  values ('<self_id>', '<friend_id>', 'accepted')
  on conflict (from_user_id, to_user_id) do update set status = 'accepted';

  insert into public.friend_sharing (user_id, friend_id, has_shared)
  values ('<self_id>', '<friend_id>', true), ('<friend_id>', '<self_id>', true)
  on conflict (user_id, friend_id) do update set has_shared = excluded.has_shared;

## Interfaces and Dependencies

- Supabase database function (defined in `supabase/migrations/<timestamp>_remove-friend.sql`):

  public.remove_friend(friend_id uuid) returns void

  Behavior: when called by an authenticated user, sets `public.friend_sharing.has_shared = false` for both directions and deletes any rows in `public.friend_requests` between the two users.

- `app/services/supabase/friendSharing.ts` must export:

  removeFriend(friendId: string): Promise<void>

- `app/features/friends/screens/FriendsScreen.tsx` must implement:

  - A friend list row with a "View Sync" action and a destructive "Remove" action that calls `removeFriend`.
  - Incoming request actions that accept or decline requests (existing behavior retained).
  - An add friend form (existing behavior retained).

Change Log: 2026-01-12 20:20Z - Initial plan drafted.
Change Log: 2026-01-12 21:12Z - Marked Supabase removal function and Profile/Friends screen split as complete; navigation and client helper now implemented.
Change Log: 2026-01-12 21:35Z - Recorded simulator validation and completion notes in Progress and Outcomes.
