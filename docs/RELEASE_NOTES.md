# Release notes

Changelog for this app's builds. Newest first. See [INSTRUCTIONS.md](INSTRUCTIONS.md) for how this file is maintained.

## Unreleased

_(nothing yet — accumulating toward the next build)_

## 2026-07-23 — Beta 2 · TestFlight · approved

The post-merge build (production build `ea0a717f`) uploaded to TestFlight and **submitted for external Beta App Review**. Same code as the Dev build below — includes all of main's features and the crash fix.

### Test instructions (what testers were told)
> You'll need some period data logged in Apple Health to see your cycle info. Please flag anything confusing, broken, or slow. We'd like to hear about any crashes, bugs, or feature requests.

## 2026-07-23 — Dev build

Caught this branch up to the full, current codebase and rebuilt as a dev build (not a TestFlight / App Store submission).

### Fixed
- **Fixed the app crashing on TestFlight.** The branch had been built from a stale snapshot that was missing a large batch of later fixes; catching up to the full codebase resolves the crash.

### Changed
- **Merged in the full, up-to-date codebase (57 commits of features + fixes) and resolved the merge conflicts** — reconciled the config, screens, and services to the current versions, kept `app.config.ts` and all `/docs`, and dropped the now-redundant sign-out / delete code that the current codebase already had.
- Brought the Supabase schema up to date (applied the missing migrations) and installed new native dependencies (`react-native-svg`, `expo-image-picker`, `expo-font`) — which is why a fresh build is required.

### Account deletion — edge function vs. SQL function
- Chose the **edge-function** implementation of account deletion (deployed the `delete-account` function) over the older SQL-function approach: it uses the admin API and cleans up all tables. The AI-powered edge functions (cycle guidance, friend recommendations, avatar generation) are **deferred** until an API key is available; the app degrades gracefully without them.

### Added (came in with the catch-up)
- Brand refresh, adaptive cycle-phase labels, friend recommendations + cycle guidance, auto-post settings, profile customization + avatars, mood on updates, event reactions, friend removal, refreshed home/feed UX, and Jest CI fixes.

### Docs
- Added a full documentation suite under `/docs` — PITCH (vision), FEATURES (roadmap), SCHEMA (database), IDENTIFIERS, TODO, BUGS, TROUBLESHOOTING, LEARNINGS, INSTRUCTIONS — plus `CLAUDE.md`, all cross-linked from the README.

## 2026-07-22 — Beta 1 · TestFlight · approved

First external TestFlight beta build, submitted for Beta App Review.

### Added
- **Sign out** — Profile → Account.
- **Delete account** — permanently removes your account and all your data (posts, cycle history, friends, shares), backed by a `delete_account()` database function.
- **Privacy policy** — a public URL for Apple review and for users.
- First production build submitted to **external TestFlight**.

### Changed
- **Renamed the app "Cycle Companion" → "Cadence".** The display name is now a single source of truth (`APP_NAME` in `app.config.ts`) that drives the home-screen name, Health permission prompts, and in-app text.
- Set up the build & backend config: bundle id `com.syncsisters.cycle`, EAS project `@kratijain26/period-app`, and a Supabase project.
- Converted `app.json` → `app.config.ts` and centralized every identifier (see [IDENTIFIERS.md](IDENTIFIERS.md)).
- Deep-link scheme → `cadence`; Android package left unset (iOS-only for now).

### Fixed
- **Sign in with Apple** — two separate issues:
  1. The provisioning profile didn't carry the Sign in with Apple entitlement → fixed by regenerating the profile (declining "reuse" on rebuild).
  2. Supabase rejected the token's audience (`unacceptable audience`) → fixed by adding `com.syncsisters.cycle` to the Supabase Apple provider's Client IDs.
- Production builds now reach Supabase — the Supabase URL/key are stored as EAS environment variables so they're bundled into cloud builds (they were previously only in the gitignored `.env`, which cloud builds don't see).

### Infrastructure & release setup (non-code)
- Stood up a Supabase project and applied the full schema (10 tables, functions, RLS) via the migrations; added the `delete_account()` function; configured the **Apple sign-in provider** (`com.syncsisters.cycle` in Client IDs).
- Set the Supabase URL + publishable key as **EAS environment variables** (production) so cloud builds reach the backend.
- Registered the Apple App ID `com.syncsisters.cycle` (HealthKit + Sign in with Apple enabled), generated the distribution certificate + provisioning profiles, and registered the test device.
- Created the **App Store Connect app record** and an **App Store Connect API key** (App Manager role) for `eas submit`.
- Published the **privacy policy** and provided its URL + App Review notes (Sign in with Apple only; reviewers use their own Apple ID).
- Ran the production build via EAS, submitted to TestFlight with `eas submit`, and **submitted for external Beta App Review**.

### Known / not yet done
- Privacy policy is currently hosted as a Claude artifact — to be moved to a permanent host before public launch.
- App Privacy "nutrition labels" + age rating still needed before a public App Store release.

## 2026-07-21 — Dev build (baseline)

The app as it existed before this work began.

### Features
- **Reads menstrual-flow data from Apple Health** (HealthKit, read-only — never writes back). Only a basic placeholder "current phase" is derived from it — no in-app logging, tracking, or predictions yet.
- **Sign in with Apple**, backed by Supabase auth.
- Social layer: friend requests, mutual-consent cycle sharing, a cycle-sync score, and a feed with posts, reactions, and "boops."
- Offline support: local SQLite storage and a queued boop sync.
- **Push notifications** — real client-side implementation (permission, Expo push token registered to Supabase, notification handling + deep-link nav). Actually *sending* them relies on the `notifications-handler` edge function being deployed with an Expo push-token secret.
- Named **"Cycle Companion."**

**Additional features already in the full codebase** (discovered when catching up via the dev-build merge — these predate the beta work):
- **Brand identity revamp** (fonts, palette, restyled screens).
- **Sign-out** (local-first logout) and **account deletion** (via a `delete-account` edge function).
- **Adaptive cycle-phase signals + source-aware phase labels** (better use of the Health data than the placeholder).
- **Friend recommendations + sync-score compatibility**, recomputed daily (`friend-recommendations`, `cycle-guidance` edge functions).
- **Auto-post settings** (choose what posts automatically).
- **Profile customization + avatar editing** (`avatar-generator` edge function).
- **Add a mood to your update**, **event reactions**, **friend removal** (`remove_friend` RPC), **swipe-back** on Friend Sync, refreshed home feed / reactions UX.
- **Jest CI fixes** (jsdom + localStorage/auth), `architecture.md`, simulator-setup doc.
