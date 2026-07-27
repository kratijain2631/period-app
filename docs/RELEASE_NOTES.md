# Release notes

Changelog for this app's builds. Newest first. See [INSTRUCTIONS.md](INSTRUCTIONS.md) for how this file is maintained.

## Unreleased

### Docs
- **PITCH.md — added a "Market landscape & comparables" section**: the social-tracking playbook (Strava, Beli, Flighty, Letterboxd, Duolingo, Oura/Whoop), the period-app competitors (Flo, Clue, Stardust, Natural Cycles, Apple Cycle Tracking), and the friend-graph white space.
- **Full-codebase review pass (2026-07-27)** — logged findings across the docs (no code changed):
  - **PITCH.md** — added "The engagement loop (the actual bet)": auto-logged Health data is the Strava/Flighty "it logs itself" superpower; cold-start + consent are the gating risks.
  - **FEATURES.md** — added "The retention loop" (concrete build order translating the market playbook: auto-populating feed, sync-score leaderboard, shareable cycle recap, care actions, streaks/groups); corrected the sync score from "dummy" to the real `computeSyncScore` model; flagged the consent-model gap.
  - **BUGS.md** — new findings: consent is auto-granted on friend-accept with no revoke UI (dead `setFriendSharing`), contradicting the "explicit mutual consent" docs; duplicate underscore/hyphen migration pairs; `npm test` red-by-default because `architecture-sync.test.ts` hard-fails without `OPENAI_API_KEY`; slow networked tests; double-tap "like" un-likes; `loadFeed` serial waterfall; a minor DST off-by-one in the cycle model. Re-scoped the "friend accept → no friendship" bug as likely stale soft-deleted-account data.
  - **TODO.md** — added a "Code health / tech debt" section (fix consent model, reconcile migrations, green/fast tests, decompose god-components, parallelize `loadFeed`).
  - **LEARNINGS.md & SCHEMA.md** — reconciled the stale "explicit mutual consent" claims: both docs described consent as a two-sided opt-in, but the app auto-grants sharing on friend-accept. Reframed as schema-intent-vs-actual-behavior with pointers to the consent-model bug.
  - **FEATURES.md** — corrected the design-system status: a brand palette/type foundation (`theme/brand.ts`) already exists; what's missing is shared UI components (screens still each declare their own styles).

## 2026-07-26 — Beta 3 · TestFlight · submitted for review

Build `1.0.1` submitted for external Beta App Review on 2026-07-27. Ships the client-side fixes below; the server-side fixes (friends-only feed RLS, `delete-account` v4, data cleanup) were already applied live.

### Added
- **Delete your own posts.** Your posts now show a trash button; deleting asks for confirmation, removes the post optimistically, and restores it if the delete fails. Backed by the existing `posts_delete_own` RLS policy (reactions cascade).

### Changed
- **Redesigned the composer mood picker.** Previously moods showed as the few chips that fit on one line plus a **"+ more"** button that opened a separate sheet: the row didn't scroll, moods past the first few were hidden, and it let you select **several** moods even though a post only ever displays one (the extras were saved but never shown — misleading). It's now a **single horizontally-scrollable row of all moods** with no "+ more" sheet. How it works now:
  - **Swipe** the row left/right to see every mood.
  - **Single-select:** tap a mood to choose it; picking another **replaces** the previous one; tap the selected mood again to clear it. Whatever you pick is exactly what attaches to the post and shows on your card.
  - Tapping a mood **while the keyboard is open** selects it in one tap (the row keeps the keyboard up).
  - Removed the now-unused mood sheet/modal and the width-based "which chips fit" logic.

### Fixed
- **The feed is now friends-only — no more seeing strangers' posts.** Post visibility was open to every signed-in user (`posts_select_all`), so a new account saw everyone's posts. A migration replaces it with a policy that only exposes your own posts and those of your **accepted friends** (`friend_requests.status = 'accepted'`). Posts use this looser friendship gate on purpose; the sensitive cycle events/snapshots keep their stricter mutual-sharing gate. Enforced server-side. _(Applied to Supabase; migration `20260724193000_posts-friends-only-select.sql`.)_
- **New accounts no longer flood the feed with backdated cycle history.** Auto-post now only creates period events dated on/after account creation (the 180-day HealthKit lookback is still used for cycle-length estimation, just not for posting). Existing signed-in users pick up the account-creation timestamp automatically on their next app launch (the session is re-derived from Supabase on startup) — no manual re-login needed.
- **Deleting your account now actually removes all your data.** The `delete-account` edge function did a **soft** delete of the auth user (`shouldSoftDelete = true`), which left the auth row in place so *nothing* cascaded, and it never touched the non-cascading tables. It now (1) explicitly clears `posts`, `post_reactions`, `event_reactions`, and `boops` (best-effort — a single table error is logged, not fatal), then (2) **hard-deletes** the auth user so the cascading tables (`users`, `cycle_events`, `cycle_snapshots`, `notifications`, `device_tokens`, `friend_requests`, `friend_sharing`, `friend_recommendations`) are removed. Fixes the "Could not delete account right now" error. _(Deployed — `delete-account` v4; pre-fix soft-deleted accounts swept via the cleanup script.)_
- **Composer keyboard can now be dismissed** three ways: **tapping anywhere outside the text box** (a post, your cycle card, or empty space), **dragging** the feed (`keyboardDismissMode="on-drag"`), or the **Done** return key. The feed now uses `keyboardShouldPersistTaps="never"`, so a tap outside the input is consumed to dismiss the keyboard rather than also activating what you tapped.
- **Boop & heart states on your own post/event now look and act disabled.** You can no longer heart your own post/cycle event (it was working when it shouldn't), and both the boop and heart controls render in the disabled color on your own items.
- **"Connect Apple Health" bullet points now align with their text** (they previously sat below the line).
- **Clearer auto-post wording** on the onboarding step ("Choose which updates post automatically" instead of the confusing "Pick what posts automatically" / "Choose what auto-posts").

### Infrastructure & release setup
- **Enabled the AI edge functions.** Set the `OPENAI_API_KEY` edge-function secret and deployed `avatar-generator`, `cycle-guidance`, and `friend-recommendations` (all ACTIVE, v1) via the Supabase CLI. This turns on avatar generation and the AI cycle-guidance / friend-recommendation features. _(Still pending: `notifications-handler` + the `schedule-*` cron migrations — need an Expo push token.)_
- **Server-side fixes already applied to Supabase** (live without this build): friends-only feed RLS, `delete-account` v4, and the one-time data cleanup. This build ships the client-side fixes (composer/keyboard, delete-post, self boop/heart, mood picker, backdating cutoff, onboarding copy).

### Test instructions (for testers)
> You'll need some **menstrual** data logged in Apple Health to see your cycle info. Please flag anything confusing, broken, or slow — and tell us about any crashes, bugs, or feature requests.

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
