# TODO

Open items, roughly in priority order. Done work isn't listed here.

## Finish the `main` integration (post-merge) — completed
We merged `main` (57 commits) onto our identity/docs. To make it actually run on **our** Supabase + Apple account:
- [x] `npm install` new native deps (`react-native-svg`, `expo-image-picker`, `expo-font`).
- [x] Apply main's DB migrations to **our** Supabase (schema, done via the SQL editor).
- [x] Deploy `delete-account` edge function (done — powers the delete flow; no secrets needed, uses Supabase's auto-injected keys).
- [x] **Rebuild, reinstall, and test.** _(Completed and superseded by the later verified TestFlight build 1.0.3 (build 7), 2026-07-28.)_
- [x] **Resubmit to TestFlight without Beta App Review.** _(Completed and superseded by TestFlight build 1.0.3 (build 7), which was built, uploaded, and verified stable on 2026-07-28.)_

## Fix avatars + AI features (OpenAI key)
- [x] Get an **OpenAI API key** and set it as an edge-function secret (`supabase secrets set OPENAI_API_KEY=…`), then deploy the AI edge functions (`avatar-generator`, `cycle-guidance`, `friend-recommendations`). This fixes the avatar feature and the AI guidance/recommendations. _(Done 2026-07-24: secret set + all three functions deployed ACTIVE via the Supabase CLI. Key kept out of the repo — **rotate it**, it was shared in a chat transcript.)_
- [ ] Deploy `notifications-handler` (needs an Expo push access token) and then run the 3 `schedule-*` cron migrations.

## Deploy / data follow-ups (2026-07-24)
- [x] **Redeploy the `delete-account` edge function** — now also hard-deletes the auth user and clears `posts` / `post_reactions` / `event_reactions` / `boops`. _(Done — deployed v4, 2026-07-26.)_
- [x] **Applied the friends-only feed RLS** (`posts_select_own_or_friends`, friendship-based) to Supabase. _(Done, 2026-07-26.)_
- [x] **One-time cleanup of orphaned + backdated rows** via [`supabase/cleanup/2026-07-24-orphaned-and-backdated-cleanup.sql`](../supabase/cleanup/2026-07-24-orphaned-and-backdated-cleanup.sql) (orphaned rows, demo seed rows, backdated flood). _(Done, 2026-07-26.)_
- [ ] **Purge pre-fix soft-deleted accounts** (STEP 4 of the cleanup script) — accounts deleted before the hard-delete fix are only soft-deleted and still linger in friend lists. _(In progress 2026-07-26.)_

## New features (early tester feedback — 2026-07-24)
Larger asks that need their own design + PRs (not part of the composer/reaction bugfix PR):
- [ ] **Sign in without Apple.** Add an alternative auth path so people can use the app without an Apple ID (e.g. email/OTP via Supabase Auth). Touches `AuthScreen`, `appleAuth`/auth services, Supabase Auth config, and onboarding. See FEATURES.md → "other auth methods" (Level 2).
- [ ] **Manual cycle entry (no Apple Health).** Let users enter/log cycle data by hand instead of requiring HealthKit — needed for non-iOS-Health users and Android later. Requires new logging UI + data model. See FEATURES.md → "In-app logging" / Level 2 "in-app tracking (vs. read-only)".

## Ship the beta (external TestFlight)
- [x] Production build (`eas build --profile production --platform ios`)
- [x] Submit to App Store Connect (`eas submit --profile production --platform ios --latest`)
- [x] App Store Connect / TestFlight setup: export compliance, beta description, privacy policy URL, review notes
- [x] Submit for Beta App Review — **awaiting Apple (~1 day)**
- [x] **TestFlight build 1.0.1 built + submitted for Beta App Review** (2026-07-27) — ships the client-side fixes; server-side fixes already live.
- [x] **TestFlight build 1.0.2 production build** (2026-07-28) — friend-graph refresh + social batch (add-friend button, pull-to-refresh + focus + 60s polling, acceptance notification, mutual remove-friend). Build #6 finished on EAS (`.ipa` ready). Friend-graph refresh + social batch.
- [x] **TestFlight build 1.0.2 submit** (2026-07-28) — done, headless. Root cause of the earlier block: `eas.json` `submit.production` was `{}`, so `--non-interactive`/`--auto-submit` fell back to an interactive Apple ID login. **Fixed by adding `submit.production.ios.ascAppId = "6793724458"`** (the iOS submit fields nest under an `ios` key — that tripped a first attempt). Now `eas submit --platform ios --profile production --latest --non-interactive` runs with EAS's stored ASC API key, no Apple login. Build #6 uploaded to App Store Connect ([submission 9088362f](https://expo.dev/accounts/kratijain26/projects/period-app/submissions/9088362f-2568-4912-8ef8-f123332785f7)). See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) #14.
- [x] **TestFlight build 1.0.3 (build 7) built + submitted to TestFlight** (2026-07-28) — the native HealthKit crash fix (NSSortDescriptor XPC patch). Built + auto-submitted headless in one command. Processing on Apple's side.
- [x] **TestFlight build 1.0.3 — crash fix verified** (2026-07-28): 1.0.3 (7) no longer crashes on startup. Give **1.0.3** to testers (not 1.0.2 — only 1.0.3 has the fix).
- [ ] **Share the 1.0.3 tester link** and confirm with a few testers (incl. someone with lots of Apple Health cycle data) that it's stable. Public TestFlight join link: **https://testflight.apple.com/join/akMkE8kW** (also wired into the in-app "Invite Friends" share message — constant `APP_INVITE_URL` in `app/config/branding.ts`).
- [x] **Fixed the tester test-description** — now says **"menstrual"** not "period", typos fixed. (Applied in the 1.0.1 test instructions.)
- [ ] Once approved: share the (public) TestFlight link with testers.

## Privacy policy
- [ ] **Make the privacy link permanent.** It's currently a Claude artifact (fine for the beta, but tied to Anthropic hosting). Move it to a permanent host before public launch — options: Netlify drag-and-drop (easiest, free), a small separate public repo + GitHub Pages, or your own domain.
- [ ] Before public launch: consider a legal review of the policy (sensitive menstrual-health data).

## Naming
- [ ] Decide the final app name, then check App Store name uniqueness, trademark, and domain availability. **None final.** Ideas so far:
  - _Abstract / evocative:_ Rhythm, Cadence, Tide, Phase, Kora, Lunalink, The Monthly, Orbit, Cirql
  - _Sisters / social:_ InSync, Sync Sisters, Sisters, Sisters by Blood, Coven
  - _Descriptive:_ Cycle Companion, Cycle Connection, Period, Period App, Social Menstruation App
- [ ] Make naming consistent, or change the name. The display name is "Cadence" but the internal identifiers are mixed — iOS bundle id `com.syncsisters.cycle`, and slug / npm name / repo all `period-app`. Decide whether to align them to one namespace (e.g. cadence) or rename the app entirely. Best done **pre-launch**. Weigh the change-costs in [IDENTIFIERS.md](IDENTIFIERS.md): the bundle id is costly to change and invisible to users; the slug must match the EAS server; scheme / npm name / repo are cheap.

## Improve the app
- [ ] Improve the app — see [FEATURES.md](FEATURES.md) for the feature/design roadmap and [BUGS.md](BUGS.md) for known bugs.

## Code health / tech debt (from the 2026-07-27 codebase review)
Structural cleanups — not user-facing, but they make everything after them cheaper and safer. Details/rationale in [BUGS.md](BUGS.md).
- [ ] **Fix the consent model (highest priority — it's a privacy-honesty issue on menstrual data).** Either (a) make sharing genuinely explicit + revocable — wire up the unused `setFriendSharing`, add grant/revoke UI, and stop `loadFriends` from force-resetting `has_shared` via `ensure_friend_sharing`; or (b) drop the "explicit mutual consent" framing from copy + LEARNINGS.md and own the "auto-share within your circle" model. Code, UI copy, and docs must agree. Gates the social auto-broadcast features in FEATURES.md.
- [ ] **Reconcile duplicate migrations.** ~8 underscore-vs-hyphen migration pairs (`event_reactions`/`event-reactions`, `friend_recommendations`, `remove_friend`, `cycle_guidance`, `sync_score`, etc.). Confirm which set was actually applied to prod, keep one of each, and note the resolution so a fresh `supabase db reset` reproduces prod exactly.
- [ ] **Make `npm test` green + fast by default.** Skip (don't fail) `architecture-sync.test.ts` when `OPENAI_API_KEY` is absent outside CI, and split the networked Supabase integration tests (~150s each) out of the default `test` script so the fast unit tests can run in seconds.
- [ ] **Decompose the god-components.** `HomeScreen.tsx` (~2,200 lines, 20+ `useState`, feed + composer + reactions + boops + notifications + cycle card in one file), `ProfileScreen` (~1,280), `FriendSyncScreen` (~1,200), `FriendsScreen` (~1,080). Extract feed rows, the composer, and the reaction/boop optimistic-update logic (currently near-duplicated 4× for post×event / add×remove) into hooks/components. Improves testability and reduces merge pain.
- [ ] **Parallelize `loadFeed`.** Replace the 8-step serial `await` waterfall with `Promise.all` for the independent reads so feed load isn't the sum of every round-trip.

## Before a public App Store release (not needed for beta)
- [ ] App Privacy "nutrition labels" + age rating in App Store Connect (declare health-data collection)

## Nice to have
- [ ] Set up EAS Update (`expo-updates`) for instant over-the-air JS updates during the beta (no rebuild)
- [ ] Cosmetic: clean up leftover "Cycle Companion" references in docs (`thoughts/`, `prompts/`, `implementation-docs/`, `overall/`)

## Separate track (not this repo)
- [ ] Fix the "Sync Sisters" app in Newly: run `eas init --force` inside Newly so it gets its own EAS project id (currently collides with this project's id)

See [IDENTIFIERS.md](IDENTIFIERS.md) for all names/identifiers and where to change them.
