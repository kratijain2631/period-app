# Database schema (Supabase)

The full schema — tables, functions, RLS policies, indexes — is defined in `supabase/migrations/*.sql`, which is the source of truth. Running those migrations recreates the database from scratch (that's how the current project `mmomoyszozclfjdvjbeb` was built). Real user data lives only in the database, never in the repo; the only data in code is the demo feed seed in `seed-posts.sql`.

## Tables (10)

| Table | Purpose |
|---|---|
| `users` | User profile — email, Apple user id, name, alias. Created automatically on signup by the `handle_new_auth_user` trigger. |
| `cycle_events` | Menstrual/cycle events synced from Apple Health (event type, phase, symptoms, start time). |
| `cycle_snapshots` | A rolled-up snapshot of the user's current cycle state (jsonb). |
| `friend_requests` | Friend requests between users (from / to / status). |
| `friend_sharing` | Mutual sharing consent — the `has_shared` flag per direction (default `false`). |
| `posts` | Feed posts (alias, body, mood tag). |
| `post_reactions` | Emoji reactions to posts. |
| `boops` | Friend "boop" nudges (from / to / optional cycle event). |
| `notifications` | In-app notifications. |
| `device_tokens` | Push-notification tokens per device. |

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

## How it works

1. **Auth:** Sign in with Apple → Supabase Auth → the `handle_new_auth_user` trigger creates the `users` profile row.
2. **Cycle data:** the app reads menstrual data from Apple Health (read-only) and writes it to `cycle_events` / `cycle_snapshots`.
3. **Friends:** send a request (`friend_requests`); on accept, `friend_sharing` tracks each side's `has_shared`. **Both** sides must opt in before they can see each other's cycle snapshot.
4. **Feed:** `posts`, `post_reactions`, and `boops` form the social layer.
5. **Security:** row-level security on all 10 tables (32 policies) scopes each user's data to themselves and approved friends.

## Data & schema notes

- **RLS everywhere** — each user only sees their own rows plus what approved friends explicitly shared.
- **Schema is in code** (`supabase/migrations/`); **real data is not** (database only); **demo seed data is in code** (`seed-posts.sql`).
- Applying the migrations to a fresh Supabase project reproduces the schema exactly.
- Whether another project (e.g. the original collaborator's) matches is only guaranteed if it was built from these same migrations with no out-of-band dashboard changes — see [LEARNINGS.md](LEARNINGS.md).
