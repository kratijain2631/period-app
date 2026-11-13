# TODO

Open items, roughly in priority order, with completed items retained as a decision and delivery record.

- [x] **Retire nightly cycle-guidance after on-demand rollout — DONE 2026-11-12.** Owner authorizes retirement and confirms all important users on 1.0.15 with working refresh; accepts that older clients may lose fresh guidance. Daily phase reminders stay enabled.
  - [x] Prepare the idempotent named-job migration and local PostgreSQL regression fixture, preserving cached advice/RPCs/functions and other jobs.
  - [x] Resolve the replacement-upload gate: 1.0.15 (36) built/uploaded and owner confirms availability, active-user adoption and refresh success. The prior Apple agreement failures no longer block this rollout; DSA declaration completion remains separate.
  - [x] PR #83 merged at `0765324f`; [Database deploy run 43274996960](https://github.com/kratijain2631/period-app/actions/runs/43274996960) applied `20261111211000` to staging, passed all 75 staging access checks, then applied production. Post-deploy read-only metadata confirms nightly guidance absent and `daily-phase-change-reminder` active at 15:00 UTC in both projects.

- [x] **Fix offline cold-start alias onboarding** (2026-11-12, included in built/uploaded 1.0.16 / 37): distinguish an unavailable profile from a confirmed missing alias; keep current-account cache, retry on reconnect and guard account changes. Regression and isolated staging checks pass.
- [x] **Deliver the offline alias fix:** 1.0.16 (37) build `41c1a64e-ac8a-480f-a72a-5ff377edce5e` and Apple upload `35b18e69-b469-498b-bf5a-f8a0797d2f7a` both `FINISHED`, rechecked 2026-11-12. Apple processing/group visibility remains separate.
- [x] **Retest the offline alias fix on a phone in 1.0.16 (37).** Owner confirms 1.0.16 installed and force-close/offline restart works (2026-11-12). Separate no-cache/account-switch checks remain in the extended phone list.
- [x] **Complete the current Apple DSA declaration** — owner reports resolved 2026-11-12. Future EU App Store trader reassessment below remains open.
- [x] **Show offline status instead of “No updates yet” on an empty Home feed** — source fixed 2026-11-12; uses existing connection state and preserves visible items.
- [ ] **Publish/device-check the offline feed message in the next native build.** Not included in installed 1.0.16; retain the separate 1.0.17 candidate’s Expo access and SMS validation gates.

- [ ] **Before any future EU App Store launch, reassess DSA trader status.** Current owner-confirmed plan (2026-11-12): TestFlight only. Before enabling EU App Store distribution, review the then-current commercial/professional plans against [Apple’s DSA criteria](https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements/), update the account/app declaration in App Store Connect, and, if a trader, provide and verify the required public contact information. Confirm compliance is complete before launch. TestFlight-only intent does not settle status for a future EU release; the owner reports the current declaration resolved on 2026-11-12.

- [~] **Manual refresh for Phase Guide** — 🚧 (WIP — Codex, 2026-11-11; implementation/deployment and owner refresh tests complete; extended native QA pending). The You page now has an explicit Refresh tips action that bypasses the current advice cache, preserves visible tips on failure, rejects late account/phase responses and enforces a two-minute server cooldown. Nightly generation was subsequently retired through PR #83 on 2026-11-12; saved advice and daily reminders remain.
  - [x] Add the button, loading/error/cooldown feedback, scoped controller, service and handler support.
  - [x] Add additive refresh-claim migration and regression checks: 145 Jest tests pass, TypeScript/Deno checks and iOS JS export pass, PostgreSQL fixture verifies leases/cooldown/account/phase isolation, and actual-component browser fixture confirms loading/error feedback with tips retained.
  - [x] Merge PR #79 and apply the migration through Database deploy run 43154655774: 75 staging access checks passed before production. Deploy the handler to staging, verify authenticated cache/refresh/cooldown/authorization with an isolated synthetic account, delete it, then deploy production handler (ACTIVE version 3). No AI call or shared persona reset.
  - [x] Register native build 1.0.15 (36) on EAS (`70771a46-d436-4d5a-8eb2-98bfbf5625c2`, `FINISHED` rechecked 2026-11-12), tagged `v1.0.15-build36`; automatic submission also `FINISHED` (`c777ddf1-bf03-4475-ba3a-f36476c233e5`).
  - [x] Confirm 1.0.15 (36) native compilation and Apple upload: EAS build and submission both `FINISHED` on recheck 2026-11-12; no submission error.
  - [x] Owner confirms 1.0.15 is installed, all important users updated, successful Refresh tips and in-session airplane-mode refresh retains advice (2026-11-12). This confirms availability to the tested group, not every external tester.
  - [ ] Complete remaining phone checks: account/phase changes, VoiceOver/Dynamic Type, HealthKit and two-device concurrency. Cold-start offline testing found the separate alias bug above. Owner reports DSA resolved; no simulator runtime is installed.

## Verification delivery and staging guidance

- [ ] Configure a transactional email sender and a reachable confirmation destination. Verify both links with controlled inboxes, including an Apple relay address. See [the delivery runbook](TROUBLESHOOTING.md#contact-verification-delivery-and-guidance-on-staging-2026-11-13).
- [ ] For a live generation test, supply a designated staging key with a spending limit and repeat with a staging persona. The usual staging setup intentionally omits this key. Cached guidance and refresh limits passed on November 13.

## Widget rollout and follow-ups

- [x] Redesign Received and Sent friend requests with tab counts, compact member rows, distinct actions and accessible touch targets.

- [x] Support comments on automatic period and phase updates and give each comment more room above the divider.

- [x] Open a dedicated Write a post page from Share an update in the iPhone Feed, retain unfinished drafts when backing out, and return to Feed after successful sharing.
- [x] Ask about contact details, ranking visibility and post settings during first-time setup.
- [x] Fix the flat, clipped tip on the illustrated drop in the You bio banner and check the shared profile artwork at 320, 390 and 480 px.
- [x] Show received and sent pending requests under Friend requests. Allow the sender to cancel there or from the recipient’s profile, and return the contact to the selectable list.
- [ ] Run the new flows on an iPhone, including real contact confirmation after the hosted SMS provider is enabled. [Walkthrough](TESTING.md#feed-setup-and-sent-requests).

- [x] Move Settings to its own page, group email/phone change actions under Personal info, put Post settings and ranking visibility under Privacy and permissions, and finish with Sign out and Delete account. Allow enough headroom for the bio mascot at every preview width.

- [x] Preview a thumbnail using Home’s actual waving mascot and match the opening wordmark to Home.
- [x] Review the revised icon in the live preview. The owner approved the waving mascot for the app thumbnail.
- [x] Ship the approved thumbnail, matching opening wordmark, standalone Settings and You bio fix together in TestFlight 1.0.19 (41). [iPhone walkthrough](TESTING.md#1019-settings-and-mascot).

- [x] Give the redesign a distinct 1.0.18 TestFlight version. The previous 1.0.17 (39) contains the same features. This design’s visual reference is v1.0.

- [x] Record every design request in the [release notes](RELEASE_NOTES.md) and [widget inventory](UI_ARCHITECTURE.md#page-directory). The [versioned design gallery](../design/2026-11-12/v1.0/README.md) includes the 1024 px thumbnail, opening page, every preview page, sample profiles and button destinations.
- [x] Put the small cycle preview on Home, the full wheel and Phase Guide on You, and link Home previews to their owners. Show phase ranges on press/hover, keep the ring legible at 320 px, retain guidance refresh and use the two-line mixed-font tagline.
- [x] Finish You with My posts. Keep contact details and posting preferences in Settings, add the Community rankings visibility switch, and remove duplicate Circle, upcoming, check-in and profile callouts.
- [x] Add explicit cycle erasure and reconnection under Privacy and permissions, and preserve the empty-sync safeguard for people who keep sharing.
- [x] Show who reacted or booped a written or automatic update when someone holds its reaction controls.
- [x] Add post comments, compact own-comment deletion, automatic collapse on another post and refreshed support/post ranking counts after deletion.
- [x] Merge the separate cycle comparison into the outward friend profile in the app and preview, including friend actions and shared updates.
- [x] Give friends a four-row scrolling list, incoming requests their own scroll box, matched contacts checkboxes and five-person batches, pending/accepted states and stacked invite actions. Add Friends, Notifications and outward profiles open outside the bottom tabs.
- [x] Give both Circle rankings consistent numbered rows and tabs. Link the Home match to Most in sync, use a scrolling Top 10 for both Community rankings, and refresh relevant boards when friendships change.

- [ ] **Settings: update and re-verify contact information.** Exercise changes to email and phone from You → Settings → Manage contact details on a staging iPhone: confirmation links, SMS, resend/expiry, cancelled changes, the new verified match and retirement of the old match. Add an explicit re-verification flow for an unchanged contact if needed; today the form verifies replacements.

- [x] Implement the illustrated four-tab app and extract reusable theme-independent cycle, feed, profile and Circle widgets. Record primary owners and secondary destinations in the [widget directory](UI_ARCHITECTURE.md#page-directory).
- [x] Implement recipient-only support rankings, opt-in global Top 10 rankings, request handling in Notifications and the Add friends flow. Refresh affected scores on post deletion.
- [ ] Run the [widget smoke check](TESTING.md#widget-and-circle-smoke-check) on a signed-in staging iPhone before release. Verify the new RPCs, visible changes across two accounts, VoiceOver, large type, narrow screens, contacts permissions and invite sharing.
- [ ] **Instagram Stories:** prototype the explicit export from your own written post; test preview, missing Instagram, cancellation, return and image saving on iPhone. See [feature scope](FEATURES.md#sharing-and-community-recognition).
- [ ] Pilot Top 10 with testers. Try private rank/milestones and distinct posting days; evaluate unwanted requests and whether a newcomer can reach the board. Verify post commenting and deletion from Feed and member profiles on-device; confirm both accounts see updated friendship counts.

## 🎯 Phase Guide — implementation/backend complete; finish native rollout
- [~] **Redesign how the "You" page do's/don'ts (cycle guidance) get generated.** 🚧 (WIP — Codex, 2026-11-03; content/cards complete; SQL + function deployed, 1.0.15 (36) built and uploaded; important users confirmed updated; extended device verification pending). Fixes the "No guidance yet" bug ([BUGS.md](BUGS.md)) at the design level, not just by babysitting a cron.
  - **2026-11-03 implementation:** immediate local fallback for every phase (including no Health data); authenticated `request-cycle-guidance` generates on page focus, caches against phase + `currentPhaseStart`, and uses caller-scoped claim/complete RPCs with a two-minute lease. Old-phase/old-cycle guidance is hidden, overlapping client calls coalesce, and account changes/late responses cannot replace the current user's tips. AI failures leave fallback visible and are not cached as AI results.
  - **2026-11-03 rollout:** additive SQL applied; `request-cycle-guidance` deployed with handler JWT verification and `PROJECT_PUBLISHABLE_KEY` configured. Live missing/invalid JWT requests return 401; RPC and table privileges verified. An owner-approved synthetic-account test verified authenticated AI generation, 200/202 duplicate-request handling and cache reuse; the account was deleted afterward. Concrete phase tips and readable cards replace the flip UI; editorial rules/sources are in [GUIDANCE.md](GUIDANCE.md). **Remaining before closing:** owner already confirmed availability/adoption for 1.0.15 (36); finish on-device offline/account-switch/HealthKit/accessibility verification. Build 34’s original upload failed over Apple agreements; build 36 supersedes it. No usable iOS simulator runtime is installed. See TROUBLESHOOTING → on-demand guidance.
  - [x] Implement fallback/content/cards and automated regression checks.
  - [x] Validate/apply additive SQL and deploy authenticated generation with the current publishable key.
  - [x] Verify real AI generation, cache reuse, account mismatch denial and overlapping requests with an approved synthetic account; remove test data.
  - [x] Commit/push implementation and release tag; build 1.0.13 (34) on EAS.
  - [x] Confirm replacement client Apple upload — 1.0.15 (36) build and submission both `FINISHED` (rechecked 2026-11-12). Earlier builds 34/35 failed with agreement errors; build 36 includes their guidance changes plus Refresh tips. Owner subsequently confirms availability/adoption and refresh success for important users; nightly generation retired on 2026-11-12.
  - [ ] Verify offline/account switching, real HealthKit sync, VoiceOver/Dynamic Type and two physical devices.
  - **Historical rationale for the original cron (retained for context):** it's a **precompute-and-cache** pattern — the AI call is slow (seconds) and costs money per call, and do's/don'ts only change **per phase**, so a nightly job generates one `cycle_guidance` row and the app reads it instantly + pays once, instead of calling the model on every page open.
  - **Historical failure (the reason for the redesign):** the cron is a **single point of failure** — *not scheduled → empty forever* (its schedule migration was never applied), and once scheduled the function **500’d** (service grants restored 2026-11-07; the 2026-11-08 run returned 200) (`permission denied for table cycle_snapshots` — its service-role key isn't in effect; see the separate blocker in [BUGS.md](BUGS.md) / "Fix avatars + AI" below). Both failures are invisible because `net.http_post` only reports the request was *dispatched*, never the function's status.
  - **Implemented design:**
    1. **Client-side fallback — DONE:** `fallbackPhaseGuidance` in `packages/domain/cycles/guidance.ts` supplies three dos/three don’ts immediately, including unknown phase. `PhaseGuide.tsx` renders full advice without hidden flip content.
    2. **Lazy on-demand + cache — DONE:** generate guidance the **first time a user views a phase**, write the `cycle_guidance` row, and reuse it until their phase changes. Cheap (once per user per phase), self-healing (no scheduling to forget), instant thereafter. The nightly cron then becomes an **optional pre-warm**, not the only path.
  - **Net:** (1) alone makes "No guidance yet" disappear; (2) drops the cron dependency entirely. Files: `ProfileScreen.tsx`, `PhaseGuide.tsx`, `app/services/supabase/cycleGuidance.ts`, `packages/domain/cycles/guidance.ts`, `supabase/functions/request-cycle-guidance` and the canonical `20261106190000` migration. _(Independent of, but related to, the service-role-key 500 — the fallback means the page works even while that's unresolved.)_

## ✅ Ship build 1.0.10 — DONE 2026-08-05 (build 30, auto-submitted)
- [x] **Cut the 1.0.10 TestFlight build.** Built + auto-submitted to TestFlight — **1.0.10 / buildNumber 30**, build ID `23781dc7-f1ae-48df-b147-2d91aed25ef0` (submission `31526850-…`). The real reason it kept "hanging at Compressing project files" was **not** the sandbox — the repo (in `~/Documents`) had an **iCloud-evicted `dataless` file** (`reference/wireframes.jpeg`) plus ~13,871 in `node_modules`, and eas's archive/fingerprint blocked reading them. Fixed by materializing the file + `EAS_SKIP_AUTO_FINGERPRINT=1` on Node 20 — full writeup + the exact command in [TROUBLESHOOTING.md](TROUBLESHOOTING.md) "Build & submission gotchas". _(Verify the build finishes + shows in TestFlight; submit for Beta App Review to make it `· public`.)_
- [x] **One-time dedupe of pre-fix duplicate `cycle_events` — DONE 2026-08-05 (Supabase SQL editor).** Removed the duplicate `phase_transition` rows the pre-1.0.10 bug wrote (kept the earliest per `user_id, event_type, phase, day`): 2 pairs for user `5faa6453…` — `follicular / 2026-08-03` and `menstruation / 2026-07-29` — plus a relabel of any `menstrual_flow` rows tagged with a non-`menstruation` phase. Preview re-run returned 0 duplicate groups. One-off cleanup (not a migration — the 1.0.10 fix prevents recurrence, per owner).

## Friend-cycle privacy RPC (1.0.11) — follow-ups
- [x] **Raw-table lockdown is LIVE (confirmed 2026-08-07 via `pg_policies`).** `cycle_snapshots`/`cycle_events` have only `*_select_own` policies — the `20260806010000` end-state is already in effect (no `*_select_own_or_friends` compat policy present). Friends read only via `friend_cycle_summaries()` / `shared_cycle_events()`. _(This corrects an earlier stale note that treated the removal migration as pending.)_
- [ ] **Get every tester off builds ≤1.0.10 (required minimum: 1.0.11).** The lockdown above **breaks friend-cycle sync on ≤1.0.10** only (those builds read the raw tables → now empty); that's the sole *breaking* reason to upgrade. **1.0.11 is the floor** — anyone on it is fine. **1.0.12 (build 33) is the latest** and is **additive/non-breaking** vs 1.0.11 (it just adds contact discovery), so moving 1.0.11→1.0.12 is only needed to test/use contacts, not for correctness. First check who's actually on ≤1.0.10 (TestFlight) — if everyone's already ≥1.0.11 this is a non-issue. Also confirm the RPCs exist (1.0.11 has no fallback): `select proname from pg_proc where proname in ('friend_cycle_summaries','shared_cycle_events');`
- [ ] **(Future only) If a real per-friend cycle-ring is ever added, extend `friend_cycle_summaries()` with `periodLengthDays` (+ `nextPhaseStart`/`nextPhase`).**
  - **Symptom that means you need this:** a *friend's* cycle ring draws its period (menstruation) segment at the default 5 days instead of their real length. (Can't happen today — friend views use the fixed-28-day `SyncRings`/`PhaseAvatar`, never the segment-sized `CycleRing`.)
  - **Why omitted now:** verified 2026-08-06 that no friend view reads these (`deriveCycleDay` uses only `latestSampleStart`+`cycleLengthDays`; `computeSyncScore` uses neither). Minimal projection = better privacy.
  - **Exact fix (~10 min):** add a **new** additive migration (never edit an already-applied one) doing `create or replace function public.friend_cycle_summaries()` with `'periodLengthDays', cs.snapshot -> 'periodLengthDays'` (and `nextPhaseStart`/`nextPhase`) added to the `jsonb_build_object`, mirroring `supabase/migrations/20260729000000_friend-cycle-summary-privacy.sql`; apply it in the Supabase SQL editor. **No client change needed** — `CycleSnapshot` already types these fields, so they flow through automatically once the RPC returns them; then pass `periodLengthDays={friendSnapshot.periodLengthDays}` to the new friend `CycleRing`.

## ⭐ On-device verification checklist (once build 1.0.9 is on a phone) — do before/during the friends beta
Most of build 1.0.8–1.0.9's newer features couldn't be verified in the dev env (no device, background execution untestable). Confirm on a real TestFlight install:
- [ ] **Friend-accept → mutual friendship works end-to-end** (2 accounts). The one flagged social-core risk, never live-verified — see [BUGS.md](BUGS.md). If broken, the whole social layer fails for testers.
- [ ] **The notifications page** (bell → dedicated page, new/read, doesn't wipe on open) and **reaction/boop in-app notifications** show (needs the engagement-triggers migration applied — done).
- [ ] **Instant friend-request notifications** (realtime) appear sub-second (needs the friend-requests-realtime migration — done).
- [ ] **Cycle ring** looks right for a real (non-28-day) cycle; **"Most in sync" leaderboard** appears with 2+ friends.
- [ ] **HealthKit permission sheet** wording is acceptable (the "update" text is unavoidable — key is Apple-required; confirm read auth still works).
- [ ] **Background posting + predicted reminder** (HealthKit background delivery, local scheduled notification) — hard to force; observe over a real cycle transition. See [CYCLE_SYNC.md](CYCLE_SYNC.md).
- [ ] **Push tokens register** — `device_tokens` table has rows after install (unblocks server-side push).
- [ ] **Haptics** fire on boops/reactions.

## Finish the `main` integration (post-merge) — completed
We merged `main` (57 commits) onto our identity/docs. To make it actually run on **our** Supabase + Apple account:
- [x] `npm install` new native deps (`react-native-svg`, `expo-image-picker`, `expo-font`).
- [x] Apply main's DB migrations to **our** Supabase (schema, done via the SQL editor).
- [x] Deploy `delete-account` edge function (done — powers the delete flow; no secrets needed, uses Supabase's auto-injected keys).
- [x] **Rebuild, reinstall, and test.** _(Completed and superseded by the later verified TestFlight build 1.0.3 (build 7), 2026-07-28.)_
- [x] **Resubmit to TestFlight without Beta App Review.** _(Completed and superseded by TestFlight build 1.0.3 (build 7), which was built, uploaded, and verified stable on 2026-07-28.)_

## Fix avatars + AI features (OpenAI key)
- [x] Get an **OpenAI API key** and set it as an edge-function secret (`supabase secrets set OPENAI_API_KEY=…`), then deploy the AI edge functions (`avatar-generator`, `cycle-guidance`, `friend-recommendations`). This fixes the avatar feature and the AI guidance/recommendations. _(Done 2026-07-24: secret set + all three functions deployed ACTIVE via the Supabase CLI. Key kept out of the repo — **rotate it**, it was shared in a chat transcript.)_
- [ ] Deploy `notifications-handler` (needs an Expo push access token); assess the remaining friend-recommendations schedule separately. **2026-11-03 correction:** do not blindly run all three `schedule-*` migrations: daily phase reminders and nightly legacy cycle guidance already have active jobs. The new Phase Guide needs no cron, and the legacy batch endpoint needs a scheduler-only authorization audit before further use (BUGS).
- [~] **Activate server-side phase-change reminders (built 2026-08-02).** Progress: ✅ migration `20260802120000_phase-change-reminders.sql` **applied** (owner, 2026-08-02); ✅ `phase-change-reminder` function **deployed** (2026-08-02). **Remaining blockers:** **(1) ✅ Vault secrets present (confirmed 2026-09-07).** `project_url` + `publishable_key` exist in Vault with correct values — the earlier "they don't exist / `null value in column url`" blocker is **resolved** (an even earlier note claimed they were missing; they aren't). **Confirmed 2026-09-07 via `cron.job` + `cron.job_run_details`:** the `daily-phase-change-reminder` cron exists and **succeeds daily** (since 2026-08-19). **2026-11-03 live correction:** `cron.job` now contains active `daily-phase-change-reminder` **and** `nightly-cycle-guidance`; the friend-recommendations job is absent. The new on-demand Phase Guide is deployed/live-tested and does not need either AI cron. Do not reapply guidance scheduling or rely on the old batch without its authorization audit. Friend-recommendations scheduling remains separate, uncompleted work. _(Caveat: cron `status=succeeded`/`"1 row"` only means the async `net.http_post` was **dispatched**, not that the function returned 200. Check actual response status separately. Do not disable gateway verification on the old all-users batch until scheduler-only authorization exists. The new endpoint deliberately verifies user JWTs inside its handler.)_ **(2) Verify push tokens register** on a real device on build ≥1.0.8 (`device_tokens` table has rows; `usePushNotifications` runs with notifications allowed). Also only reaches users whose uploaded snapshot has `nextPhaseStart` (build ≥1.0.8).
- [~] **Background posting of cycle updates (requested 2026-07-30 — IMPLEMENTED 2026-07-31, pending on-device verification).** Went with **HealthKit background delivery** (Apple's native "wake on health-data change") rather than leaning on the throttled `expo-background-fetch` task: `backgroundDelivery.ts` observes menstrual flow (`subscribeToChanges` + `enableBackgroundDelivery`) and, when iOS relaunches the app on a change, runs a background sync that posts the phase transition **and fires a local notification** (`localCycleNotifications.ts` — no Expo push token needed for the user's own device). Native entitlement already present (`background: true` on the HealthKit plugin). See [BUGS.md](BUGS.md) "(b) background delivery" for the full note. **Remaining: on-device verification** once a build is available (rides in 1.0.8) — confirm the entitlement is in the binary, that iOS actually wakes + posts, and that the local notification shows. Rare `[~]` here (WIP → verify) since the code is in but unverified.
- [x] **Apply migration `20260730120000_notifications-read-at.sql` to Supabase** (SQL editor) — adds `notifications.read_at` + a `notifications_update_own` UPDATE policy, powering the dedicated notifications page's new/read state. _(Done 2026-07-30 by owner via SQL editor.)_
- [x] **Apply migration `20260730130000_notification-triggers-engagement.sql` to Supabase** (SQL editor) — adds AFTER INSERT triggers on `post_reactions` / `event_reactions` / `boops` that create a `notifications` row for the content owner (in-app reaction/boop notifications). _(Done 2026-07-31 by owner.)_
- [x] **Apply migration `20260730140000_friend-requests-realtime.sql` to Supabase** (SQL editor) — adds `friend_requests` to the `supabase_realtime` publication so friend-request changes push sub-second to the app. _(Done 2026-07-31 by owner.)_

## Deploy / data follow-ups (2026-07-24)
- [x] **Redeploy the `delete-account` edge function** — now also hard-deletes the auth user and clears `posts` / `post_reactions` / `event_reactions` / `boops`. _(Done — deployed v4, 2026-07-26.)_
- [x] **Applied the friends-only feed RLS** (`posts_select_own_or_friends`, friendship-based) to Supabase. _(Done, 2026-07-26.)_
- [x] **One-time cleanup of orphaned + backdated rows** via [`supabase/cleanup/2026-07-24-orphaned-and-backdated-cleanup.sql`](../supabase/cleanup/2026-07-24-orphaned-and-backdated-cleanup.sql) (orphaned rows, demo seed rows, backdated flood). _(Done, 2026-07-26.)_
- [ ] **Purge pre-fix soft-deleted accounts** (STEP 4 of the cleanup script) — accounts deleted before the hard-delete fix are only soft-deleted and still linger in friend lists. _(In progress 2026-07-26.)_

## New features (early tester feedback — 2026-07-24)
Larger asks that need their own design + PRs (not part of the composer/reaction bugfix PR):
- [ ] **Sign in without Apple.** Add an alternative auth path so people can use the app without an Apple ID (e.g. email/OTP via Supabase Auth). Touches `AuthScreen`, `appleAuth`/auth services, Supabase Auth config, and onboarding. See FEATURES.md → "other auth methods" (Level 2).
- [ ] **Manual cycle entry (no Apple Health).** Let users enter/log cycle data by hand instead of requiring HealthKit — needed for non-iOS-Health users and Android later. Requires new logging UI + data model. See FEATURES.md → "In-app logging" / Level 2 "in-app tracking (vs. read-only)".
- [ ] **Add Apple Health WRITE access (period tracking → write back to Apple Health) (requested 2026-07-31, owner).** Build in-app period logging where users record their period/symptoms and the app **writes it back to Apple Health** (currently strictly read-only). When we do this we must **re-enable `NSHealthUpdateUsageDescription`** — pass a real string description via the `@kingstinct/react-native-healthkit` plugin props in `app.config.ts` (the patch only *deletes* the key when no string is given, so providing one restores it) — request write authorization (`requestAuthorization([...writeTypes], cycleReadTypes)`), and update the onboarding/permission-priming copy to say we write data. Pairs with "Manual cycle entry" above. Ties to the read-only "update"-wording fix just shipped (BUGS.md).

## Stability & test guardrails (see INSTRUCTIONS §12)
- [ ] **Build a fast smoke test — the one real gap in the safety net.** The full suite (`jest-expo`) is too slow to run every change (it times out), so in practice nobody runs it — meaning a regression that "guts" the app can slip through. Add a **tiny, fast** test set that boots the pure-logic core with **no `jest-expo` / RN transform**: the cycle model (`packages/domain/cycles/models.ts` — phase resolution, `nextPhaseStart`, DST math), `syncScore`, and reaction/double-tap logic. Wire it to `npm run test:smoke` (target < ~10s). Approach: a lightweight jsdom + `babel-preset-expo` (or ts-jest) config scoped to the RN-free suites — see the related "test suite is slow" item in [BUGS.md](BUGS.md), which has the analysis. Then it can gate every commit/build cheaply. _(Note: couldn't be built/verified in the constrained CLI env where even one file times out — do it on a machine where jest finishes.)_
- [x] **Additive-only migrations + keep `tsc` green** — codified as hard rules in [INSTRUCTIONS.md](INSTRUCTIONS.md) §12 (2026-08-02). Not a task, an ongoing convention.

## Dev workflow (post-beta, optional)
- [x] Verified the friend-rule migration on staging and production. The [deployment run](https://github.com/kratijain2631/period-app/actions/runs/43074359211) passed all 75 staging access checks, including rejection of a non-friend's cycle-event reaction, before pushing to production.
- [x] Redeploy `cycle-guidance` to staging, verify accepted-friend lookup, then production — **SUPERSEDED 2026-11-12 by retirement of its only scheduled caller (PR #83).** No redeployment was performed or is needed for the current Phase Guide. The active `request-cycle-guidance` handler is already deployed and reads accepted friends through sanitized RPCs. Reassess and deploy the current batch source before ever re-enabling the old job. It had already been redeployed on 2026-11-11 (staging version 4, production version 5, both rejecting calls without the cron secret).
- [ ] Engineering: on the staging simulator, verify that Circle still displays an accepted friend with missing `friend_sharing` rows. The automated suite exercised disabled sharing flags; do not treat that as a completed missing-row UI test. No simulator runtime is installed on this Mac.
- [x] **Adopt `supabase db push` instead of hand-pasting SQL (Option B) — DONE 2026-11-11.** Owner asked on 2026-11-06, and on 2026-11-08 asked for no manual steps at all. Staging has migration history since 2026-11-08 and production since 2026-11-11. The six secrets are set, the one-time production setup ran, and the first automatic run applied `20261108180000` to production. Details in [DB_PUSH.md](DB_PUSH.md).
- [~] **Make the Database deploy, test and Docs checks required on `main`.** Needs a repo admin (Krati) under Settings → Rules. _(2026-11-12: Krati created the active ruleset `main-protection` on the default branch. It requires the `rls` check (Security checks), blocks deletion and force pushes, and has no bypass list. Still optional: also require `release-notes`, `test` and CircleCI; tie `rls` to the GitHub Actions source; add required reviewers to the `production` environment.)_
- [ ] **Deploy edge functions from CI too.** The Database deploy workflow applies migrations only; functions are still deployed by hand, staging first.
- [ ] **Build the security test suite (phases 1–3).** Rules lint, attack tests, coverage guard and a manual drift check, as designed in [design/security-test-suite.md](design/security-test-suite.md). `npm run test-accounts:rls` is the start of it. CI is in place (2026-11-12): the **Security checks** workflow runs those checks on a throwaway database for every database PR. The `rls` check is required on `main` (ruleset `main-protection`, 2026-11-12). Left: phases 1 and 2.
- [x] **Capture the `request-cycle-guidance` edge function in the repo — DONE 2026-11-12.** Krati's guidance release added its source under `supabase/functions/request-cycle-guidance/`, and it's deployed to staging (verify_jwt off; the function checks the login itself).
- [x] **Decide whether the `nightly-friend-recommendations` cron job should run — DECIDED 2026-11-07: leave it off.** Neither project runs it, and `20261107014000_unschedule-friend-recommendations.sql` makes a database built from the repo match.

## Product research (2026-07-30)
- [ ] **Study Flighty, Beli, and Strava and copy what works.** Go through each app's feature set and mechanics and pull the ones that map onto this app's social-cycle loop, then feed them into [FEATURES.md](FEATURES.md). Starting threads (already noted in FEATURES → "The retention loop"): Strava/Flighty's *"it logs itself"* auto-content (lean on Apple Health auto-ingest so the feed is never empty); Beli's *relative* ranking/leaderboard (→ the sync-score leaderboard); Flighty's Passport / Spotify-Wrapped-style shareable recap ("Your cycle year"); Flighty live activity + Strava clubs/kudos (home-screen widget, groups, boops-as-kudos); Duolingo/Strava streaks (gentle, opt-in check-ins). Deliverable: a short comparison note + concrete features triaged into FEATURES.md "The plan."

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

## Design / branding — top "likeable" priority
- [ ] **Premium design + branding pass.** Make the app polished, premium, delightful (design system, branding, avatars, cycle-wheel hero, micro-interactions). Full vision + the AI-mockup → pixel-for-pixel replication approach lives in **[DESIGN.md](DESIGN.md)**. Highest-leverage work on "likeable" per the [FEATURES.md](FEATURES.md) teardown.

## Rollout blockers (before the friends beta / wider rollout)
- [~] **Find friends from contacts — backend verified; native rollout still open.** 🚧 (WIP — Codex, 2026-11-03). Migration `20260812090000_contact-friend-discovery.sql` confirmed live; transactional opt-in/out, owner-only RLS and anonymous-denial checks pass. Native integration shipped in 1.0.12 (33). Owner testing on 1.0.12 / iOS 26.6.2: Limited Access with two selected contacts flashes/no visible result; Full Access reaches the empty-match state. Settings-based access management, foreground refresh, stale-result protection and visible feedback implemented; TestFlight 1.0.14 (35) native build finished, automatic submission failed with required-agreement error (rechecked 2026-11-11), device retest pending. Follow [CONTACT_DISCOVERY_ROLLOUT.md](CONTACT_DISCOVERY_ROLLOUT.md) for the denied/limited/full and separate toggle matrix. Keep open until those pass. Verified phone matching remains a separate follow-up.

## Improve the app
- [ ] Improve the app — see [FEATURES.md](FEATURES.md) for the feature/design roadmap and [BUGS.md](BUGS.md) for known bugs.
- [ ] **App-level (OS/push) notifications** — already tracked: see [FEATURES.md](FEATURES.md) → "Engagement & notifications" ("User notifications") and the push-token / `notifications-handler` items above. Cross-listed here so the owner's "app level notifications" ask is unambiguously captured.

## Code health / tech debt (from the 2026-07-27 codebase review)
Structural cleanups — not user-facing, but they make everything after them cheaper and safer. Details/rationale in [BUGS.md](BUGS.md).
- [x] **Consent model — CLOSED by owner decision 2026-08-02: `friend = sharing` is intended; no enforcement work needed.** (Was: "make sharing genuinely explicit + revocable.") The owner accepts sharing auto-on with remove-friend as the mutual revoke; granular per-friend sharing is a later enhancement (FEATURES.md). No longer gates the social features. See [BUGS.md](BUGS.md).
- [x] **Reconcile duplicate migrations.** _(Done 2026-08-02: all 8 pairs were byte-identical except stray semicolons; removed the later duplicate of each (33 → 25 files), keeping the earlier original so ordering can't break. Zero schema change. See BUGS.md.)_
- [x] **Make `npm test` green by default.** _(Done: `architecture-sync.test.ts` now `it.skip`s when `OPENAI_API_KEY` is absent outside CI — build 1.0.4. Note: the "split networked Supabase tests" premise was **wrong** — those tests all `jest.mock('../client')`, so they don't hit the network; the real slowness is the `jest-expo` cold transform. The "fast" half is now the **fast smoke test** item above / BUGS.md.)_
- [ ] **Decompose the god-components.** `HomeScreen.tsx` (~2,200 lines, 20+ `useState`, feed + composer + reactions + boops + notifications + cycle card in one file), `ProfileScreen` (~1,280), `FriendSyncScreen` (~1,200), `FriendsScreen` (~1,080). Extract feed rows, the composer, and the reaction/boop optimistic-update logic (currently near-duplicated 4× for post×event / add×remove) into hooks/components. Improves testability and reduces merge pain.
- [x] **Parallelize `loadFeed`.** _(Done: build 1.0.7 — posts/events branches + their reactions/boops now run via `Promise.all`. `HomeScreen.tsx`.)_

## Before a public App Store release (not needed for beta)
- [ ] App Privacy "nutrition labels" + age rating in App Store Connect (declare health-data collection)

## Nice to have
- [ ] **Polish layouts at the largest accessibility text sizes (future; non-blocking).** Owner tested very large text on 2026-11-13 and found the appearance awkward but acceptable for now. Review wrapping, spacing, scrolling and reachable controls while keeping text scaling enabled. Deferred by owner; this does not close the broader accessibility checks.
- [ ] Set up EAS Update (`expo-updates`) for instant over-the-air JS updates during the beta (no rebuild)
- [ ] Cosmetic: clean up leftover "Cycle Companion" references in docs (`thoughts/`, `prompts/`, `implementation-docs/`, `overall/`)

## Separate track (not this repo)
- [ ] Fix the "Sync Sisters" app in Newly: run `eas init --force` inside Newly so it gets its own EAS project id (currently collides with this project's id)

See [IDENTIFIERS.md](IDENTIFIERS.md) for all names/identifiers and where to change them.

## Current owner handoff — 2026-11-12

The old “install build 36 and test Refresh tips” step is done: owner confirmed use, successful refresh, offline retention and important-user adoption. Owner has now installed **1.0.16 (37)** and reports the force-close/offline retest passes. Test Find friends from contacts with Limited Contacts access and the permission/discoverability matrix in CONTACT_DISCOVERY_ROLLOUT. Extended phone checks still open: account/phase changes, HealthKit, VoiceOver/larger text and two-device behavior.

Account Holder: current DSA declaration is resolved per owner confirmation (2026-11-12); no current declaration follow-up remains. Reassess before a future EU App Store launch. Successful uploads establish no agreement blocker for builds 36/37; they do not establish the DSA UI state.

Engineering’s missing-sharing-row Circle UI check stays open. The old batch redeploy is superseded by verified nightly retirement; no owner action is required for either engineering item. Nightly retirement is done on both projects and daily reminders remain active.


- [ ] Verify staging SMS delivery and complete the phone/email matrix in [TESTING.md](TESTING.md) before distributing the new onboarding flow.

**Contacts follow-up (2026-11-12):** Shaan still does not match on 1.0.16 after adding an email and relaunching with Full Contacts access. Ask him to confirm his exact account email and enabled discoverability. Do not mark the positive-match check complete. Legacy email matching after removing a friend passes with two isolated staging accounts; both accounts/data were deleted. Phone matching is documented for the unreleased 1.0.17 candidate, not build 37.

## Requested contact-discovery QA - 2026-11-12

- [x] Inspect hosted phone settings read-only: phone auth disabled on staging and production. Normal staging phone change fails HTTP 500; SMS is not signed off.
- [x] Test v2 matching with two isolated staging JWT accounts: default-off, target opt-in, phone-only, email-only, both yielding one row, caller undiscoverable, opt-out/persisted readback and changed confirmed identifiers invalidating old matches. Confirmations/changes were simulated with the staging Admin API; normal user endpoint readback passed. Both accounts/data removed; shared personas and QA pair untouched.
- [x] Run contact service/controller regression suites: 30 tests pass with mocked denied/limited/full access, Settings/foreground invalidation, late results and preference independence.
- [ ] Configure/enable SMS verification on staging, validate with an authorized number, then validate production setup through the release process before shipping required-phone onboarding. Real delivery, wrong code, resend, valid code and persistence remain open. Email-change delivery/confirmation needs a controlled inbox and remains untested.
- [ ] Physical staging-client permission checks: denied, Limited Access, select/deselect cards in Settings, Full Access, stale-result clearing and target opt-in/out independent of caller permission. No simulator runtime is installed here. Mocked tests do not close native checks.
