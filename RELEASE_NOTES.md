# Release notes

Changelog for Cadence builds. Newest first.

## MVP 1 — Beta 1 (TestFlight) — 2026-07-22

First external TestFlight beta, and the first build that runs entirely under our own Apple, Expo, and Supabase accounts (previously tied to a collaborator's).

### Added
- **Sign out** — Profile → Account.
- **Delete account** — permanently removes your account and all your data (posts, cycle history, friends, shares), backed by a `delete_account()` database function.
- **Privacy policy** — a public URL for Apple review and for users.
- First production build submitted to **external TestFlight**.

### Changed
- **Renamed the app "Cycle Companion" → "Cadence".** The display name is now a single source of truth (`APP_NAME` in `app.config.ts`) that drives the home-screen name, Health permission prompts, and in-app text.
- Migrated to our own accounts: new Apple App ID `com.syncsisters.cycle`, new EAS project `@kratijain26/period-app`, and a new Supabase project.
- Converted `app.json` → `app.config.ts` and centralized every identifier (see [IDENTIFIERS.md](IDENTIFIERS.md)).
- Deep-link scheme → `cadence`; Android package left unset (iOS-only for now).

### Fixed
- **Sign in with Apple** — two separate issues:
  1. The provisioning profile didn't carry the Sign in with Apple entitlement → fixed by regenerating the profile (declining "reuse" on rebuild).
  2. Supabase rejected the token's audience (`unacceptable audience`) → fixed by adding `com.syncsisters.cycle` to the Supabase Apple provider's Client IDs.
- Production builds now reach Supabase — the Supabase URL/key are stored as EAS environment variables so they're bundled into cloud builds (they were previously only in the gitignored `.env`, which cloud builds don't see).

### Known / not yet done
- Deleting the auth user relies on a Postgres function (works today); may move to an Edge Function if project permissions change.
- Privacy policy is currently hosted as a Claude artifact — to be moved to a permanent host before public launch.
- App Privacy "nutrition labels" + age rating still needed before a public App Store release.

## MVP 0 — Baseline (pre-beta)

The app as it existed before the beta work began — functional, but tied to a collaborator's Apple / Expo / Supabase accounts and not independently shippable.

### Features
- Menstrual cycle tracking via **Apple Health** (HealthKit, read-only — never writes back).
- **Sign in with Apple**, backed by Supabase auth.
- Social layer: friend requests, mutual-consent cycle sharing, a cycle-sync score, and a feed with posts, reactions, and "boops."
- Offline support: local SQLite storage and a queued boop sync.
- Push notifications.
- Named **"Cycle Companion."**
