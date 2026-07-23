# Release notes

Changelog for this app's builds. Newest first. See [INSTRUCTIONS.md](INSTRUCTIONS.md) for how this file is maintained.

## Unreleased

Changes since the MVP 1 build, accumulating toward the next release.

### Added
- Project docs: `RELEASE_NOTES.md`, `IDENTIFIERS.md` (every name/identifier and where to change it), `TODO.md` (open work), `INSTRUCTIONS.md` (working conventions — update release notes on every commit, cut a version per published build, never delete todos without approval, read the docs first), `TROUBLESHOOTING.md` (issues we hit + fixes, accounts/access, env vars, expiries, and out-of-git state), and `LEARNINGS.md` (background, decisions and rationale, and reusable concepts).
- Cross-linked all docs from the README and pointed `INSTRUCTIONS.md` at them so future contributors read the context first.

### Changed
- Cross-linked the docs from the README.
- TROUBLESHOOTING.md: added a teammate onboarding / local-dev-setup guide (what's committed vs. not, and what a contributor needs) and a "how to verify env vars loaded" note.
- INSTRUCTIONS.md: added a rule to record issues and future-relevant info in TROUBLESHOOTING.md.
- Moved all docs into a `docs/` folder (README stays at root) and updated every cross-link; added `docs/SCHEMA.md` (Supabase tables, functions, and how they work).
- TODO.md: added a **user notifications** feature (permission-gated, for friend requests / post reactions / etc.) and a running list of app-name options considered.
- TROUBLESHOOTING.md: noted that the paid Apple Developer Program ($99/yr) is required for TestFlight.
- Added `docs/FEATURES.md` (product backlog — moved the user-notifications item here) and `docs/BUGS.md` (open bugs); TODO.md now points to both.
- Built out `docs/FEATURES.md` into a roadmap (design/aesthetics, core cycle features, social & support, engagement) with rough sequencing; TODO.md now has a single "Improve the app" item pointing to FEATURES/BUGS.
- Distilled brainstorming notes into the docs: added `docs/PITCH.md` (vision, philosophy, taglines, positioning, go-to-market); greatly expanded FEATURES.md (predictions, phase recommendations, groups, calendar view, care actions, end-of-year recap, cycle-based task planning, community/location extensions, research); added the Sign in with Apple **web** OAuth secret 6-month expiry to TROUBLESHOOTING; added a "check for bugs after every change" rule to INSTRUCTIONS.
- Added `CLAUDE.md` at the repo root — auto-loaded by Claude Code each session; points at INSTRUCTIONS.md and summarizes the key conventions.
- Expanded the app-name idea list in TODO.md (Rhythm, Tide, Phase, Kora, Lunalink, The Monthly, Cycle Connection, Sisters, Sisters by Blood, InSync, etc.).
- INSTRUCTIONS.md §1: release notes must now capture **non-code changes too** (Supabase config, project/account creation, EAS env vars, privacy-policy URL, App Store Connect setup); added an "Infrastructure & release setup" bucket, and backfilled the MVP 1 entry with all the TestFlight setup steps.
- Restructured FEATURES.md — **sequencing-first** ("The plan" up top with Now/Next/Later/Bets + a priority note), categories as a reference library, Levels folded in as historical; added **Onboarding**, **Privacy & data controls**, **Accessibility & reliability**, and notification-strategy areas; and added concrete **cycle-model / HealthKit** next steps (the Health data is read today but barely used — only a placeholder "current phase").

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

### Infrastructure & release setup (non-code)
- Stood up our **own Supabase project** and applied the full schema (10 tables, functions, RLS) via the migrations; added the `delete_account()` function; configured the **Apple sign-in provider** (`com.syncsisters.cycle` in Client IDs).
- Set the Supabase URL + publishable key as **EAS environment variables** (production) so cloud builds reach the backend.
- Created the **Apple App ID** `com.syncsisters.cycle` (HealthKit + Sign in with Apple enabled), generated the distribution certificate + provisioning profiles, and registered the test device.
- Created the **App Store Connect app record** and an **App Store Connect API key** (App Manager role) for `eas submit`.
- Published the **privacy policy** and provided its URL + App Review notes (Sign in with Apple only; reviewers use their own Apple ID).
- Ran the production build via EAS, submitted to TestFlight with `eas submit`, and **submitted for external Beta App Review**.

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
