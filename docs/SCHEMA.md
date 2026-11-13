# Database schema (Supabase)

The full schema — tables, functions, RLS policies, indexes — is defined in `supabase/migrations/*.sql`, which is the source of truth. Running those migrations recreates the database from scratch; staging (`rntqwmptuavqnbjovnae`) was built that way, and production (`mmomoyszozclfjdvjbeb`) matches it. Merging a migration applies it to staging, then production ([DB_PUSH.md](DB_PUSH.md)). Real user data lives only in the database, never in the repo. The old `seed-posts.sql` demo data was retired on 2026-11-06; test data now comes from the staging personas ([TESTING.md](TESTING.md)).


## Circle rankings and outward profiles (unreleased)

Migration `20261113000000_circle_rankings.sql` adds `users.community_rankings_enabled` (default false). Only a member chooses whether to join the two global boards. The authenticated functions compute scores from current rows; no materialized counters need repair on delete, unfriend or opt-out.

| Function | Returned data and boundary |
| --- | --- |
| `circle_community_top(board)` | Up to ten opted-in aliases, member IDs and nonzero counts: distinct accepted friends, or manually authored posts still present for the current UTC month. No pair scores, contact identifiers, posts or friend lists. |
| `my_circle_support()` | Up to five accepted friends with saved reactions to the caller’s posts/cycle updates, comments on the caller’s posts, or boops sent to the caller within 30 days. Boops tied to deleted posts are excluded. Caller-scoped, subject to existing row policies. |
| `circle_member_profile(subject)` | Signed-in visitors see an alias; self and accepted friends can also receive name, avatar and bio. Shared updates and cycle data still use their existing access rules. |
| `circle_search_members(term)` | A literal prefix of at least two characters matches a name or alias, capped at eight. Excludes the caller. Exact phone/email matches still use the separate opt-in verified-contact function. |

`post_comments` belongs to a post (cascade on deletion), stores the authenticated author, server-stamped alias, creation time and 1–1,000 characters of text. Its audience is checked against the parent post. Only the author can remove a comment.

The app's Notifications and Add friends screens query the same pending inbound `friend_requests` rows. Responding changes the relationship itself; it does not create a duplicate notification or introduce a second approval state.

## Tables (14)

| Table | Purpose |
|---|---|
| `users` | User profile — email, Apple user id, name, alias, and the default-off `discoverable_by_contacts` preference. Created automatically on signup by the `handle_new_auth_user` trigger. |
| `cycle_events` | Menstrual/cycle events synced from Apple Health (event type, phase, symptoms, start time). |
| `cycle_snapshots` | A rolled-up snapshot of the user's current cycle state (whole snapshot as jsonb, incl. predicted `nextPhaseStart`/`nextPhase`). Also a `last_reminded_phase_start` column for the server-side phase reminder dedupe. |
| `friend_requests` | Friend requests between users (from / to / status). In the `supabase_realtime` publication so the app gets instant updates. |
| `friend_sharing` | **Legacy, controls nothing since 20261111180000.** A `has_shared` flag per direction, kept in step with accepted requests (`ensure_friend_sharing`, `remove_friend`) only because older app builds read it for the friends list. |
| `posts` | Feed posts (alias, body, mood tag). |
| `post_reactions` | Emoji reactions to posts. |
| `event_reactions` | Emoji reactions to cycle events. |
| `boops` | Friend "boop" nudges (from / to / optional cycle event). |
| `notifications` | In-app notifications, with a `read_at` column (null = unread) for the notifications page's new/read state. Populated by engagement triggers (reactions/boops) and, once deployed, the notifications-handler. |
| `cycle_guidance` | Owner-readable AI dos/don’ts and friend suggestions, cached by phase plus nullable `phase_started_at`; caller-scoped completion RPC writes the new on-demand path. |
| `friend_recommendations` | Pair recommendations/score cache used by the friend detail screen; separate from personal Phase Guide. |
| `cycle_guidance_requests` | Applied 2026-11-03: caller-scoped two-minute generation leases; auth-user deletion cascades. No direct anon/authenticated table access. |
| `device_tokens` | Push-notification (Expo) tokens per device. |
| `cycle_guidance` | One row per user: the AI do's/don'ts for their current phase, with `phase_started_at` so it's regenerated when the phase changes. Written by the `cycle-guidance` edge function. |
| `cycle_guidance_requests` | Server-only bookkeeping for on-demand guidance requests (`claim_cycle_guidance` / `complete_cycle_guidance`). Clients have no access. |
| `friend_recommendations` | Per friend pair: suggestions and a score from the `friend-recommendations` edge function. |

The on-demand guidance migration also adds nullable `cycle_guidance.phase_started_at`; old clients and the legacy batch worker remain compatible. These additions were applied and their permissions verified on **2026-11-03**.

## Functions

| Function | Purpose |
|---|---|
| `claim_cycle_guidance_refresh` | Applied to staging and production by Database deploy run 43154655774 on 2026-11-11 (`20261111210000`): explicit caller-scoped regeneration using the existing lease table and saved generation timestamp for a two-minute cooldown. No signature changes to existing RPCs. |
| `claim_cycle_guidance` / `complete_cycle_guidance` | Applied 2026-11-03: authenticate with `auth.uid()`, validate the current server snapshot, serialize generation claims and save only the matching claim/phase result. Authenticated callers can affect only their own guidance. |
| `handle_new_auth_user` | Trigger: creates a `users` row when a new auth user signs up. Pins `search_path` since `20261112190000`, applied by the Database deploy on merge. |
| `handle_updated_at` | Trigger: maintains `updated_at` timestamps. |
| `populate_post_alias` | Trigger: always sets a post's alias from its author's profile, so a post can't carry someone else's name (since 2026-11-06). |
| `enforce_users_email` | Trigger: keeps the profile email equal to the login email. |
| `search_users` | Find users by alias or email (for friend requests). Logged-in only; at least 2 characters, `%` and `_` treated as plain text, excludes the searcher, at most 20 results. |
| `send_friend_request_by_email` | Send a request to an email without revealing whether that email has an account. |
| `remove_friend` | Remove a friendship, for both people. |
| `friend_cycle_summaries` / `shared_cycle_events` | Sanitized friend cycle reads (see below). |
| `sync-score` | The sync score between you and a friend. |
| `cycle_event_belongs_to` | Helper for the reaction rules: checks a cycle event's owner. |
| `claim_cycle_guidance` / `complete_cycle_guidance` | On-demand guidance bookkeeping, used by `request-cycle-guidance`. |
| `cron_secret_matches` | Checks the `x-cron-secret` header the scheduled edge functions require against the `cron_secret` in Vault. `service_role` only. |
| `friend_request_profiles` | Resolve profile info for a set of friend requests. |
| `is_friend` | True when the caller and the given user have an accepted friend request in either direction. The single rule behind every friend-visibility policy and RPC. Added by `20261111180000_friend-rule.sql`, applied to staging and production by the Database deploy workflow on merge. |
| `cycle_event_visible` | True when the caller owns the cycle event or is friends with its owner. Used by event-reaction and boop policies, since `cycle_events` is owner-only. |
| `friend_profiles` | Names (alias, full name) for the given users who are the caller's friends. Use this for other people's names: `users` only returns your own row. |
| `contact_friend_matches_v2` | Applied to staging and production on 2026-11-12. Authenticated lookup of up to 200 hashes against confirmed Auth phone/email fields of opted-in accounts. One result per account. The private per-caller counter limits checks to 20,000 identifiers per hour. |
| `contact_friend_matches` | Privacy-minimized contact discovery: matches submitted normalized email hashes only against users who opted into contact discoverability. Raw address-book emails are never submitted. |
| `ensure_friend_sharing` | Keeps legacy `friend_sharing` rows in step with accepted requests. |
| `delete_account` | Account self-deletion — clears the user's data and removes their auth record (SECURITY DEFINER). |
| `notify_post_reaction` / `notify_event_reaction` / `notify_boop` | AFTER INSERT triggers that create a `notifications` row for the content owner when a friend reacts/boops (SECURITY DEFINER, exception-safe, skip self). |
| `due_phase_reminders` / `mark_phase_reminded` | Support the daily server-side phase-change reminder cron — find users whose predicted transition is today (and inactive), and dedupe. `service_role`-only. |

**Function access:** no function can be called without a login (`20261108180000_no-login-function-access.sql`). New functions are callable only by logged-in users and the service role, and server-only ones are revoked from `authenticated` too. `npm run test-accounts:rls` checks this.

**Other rules added 2026-11-04 to 2026-11-08:** friend requests must start as pending and clients can change only `status`; aliases are unique ignoring case and surrounding spaces; you can react only to posts you can see and boop only friends; a post reaction or boop is visible only to whoever made it, received it or wrote the post, and to friends of whoever made it.

**Scheduled jobs (pg_cron), verified 2026-11-12:** `daily-phase-change-reminder` remains active (15:00 UTC → `phase-change-reminder`). `nightly-cycle-guidance` was removed by `20261111211000`. The remaining reminder sends the Vault `cron_secret` in an `x-cron-secret` header; scheduled handlers still reject calls without it. The `nightly-friend-recommendations` job is deliberately off (`20261107014000`). See [CYCLE_SYNC.md](CYCLE_SYNC.md).

## How it works

1. **Auth:** Sign in with Apple → Supabase Auth → the `handle_new_auth_user` trigger creates the `users` profile row.
2. **Cycle data:** the app reads menstrual data from Apple Health (read-only), derives the phase/predictions, and writes to `cycle_events` (feed) / `cycle_snapshots` (state). Full detail — sync triggers, posting, and notifications — in [CYCLE_SYNC.md](CYCLE_SYNC.md).

### Friend cycle reads

Current clients read accepted friends through `friend_cycle_summaries()` and `shared_cycle_events(max_rows)`. These security-definer RPCs expose calendar/phase fields and deliberately published event fields while stripping raw HealthKit metadata, flow intensity, personal symptoms, and signal samples. Accepting a friend is the sharing boundary; removing the friend revokes access.

Raw `cycle_snapshots` and `cycle_events` rows are owner-only. Friends must use the sanitized RPCs. A temporary compatibility policy was briefly applied during development, then removed by `20260806010000_remove-legacy-friend-cycle-read.sql` once the owner confirmed all testers can update together.
3. **Friends:** send a request (`friend_requests`). Once it's accepted you're friends, and friends see everything: posts, cycle events, cycle summaries, names, reactions and boops (`is_friend`). There's no per-friend sharing switch; removing a friend (`remove_friend`) is the only way to stop sharing, and it ends access both ways. This is the owner's `friend = sharing` decision (2026-08-02, confirmed 2026-11-11).
4. **Feed:** `posts`, `post_reactions`, and `boops` form the social layer.
5. **Security:** row-level security on all tables scopes each user's data to themselves and approved friends. (The `notifications` table also has an owner-only UPDATE policy, added for read/unread state.)

## Data & schema notes

- **RLS everywhere** — each user only sees their own rows plus their friends' (an accepted request; see step 3).
- **Schema is in code** (`supabase/migrations/`); **real data is not** (database only); **test data is generated** by the staging persona scripts, never stored in production.
- Applying the migrations to a fresh Supabase project reproduces the schema exactly.
- Whether another project (e.g. the original collaborator's) matches is only guaranteed if it was built from these same migrations with no out-of-band dashboard changes — see [LEARNINGS.md](LEARNINGS.md).

**Nightly guidance retirement applied to staging and production (2026-11-12):** `20261111211000_retire-nightly-cycle-guidance.sql` removes only the named cron job. Owner confirms 1.0.15 adoption and refresh success; older-client loss of fresh advice is accepted. Tables, saved guidance, RPCs/functions and the daily reminder remain. [Database deploy run 43274996960](https://github.com/kratijain2631/period-app/actions/runs/43274996960) applied `20261111211000` to staging, passed all 75 staging access checks, then applied production. Post-deploy read-only metadata confirms nightly guidance absent and `daily-phase-change-reminder` active at 15:00 UTC in both projects.
