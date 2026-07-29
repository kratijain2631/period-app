# Release notes

Changelog for this app's builds. Newest first. See [INSTRUCTIONS.md](INSTRUCTIONS.md) for how this file is maintained.

**`· public`** on a header means the build was **submitted for Beta App Review / available to external (public) TestFlight testers**. Builds without it were uploaded to TestFlight but kept **internal** (not submitted for external review).

## Unreleased

### Added / Changed
- **Friendship now has a clear, privacy-enforced cycle-sharing boundary.** Accepting a friend request automatically shares the core social data—phase, cycle/calendar timing, date-only period history needed for sync scores, and freshness. Manual posts and selected moods remain visible when deliberately published. Removing the friend ends access.

### Fixed
- **Raw HealthKit detail is no longer readable by friends.** Raw snapshot/event tables are owner-only; new server-side projections omit flow intensity, symptoms, BBT, cervical mucus, ovulation/progesterone signals, IDs, and metadata. Friends receive only safe cycle summaries and published cycle-event fields.
- **Circle refresh no longer rewrites sharing state every 60 seconds.** Sharing is created once on friend acceptance (with an existing-friend backfill) instead of being repeatedly upserted on focus, pull-to-refresh, and polling.

### Infrastructure & release setup
- **Pending deployment:** apply `20260729000000_friend-cycle-summary-privacy.sql` to Supabase before testing this client change; it creates the safe friend-summary/event RPCs and makes raw cycle tables owner-only.

### Docs / process
- **Claimed active work (2026-07-29).** Marked the explicit/revocable consent-model fix (including removal of the 60-second sharing reset) and contact-based friend discovery as WIP so concurrent contributors do not duplicate them.
- **Backlog updated from tester feedback (2026-07-29).** Removed the resolved data-only "unknown phase" report; added post editing with an Edited label, removal of the redundant Circle person-plus control, consolidated profile settings/account actions, avatar UX scoping, and contact-based friend discovery; marked the stale rebuild/resubmit TODOs complete because TestFlight build 1.0.3 (build 7) superseded them.
- **Atomic, rollback-able builds via git tags.** Every build is now tagged `v<version>-build<n>` (e.g. `v1.0.6-build10`) on its version-cut commit, so each build maps to one immutable commit you can roll back to (`git checkout v1.0.5-build9`). Tagged builds 6–10 retroactively; codified in INSTRUCTIONS §2 & §9.
- **INSTRUCTIONS.md §11 — multi-person collaboration.** Added a workflow for more than one person (and their Claude) on the repo: `git pull --rebase` before starting and before every push, claim an item by marking it `- [~] 🚧 (WIP — name)` and pushing before you work, coordinate lanes to avoid the big shared screens, and treat RELEASE_NOTES `## Unreleased` as the shared record.

## 2026-07-28 — TestFlight build 1.0.6 (build 10)

Build `1.0.6` — the two user-facing changes that were sitting unreleased: the **Invite Friends** button now shares the TestFlight download link, and your **profile shows your @handle** instead of your email (email moved into Account settings). Plus the docs/process cleanup below. _Uploaded to TestFlight; submit for Beta App Review in App Store Connect to make it `· public`._

### Changed
- **"Invite Friends" now shares the TestFlight download link.** The invite message (from "Grow Your Circle") includes the public TestFlight join link so friends can actually install the app, not just a text blurb. (`FriendsScreen.tsx`, link constant in `app/config/branding.ts`.)
- **Your profile ("You" tab) shows your @handle, not your email.** The top of the profile used to show your email (twice); it now shows your alias/@handle, and your **email moved into the Account settings** below. (`ProfileScreen.tsx`.)

### Docs / process
- **Renamed build entries to "TestFlight build X.Y.Z (build n)"** (dropped "Beta N") across RELEASE_NOTES + TODO, and updated the INSTRUCTIONS §2 header convention to match. (Kept Apple's own term "Beta App Review".)
- **INSTRUCTIONS.md** — added §9 (the **unsupervised-work loop**: prioritize the whole backlog, batch fixes per build, always push) and §10 (**minimize permission prompts**); §2 now requires the version + build number in each header.
- **FEATURES.md** — reconciled the "Remove friend" item to reflect its move to the friend's sync page (was still describing the old on-list button).
- **Dev env (not shipped):** broadened the local permission allowlist and set `permissions.defaultMode` in the git-ignored `.claude/settings.local.json` to reduce prompts.

## 2026-07-28 — TestFlight build 1.0.5 (build 9) · submitted for review · **public**

Build `1.0.5` (buildNumber 9) — **built and submitted to TestFlight** (headless auto-submit). Friends UX + polish batch: a working Invite button, Remove-friend moved to the friend's page, no more duplicate profile page from the cycle card, and more accurate cycle math around daylight-saving days. All client-side.

### Added / Changed
- **"Invite Friends" now actually invites.** The button opened nothing (just set an invisible notice); it now opens the native share sheet with an invite message so you can text/share it. (`FriendsScreen.tsx`.)
- **Remove-friend moved to the friend's page.** The Remove control is no longer on the friends list; instead, open a friend (their sync page) and use **Remove friend** at the bottom (below Boop), which asks for confirmation and then removes for both of you and returns to the list. (`FriendSyncScreen.tsx`, `FriendsScreen.tsx`.)

### Fixed
- **Tapping your cycle card no longer opens a duplicate profile page.** The Home cycle card and the "You" tab used to open two separate copies of the same profile screen; the cycle card now just switches to the single "You" tab. (`AppNavigator.tsx`, `HomeScreen.tsx`.)
- **More accurate cycle math around daylight-saving days.** Day counts and period-run detection now round to whole calendar days, so a 23h/25h DST day can't split a period or shift your cycle day by one. (`packages/domain/cycles/models.ts`.)

## 2026-07-28 — TestFlight build 1.0.4 (build 8)

Build `1.0.4` (buildNumber 8) — **built and submitted to TestFlight** (headless auto-submit). A small polish batch on top of the Beta 5 crash fix: the double-tap-to-like fix and a branded launch screen (plus a dev-only test fix). All client-side.

### Fixed
- **Double-tapping a post/event always likes it now (never un-likes).** Previously, double-tapping something you'd already liked with the default emoji removed the like; now double-tap only ever adds/keeps the like, Instagram-style. (`HomeScreen.tsx`.)

### Added
- **Branded launch screen.** On every app open, a short (~2.4s) intro shows **Cadence — "where your cycle meets your circle"** with a red-drop mark, then fades into the app. It overlays the app while it loads, so it doesn't add a loading wall. (`app/components/brand/BrandSplash.tsx`, `App.tsx`.)

### Developer
- **`npm test` is green by default.** The architecture-sync LLM-eval test now skips (instead of hard-failing) when `OPENAI_API_KEY` isn't set locally; it still runs in CI. (`__tests__/architecture-sync.test.ts`.)

## 2026-07-28 — TestFlight build 1.0.3 (build 7)

Build `1.0.3` (buildNumber 7) — **built and submitted to TestFlight** (headless via `--auto-submit`, now that `ascAppId` is set; uploaded to App Store Connect, processing on Apple's side). **The TestFlight crash fix.** Diagnosed from the crash logs as a native HealthKit crash: serializing an `HKSampleQuery`'s `NSSortDescriptor` over XPC aborts on iOS 26 whenever there's real menstrual data to read (which is why it slipped past Apple's review on empty Health data but crashed real testers). Patched `@kingstinct/react-native-healthkit` (via `patch-package`) to stop sending the sort descriptor — behavior-neutral, since the app already sorts samples by date in JS. Also ships the earlier hardening (app-wide error boundary + module-scope background task).

### Fixed
- **Fixed the crash on launch / when reading Apple Health data.** See above — the app no longer crashes when it queries your menstrual data from Apple Health. (`patches/@kingstinct+react-native-healthkit+10.1.0.patch`, `package.json` postinstall.)

### Fixed / hardening (TestFlight crash investigation, 2026-07-28)
- **Background task now registers correctly on every launch.** `TaskManager.defineTask` for the cycle background-sync was only called inside the register function (post-mount); it now runs at module scope, as Expo requires — so when iOS relaunches the app headlessly to run the task, the handler is always defined. This was a likely contributor to intermittent launch crashes. (`app/services/healthkit/backgroundSync.ts`.)
- **Added an app-wide error boundary.** A JS error on launch used to hard-crash the release build to a blank screen; it now shows a readable "Something went wrong" screen with the error text, so testers can screenshot it and we can diagnose. (Native crashes are unaffected — those still need the device crash log.) (`app/components/ErrorBoundary.tsx`, `App.tsx`.)
- _See [BUGS.md](BUGS.md) → Crashes for the full investigation, remaining hypotheses (New Architecture + Nitro/HealthKit), and how to pull the crash log._

## 2026-07-28 — TestFlight build 1.0.2 (build 6)

Build `1.0.2` (buildNumber 6) — built on EAS and **submitted to TestFlight** (headless, via the ASC API key, after setting `submit.production.ios.ascAppId` in `eas.json` — see [TROUBLESHOOTING.md](TROUBLESHOOTING.md) #14). Apple processes it for a few min–hours before it reaches testers. The friend-graph refresh + social batch: the Circle "Add a friend" button, pull-to-refresh + focus-refetch + 60s polling across the feed/circle/notifications, the in-app "friend accepted your request" notification, and a visible **mutual** Remove-friend button. All client-side; the server (Supabase) is unchanged since Beta 3. Plus the product-doc additions (empowerment mission, sync-score leaderboard, pair recommendations) and the codebase-review findings.

### Fixed
- **Circle tab "Add a friend" button now works.** The top-right person-plus button in the Circle tab previously just cleared an already-empty search box, so it looked broken. It now **focuses the search field** (opening the keyboard) so you can immediately type a friend's name or email. JS-only change — no rebuild needed. (`FriendsScreen.tsx`.)
- **The feed, friends, and notifications now refresh without restarting the app.** Previously everything loaded only once on mount, so new posts, incoming friend requests, and newly-accepted friends wouldn't appear until you force-quit and reopened. Now they refresh three ways: **pull down** on the Home feed or Circle screen to refresh manually; the tab **auto-refreshes when you open it** (`useFocusEffect`); and it **silently polls every 60 seconds** while open. Home refreshes feed + notifications + friend requests; Circle refreshes friends + requests. JS-only — no rebuild needed. (`HomeScreen.tsx`, `FriendsScreen.tsx`, `useNotifications.ts`.)

### Added
- **Remove a friend with a visible button (mutual).** Each friend row in the Circle tab now has a tappable **Remove** control (it was previously just a label; removing was only possible via an undiscoverable long-press). It asks for confirmation, then removes the friendship for **both** people — you both stop seeing each other's updates and would need a fresh request to reconnect. (Backed by the existing `remove_friend` RPC, which already cleared both sides.) (`FriendsScreen.tsx`.)
- **"X accepted your request 🎉" notification.** When someone accepts your friend request, you now get an in-app notification (a "New friends" section in the notifications bell). It's computed on the client during the normal refresh cycle (pull / tab-focus / 60s poll) — no server changes — by comparing your accepted sent-requests against a locally-remembered "already seen" list, so each acceptance notifies once. (Existing friends are baselined silently on first launch, so the bell doesn't flood.) Instant push and lock-screen notifications while the app is closed are still to come. (`useNotifications.ts`, `NotificationsSheet.tsx`, `HomeScreen.tsx`.)

### Infrastructure & release setup
- **Headless TestFlight submits.** Set `submit.production.ios.ascAppId = "6793724458"` in `eas.json`, so `eas build --auto-submit --non-interactive` (and `eas submit`) upload to App Store Connect using the stored ASC API key — no interactive Apple ID login. This is what made every build from here on submit in one command. (See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) #14.)

### Docs
- **PITCH.md — added a "Market landscape & comparables" section**: the social-tracking playbook (Strava, Beli, Flighty, Letterboxd, Duolingo, Oura/Whoop), the period-app competitors (Flo, Clue, Stardust, Natural Cycles, Apple Cycle Tracking), and the friend-graph white space.
- **Full-codebase review pass (2026-07-27)** — logged findings across the docs (no code changed):
  - **PITCH.md** — added "The engagement loop (the actual bet)": auto-logged Health data is the Strava/Flighty "it logs itself" superpower; cold-start + consent are the gating risks.
  - **FEATURES.md** — added "The retention loop" (concrete build order translating the market playbook: auto-populating feed, sync-score leaderboard, shareable cycle recap, care actions, streaks/groups); corrected the sync score from "dummy" to the real `computeSyncScore` model; flagged the consent-model gap.
  - **BUGS.md** — new findings: consent is auto-granted on friend-accept with no revoke UI (dead `setFriendSharing`), contradicting the "explicit mutual consent" docs; duplicate underscore/hyphen migration pairs; `npm test` red-by-default because `architecture-sync.test.ts` hard-fails without `OPENAI_API_KEY`; slow networked tests; double-tap "like" un-likes; `loadFeed` serial waterfall; a minor DST off-by-one in the cycle model. Re-scoped the "friend accept → no friendship" bug as likely stale soft-deleted-account data.
  - **TODO.md** — added a "Code health / tech debt" section (fix consent model, reconcile migrations, green/fast tests, decompose god-components, parallelize `loadFeed`).
  - **LEARNINGS.md & SCHEMA.md** — reconciled the stale "explicit mutual consent" claims: both docs described consent as a two-sided opt-in, but the app auto-grants sharing on friend-accept. Reframed as schema-intent-vs-actual-behavior with pointers to the consent-model bug.
  - **FEATURES.md** — corrected the design-system status: a brand palette/type foundation (`theme/brand.ts`) already exists; what's missing is shared UI components (screens still each declare their own styles).
- **Added core pitch/feature pillars (2026-07-27, requested).** PITCH.md: elevated **women's empowerment** to the stated mission; added **sync scores (incl. a top-friends leaderboard)** and **relational, phase-aware recommendations** ("go work out with your friend," "send her some love") as signature hooks. FEATURES.md: expanded the sync score into a **top-5 "most in sync" leaderboard**, added **phase-aware pair recommendations**, broadened Care actions ("send some love"), and threaded the empowerment mission through the guiding idea.
- **Logged testing findings + feature requests (2026-07-27).** BUGS.md: incoming friend requests don't refresh live (only fetched on mount — no focus-refetch/realtime/pull-to-refresh), push notifications not wired up (`notifications-handler` undeployed), Circle-tab "Add a friend" button is a no-op (should focus search), and `ProfileScreen` is duplicated across the Home cycle-card and the "You" tab. FEATURES.md: branded launch/intro screen with tagline, biometric (Face ID) app lock, and an expanded settings page.

## 2026-07-26 — TestFlight build 1.0.1 · approved · **public**

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

## 2026-07-23 — TestFlight build 1.0.0 (build 5) · approved · **public**

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

## 2026-07-22 — TestFlight build 1.0.0 (build 4) · approved · **public**

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
