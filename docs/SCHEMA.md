# Database schema (Supabase)

The full schema — tables, functions, RLS policies, indexes — is defined in `supabase/migrations/*.sql`, which is the source of truth. Running those migrations recreates the database from scratch (that's how the current project `mmomoyszozclfjdvjbeb` was built). Real user data lives only in the database, never in the repo; the only data in code is the demo feed seed in `seed-posts.sql`.

## Tables (11)

| Table | Purpose |
|---|---|
| `users` | User profile — email, Apple user id, name, alias. Created automatically on signup by the `handle_new_auth_user` trigger. |
| `cycle_events` | Menstrual/cycle events synced from Apple Health (event type, phase, symptoms, start time). |
| `cycle_snapshots` | A rolled-up snapshot of the user's current cycle state (whole snapshot as jsonb, incl. predicted `nextPhaseStart`/`nextPhase`). Also a `last_reminded_phase_start` column for the server-side phase reminder dedupe. |
| `friend_requests` | Friend requests between users (from / to / status). In the `supabase_realtime` publication so the app gets instant updates. |
| `friend_sharing` | Mutual sharing consent — the `has_shared` flag per direction (default `false`). |
| `posts` | Feed posts (alias, body, mood tag). |
| `post_reactions` | Emoji reactions to posts. |
| `event_reactions` | Emoji reactions to cycle events. |
| `boops` | Friend "boop" nudges (from / to / optional cycle event). |
| `notifications` | In-app notifications, with a `read_at` column (null = unread) for the notifications page's new/read state. Populated by engagement triggers (reactions/boops) and, once deployed, the notifications-handler. |
| `device_tokens` | Push-notification (Expo) tokens per device. |

## Functions

| Function | Purpose |
|---|---|
| `handle_new_auth_user` | Trigger: creates a `users` row when a new auth user signs up. |
| `handle_updated_at` | Trigger: maintains `updated_at` timestamps. |
| `populate_post_alias` | Trigger: fills a post's alias from the user's profile. |
| `search_users` | Find users by alias or email (for friend requests). |
| `friend_request_profiles` | Resolve profile info for a set of friend requests. |
| `friend_profiles` | Resolve friend profiles (respects mutual sharing). |
| `ensure_friend_sharing` | Set up `friend_sharing` rows for accepted requests. |
| `delete_account` | Account self-deletion — clears the user's data and removes their auth record (SECURITY DEFINER). |
| `notify_post_reaction` / `notify_event_reaction` / `notify_boop` | AFTER INSERT triggers that create a `notifications` row for the content owner when a friend reacts/boops (SECURITY DEFINER, exception-safe, skip self). |
| `due_phase_reminders` / `mark_phase_reminded` | Support the daily server-side phase-change reminder cron — find users whose predicted transition is today (and inactive), and dedupe. `service_role`-only. |

**Scheduled jobs (pg_cron):** `daily-phase-change-reminder` (15:00 UTC → `phase-change-reminder` function) plus the `schedule-*` guidance/recommendation crons. See [CYCLE_SYNC.md](CYCLE_SYNC.md).

## How it works

1. **Auth:** Sign in with Apple → Supabase Auth → the `handle_new_auth_user` trigger creates the `users` profile row.
2. **Cycle data:** the app reads menstrual data from Apple Health (read-only), derives the phase/predictions, and writes to `cycle_events` (feed) / `cycle_snapshots` (state). Full detail — sync triggers, posting, and notifications — in [CYCLE_SYNC.md](CYCLE_SYNC.md).

### Friend cycle reads

Current clients read accepted friends through `friend_cycle_summaries()` and `shared_cycle_events(max_rows)`. These security-definer RPCs expose calendar/phase fields and deliberately published event fields while stripping raw HealthKit metadata, flow intensity, personal symptoms, and signal samples. Accepting a friend is the sharing boundary; removing the friend revokes access.

Raw `cycle_snapshots` and `cycle_events` rows are owner-only. Friends must use the sanitized RPCs. A temporary compatibility policy was briefly applied during development, then removed by `20260806010000_remove-legacy-friend-cycle-read.sql` once the owner confirmed all testers can update together.
3. **Friends:** send a request (`friend_requests`); on accept, `friend_sharing` tracks each side's `has_shared`. The RLS gate requires `has_shared = true` on **both** sides before either can see the other's cycle snapshot — but note the app currently **auto-sets both sides true on accept** (no explicit opt-in step, no revoke UI); see [BUGS.md](BUGS.md) → consent model.
4. **Feed:** `posts`, `post_reactions`, and `boops` form the social layer.
5. **Security:** row-level security on all tables scopes each user's data to themselves and approved friends. (The `notifications` table also has an owner-only UPDATE policy, added for read/unread state.)

## Data & schema notes

- **RLS everywhere** — each user only sees their own rows plus what approved friends shared with them (sharing is auto-granted on accept today — see the consent-model caveat in step 3 and [BUGS.md](BUGS.md)).
- **Schema is in code** (`supabase/migrations/`); **real data is not** (database only); **demo seed data is in code** (`seed-posts.sql`).
- Applying the migrations to a fresh Supabase project reproduces the schema exactly.
- Whether another project (e.g. the original collaborator's) matches is only guaranteed if it was built from these same migrations with no out-of-band dashboard changes — see [LEARNINGS.md](LEARNINGS.md).
