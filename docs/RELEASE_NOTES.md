# Release notes

Changelog for this app's builds. Newest first. See [INSTRUCTIONS.md](INSTRUCTIONS.md) for how this file is maintained.

**`· public`** on a header means the build was **submitted for Beta App Review / available to external (public) TestFlight testers**. Builds without it were uploaded to TestFlight but kept **internal** (not submitted for external review).

## Unreleased

- Paused new TestFlight builds at the owner’s request to reserve the two remaining builds. Build 1.0.24 (46) is available for internal testing.
- Searching for a friend by email or phone is easier to notice. After a full address or number, a caption says to tap Find, the button is filled and names what it will look up, and the keyboard's Search key runs it too. Lookups still run only when you ask, so only the exact address you typed is checked.
- Removed the old Circle screen (`FriendsScreen.tsx`), which the app no longer showed, along with three helpers only it used. No change to what you see.

## 2026-11-13 — TestFlight build 1.0.24 (build 46)

Apple processed build 46 and confirmed internal beta testing for **Dev Team** and **Team (Expo)**. [Signed iOS build](https://expo.dev/accounts/kratijain26/projects/period-app/builds/6443e4ea-d226-45e9-ad2b-f0a321d0090b) · [Apple upload](https://expo.dev/accounts/kratijain26/projects/period-app/submissions/7e652223-6d31-405a-abf1-f94867025226).

The features passed [staging tests with disposable accounts](TESTING.md#explicit-erasure-and-engagement), phone-width gesture checks and 208 app tests. [Database deployment](https://github.com/kratijain2631/period-app/actions/runs/43480982106).

**Cycle privacy**

- You → Settings → Privacy and permissions → Erase synced cycle data clears the saved cycle summary, automatic updates, their interactions and notifications, guidance and paired recommendations. Confirmation turns off cycle sync for the account across devices. Friends, written posts and the original Apple Health records are kept. Reconnect and share explicitly enables importing again.
- A temporary empty Health read still preserves the last shared summary. Delete account removes it with the account. A deleted cycle event now removes linked inbox notices and boops.

**Feed interactions**

- Hold an emoji count to see its members, hold React for the combined list, or hold Boop to see who sent one. You can inspect your own updates and open a member’s profile. The same controls apply to written and automatic updates across the app.

**Accessibility**

- Recorded owner feedback on very large accessibility text; layout polish is a future, non-blocking todo. No UI behavior changed.

**Cycle accuracy**

- A late period no longer starts a new estimated cycle. Before, a few days past your usual length showed "period, day 3" and could post "Entered menstruation" to friends with no period logged. Now the day keeps counting, the phase stays PMS with "Period expected N days ago", no phase reminder is scheduled while overdue, and after 60 days with no period the phase becomes unknown without posting.
- A sync that reads no Apple Health data (a new phone, Health access turned off) no longer replaces the cycle your friends see with "Unknown". A first snapshot is still shared for new accounts.
- A friend with no cycle data no longer gets a made-up sync score (about 48%). They're left out of Most in sync, and their profile says the score will appear once you both have cycle data.
- The You recap shows "—" for cycle length until two periods are logged, instead of a default 28 days.
- Added [LAUNCH_AUDIT.md](LAUNCH_AUDIT.md), the tracker for what remains before a public App Store release.

## 2026-11-13 — TestFlight build 1.0.23 (build 45)

Apple processed the [signed iOS build](https://expo.dev/accounts/kratijain26/projects/period-app/builds/20a87dc4-bda4-4e2a-95c9-0eb48f716143) and [upload](https://expo.dev/accounts/kratijain26/projects/period-app/submissions/0ca1b910-467b-4dac-b938-06c1e6242f04). Build 45 is in internal beta testing and assigned to **Dev Team** and **Team (Expo)**.

The [database deployment](https://github.com/kratijain2631/period-app/actions/runs/43467339668) applied the author lookup to staging, passed 76 staging access checks and applied it to production. All 186 app tests, native and preview type checks and the iOS bundle export passed. [Staging and remaining iPhone checks](TESTING.md#staging-qa-2026-11-13).

**Design and member identity**

- Feed, Home and member updates resolve each author by the member ID that opens their profile. Written and automatic updates show the friend’s current name, alias fallback and visible avatar. Your posts retain “You” and use your name’s initial when there is no photo. The comparison ring uses the same signed-in identity. Two staging accounts verified the feed initials, profile destinations and revocation after removing a friend.

**Email, phone and verification**

- Settings and initial email verification have a labeled, outlined address field, a Send confirmation email action and a compact Cancel action for unsubmitted edits. A pending address is kept separate from the verified address. The app rechecks confirmation when you return and while Settings is open. A pending change identifies both inboxes and lets you correct the replacement address. [Updated Settings design](../design/2026-11-13/contact-settings/change-email.png).
- Staging and production have secure two-address confirmation enabled, the default restricted email sender, a local confirmation redirect and phone authentication disabled. General email delivery needs a configured sender and a reachable confirmation destination. Sign in with Apple is enabled in production. [Setup and blockers](TROUBLESHOOTING.md#contact-verification-delivery-and-guidance-on-staging-2026-11-13).

**Phase guidance**

- Staging served cached tips and enforced refresh cooldown and account access. A fresh generation attempt returned HTTP 503. Staging lacks the generation service key. This check used synthetic cycle data.

**Friend discovery and requests**

- **Find from contacts** goes back to its normal label when matches are cleared, for example after returning from Settings. One tap now searches again; before, the first tap only hid an empty panel. The filter, selection count and Send button appear only when there are matches, so denied access shows just the notice. "Contacts access updated" appears only after returning from Settings or the permission sheet, not on every return to the app, and now also after the two-step iOS contacts sheet.
- Real staging sessions matched an opted-in test account by confirmed email, by a preverified fictional phone number and by both together with one result. Opting out hid the match. After both email confirmations, the new address replaced the old one in discovery. Six eligible test contacts produced five requests and five recipient inbox entries. Duplicate requests were prevented. Cancel, decline, resend and accept updated both accounts.

**Posting, comments and rankings**

- Staging checks covered written posts, automatic period and phase updates, comment ownership, Boops, friendship changes, and their effects on Most supportive, Largest Circle and Loudest Voices. Most in sync scores agreed with the friend profile and removing the top friend promoted the next eligible friend. [QA record](TESTING.md#staging-qa-2026-11-13).

## 2026-11-12 — TestFlight build 1.0.22 (build 44)

Apple confirmed internal testing for **Dev Team** and **Team (Expo)**. The [signed iOS build](https://expo.dev/accounts/kratijain26/projects/period-app/builds/8e71b4af-a9af-4ad9-8998-0569763de558) and [Apple upload](https://expo.dev/accounts/kratijain26/projects/period-app/submissions/69f6c154-a17d-4471-888d-f9120646d824) finished. [iPhone checks](TESTING.md#friend-profile-and-automatic-comment-checks-2026-11-12).

**Design and friend profiles**

- **One tap opens the full friend profile.** Circle rankings, the friend directory, posts and other member links use the same profile. Under identity and bio, accepted friends see the sync rings, score and confidence, both phases, latest flow gap, 28-day overlap, comparison timelines and suggestions. Boop, confirmed removal and shared updates are on the same page. Removed the “View cycle comparison” button and its separate destination.
- Friends without paired snapshots still have a profile, friend actions and an empty history state. Pending requests, other members and your own outward profile keep their relationship-appropriate views. [Profile and history screenshots](../design/2026-11-12/friend-profile/README.md).

## 2026-11-12 — TestFlight build 1.0.21 (build 43)

[Build](https://expo.dev/accounts/kratijain26/projects/period-app/builds/b02c7903-30b0-4df4-9024-d1690f902493) and [upload](https://expo.dev/accounts/kratijain26/projects/period-app/submissions/e1261422-76b6-4df3-9eb2-b2c0ed33b731) finished. Apple confirmed internal testing in Team (Expo) and Dev Team. [Database deployment](https://github.com/kratijain2631/period-app/actions/runs/43359047626) succeeded on staging and production.

[Received requests](../design/2026-11-12/requests-and-comments/received.png) · [Sent requests](../design/2026-11-12/requests-and-comments/sent.png) · [Automatic update with comments](../design/2026-11-12/requests-and-comments/automatic-comments.png).

**Posting and comments**

- **Comments on every feed update.** Written posts, automatic period updates and phase transitions have the same Comments action in Feed and on member profiles. Anyone who can see the parent update can read and reply. Authors can delete their own comments. Each update keeps its own conversation and opening another collapses the previous thread. Comments on an automatic update count toward its author’s Most supportive ranking.
- Comment rows leave 18 points between the end of the text and the following divider, including multi-line replies.

**Friend discovery and requests**

- **Friend requests** has Received and Sent tabs with counts and scrollable lists. Rows show member identity beside Accept and Decline or a clock, Pending status and Cancel request. Actions move below the identity on narrow screens or with larger text. Opening a name still leads to its profile.

## 2026-11-12 — TestFlight build 1.0.20 (build 42)

Apple processed 1.0.20 (42) and enabled it for **Dev Team** and **Team (Expo)** internal testers. The [signed iOS build](https://expo.dev/accounts/kratijain26/projects/period-app/builds/683c5961-86d2-4f1b-950b-c54d076b1ff3) and [Apple upload](https://expo.dev/accounts/kratijain26/projects/period-app/submissions/ed9624dd-1f7d-4316-ab53-fdf028975bc2) both finished. This build carries forward the approved mascot icon, opening font and standalone Settings from 1.0.19 (41). [iPhone walkthrough](TESTING.md#feed-setup-and-sent-requests) · [Updated screenshots](../design/2026-11-12/v1.0/README.md#later-testflight-revisions).

**Posting and comments**

- **Feed → Share an update** opens **Write a post** as a separate iPhone page. Back keeps the text and mood in the current session. **Continue your draft** reopens them. A successful share returns to Feed with the new post visible. A failed share keeps the editor open. The iPhone app and preview use the same launcher and composer.

**Email, phone and verification**

- **First-time setup** collects verified email and phone with the alias, then asks about **Show me in Community rankings**, period updates, first day only and phase transitions. The member saves these choices before the optional Apple Health step. Rankings start off. Saved preferences appear in Settings. The preview includes a sample first-time setup from Opening.

**Design**

- **You → bio banner.** The mascot and landscape now share one drawing area. Its tip, arms and feet fit inside the illustration. The same art appears on outward profiles. [Updated 390 px screenshot](../design/2026-11-12/setup-and-requests/you-390.png).

**Friend discovery and requests**

- **Circle → Add Friends → Friend requests** shows received requests with Accept/Decline and a scrollable Sent list with **Request pending** and **Cancel request**. The recipient’s profile also supports cancellation. Canceling only deletes the sender’s still-pending row. Refresh removes it from the recipient’s inbox and makes the contact selectable again. A simultaneous acceptance keeps the friendship.

## 2026-11-12 — TestFlight build 1.0.19 (build 41)

Expo finished the [signed build](https://expo.dev/accounts/kratijain26/projects/period-app/builds/bcd2ba31-c1d9-4719-ba5b-36f1aa63779e) and [Apple upload](https://expo.dev/accounts/kratijain26/projects/period-app/submissions/ae6609a9-6c9d-43cb-88ed-dd1498edbf9d) from `v1.0.19-build41`. Apple processed build 41 and made it available to both internal groups, Team (Expo) and Dev Team.

**Design and Settings**

- This release adds the approved thumbnail, standalone Settings page, shared Home/opening wordmark, and the bio banner fix to the redesign in builds 39 and 40. [iPhone test steps](TESTING.md#1019-settings-and-mascot).

- The opening page and Home use the same lowercase Nunito ExtraBold wordmark, including its size, spacing and terracotta color. The approved app thumbnail now uses Home’s actual waving mascot inside the five-color ring. [Opening preview](../design/2026-11-12/mascot-thumbnail/opening.png) and [1024 px thumbnail](../app/components/brand/assets/app-icon.png).
- Settings now opens as a full page from You. **Personal info** displays each email and phone number once, with individual change actions. A replacement email uses confirmation links and a replacement phone uses an SMS code. The owner is setting up hosted SMS separately. **Privacy and permissions** contains Post settings and Community rankings visibility. Sign out and Delete account are at the bottom. [Settings screenshot](../design/2026-11-12/settings/settings.png).
- The You bio banner gives the drop more headroom and anchors its landscape within the cover. The shared profile banner keeps the full mascot visible at 320, 390 and 480 px.


## 2026-11-12 — TestFlight build 1.0.18 (build 40)

Apple processed and enabled build 40 for the existing **Dev Team** and **Team (Expo)** internal testing groups. The [signed build](https://expo.dev/accounts/kratijain26/projects/period-app/builds/61ece33d-37d1-40af-9282-5eab64127444) and [Apple upload](https://expo.dev/accounts/kratijain26/projects/period-app/submissions/b222dec8-171a-4d65-a450-b4dc3a44b9b7) both finished. Build 39 also passed Apple processing and is available to the same groups.

- **1.0.18 (40) and 1.0.17 (39) contain the same screens, features and fixes.** It gives the redesign its own TestFlight version. The numbered feature list and [design v1.0 gallery](../design/2026-11-12/v1.0/README.md) apply to both builds.
- Use an existing account for the [iPhone walkthrough](TESTING.md#design-v10-testflight-walkthrough). The production database already contains the comments and rankings migration. SMS setup, real-device checks, unchanged-contact re-verification and Instagram Stories retain the status recorded below.

## 2026-11-12 — TestFlight build 1.0.17 (build 39)

**1.0.17 (39) contains the same screens, features and fixes as 1.0.18 (40).** Both use the v1.0 design gallery and the same production database migration. 1.0.17 (38) is a separate candidate.

Internal design beta for testers with an existing account. [iPhone walkthrough](TESTING.md#design-v10-testflight-walkthrough). Expo registered [build 39](https://expo.dev/accounts/kratijain26/projects/period-app/builds/55777766-0fc5-4d67-9dc9-a08f3d21e7c9) from tag `v1.0.17-build39` and completed the [Apple upload](https://expo.dev/accounts/kratijain26/projects/period-app/submissions/4fcec060-2c3d-48bb-b42f-7a47a9abb5e0).

### Added

**Design and navigation**

- Design v1.0 includes a 1024 × 1024 app thumbnail and an illustrated opening identity. The smiling terracotta drop sits inside the five-color cycle ring. The app icon, animated launch, signed-out sign-in screen and browser preview use that identity. The preview opens from the welcome page or directly to a requested tab.
- The [dated gallery of 118 screenshots](../design/2026-11-12/v1.0/index.html) records the four main pages, secondary pages, every sample member profile, scroll positions, dialogs, comment interactions, contact settings, ranking tabs and sample data states. The [file index](../design/2026-11-12/v1.0/README.md) links directly to the PNGs.
- Home, Feed, Circle and You now use reusable widgets. Home previews a cycle, a phase tip, the next estimated transition, a top sync match and the latest update; each opens its full destination. Feed has its own tab for posting, reactions, boops and deleting your own posts.
- **Notifications** is one list in arrival order, oldest first. Friend requests appear between other notifications, with the sender’s profile and inline Accept/Decline; there is no separate activity link. Notifications and Add friends use the same pending list; pending requests count toward the bell until answered.
- Members have an outward profile reached from names in the feed, directory, rankings, requests and notifications with an identified sender. You can open your own by tapping your name on You. Profiles, Notifications and Add friends are secondary pages outside the bottom bar.

**Circle and community rankings**

- Circle has two personal ranking tabs: **Most in sync** and **Most supportive**. The first compares eligible friends’ shared cycles; the second counts friends’ saved reactions, comments and boops to you over the last 30 days. Numbered rows use the same format and open the member’s profile. Home’s top match opens the sync ranking.
- **Community rankings** (formerly **Cycle Community**) shows two opt-in, scrollable Top 10 lists: **Largest Circle** counts distinct accepted friends; **Loudest Voices** counts still-published manual posts in the current UTC month. Each shows aliases and counts. Cycle details and post contents stay private.

**Friend discovery and requests**

- **Add Friends** is a labeled button beside the Friends list in Circle. It opens a page with a scrollable Friend requests card, Discover friends, and Grow your circle with **Copy invite link** in a matching button directly below **Share invite link**. The directory is labeled **Friends**. More than four matching friends scroll inside the list with search above it. Friend requests have their own card with an independently scrolling list.
- Discover by name or alias, match an exact verified email or phone where the other member allows it, or select up to five contact matches with checkboxes in a scrolling list and tap **Send friend requests**. Sent requests stay gray and marked **Request pending**. Incoming matches offer **Accept** and **Decline**. Accepted friends leave contact suggestions.

### Changed

**Circle and community rankings**

- Open **You → Settings → Show me in Community rankings** to opt in or out. The preference controls both global boards. Anyone signed in can browse the boards. Each board scrolls to tenth place with four rows visible at once.

**Email, phone and verification**

- **You → Settings** includes **Manage contact details**, **Post settings**, sign-out and account deletion. The preview now includes sample email replacement and confirmation, phone change and verification code, plus all three automatic posting preferences.

**Phase guidance**

- **You → Phase Guide → Refresh tips** is visible in the preview and native app. The preview cycles through sample ideas. The app retains its phase-based refresh and cooldown. **Try something new** on Home opens the guide.

**Posting and comments**

- Members can read and write comments on posts they can see in Feed, My posts or a member profile, and delete their own comments. A deleted post also removes its comments. Comments on your posts count toward Most supportive.
- Opening comments on another post collapses the previous thread. Tapping another post body, reaction, boop or author also dismisses it. The small trash icon next to your own comment keeps a 44-point touch target. Comment drafts survive collapsing a thread while its row remains mounted.

**Design and navigation**

- You now owns the full cycle wheel, monthly recap and Phase Guide. **Try something new** opens the guide; **Coming up** on Home opens the wheel. Tap the wheel (or hover in the web preview) for phase ranges. The example shows Menstruation, days 1–5; Follicular, days 6–12; Ovulation, days 13–15; Luteal, days 16–23; and PMS, days 24–28. Real estimates use cycle history.
- You ends with **My posts** (formerly **My updates**), close beneath the guide. It shows the signed-in member’s posts, newest first. Removed **Your circle**, the duplicate upcoming-phase widget, **View my outward profile**, **See what this means**, and the check-in subtext. Existing profile, Health sync, guidance refresh, contact and account settings remain available.
- Home’s tagline uses two lines, with “your cycle” and “your circle” in a light serif italic.
- The widget architecture separates data and behavior, widget contracts, screen composition and presentation. Home uses compact previews of widgets owned by Feed, Circle or You. Detailed presenters share actions and data with the compact versions. The illustrated theme uses shared tokens. The [widget inventory and page directory](UI_ARCHITECTURE.md#page-directory) cover live and proposed widgets. Both the original HTML concept and the interactive four-screen preview are included; the latter supports a neutral theme, 320/390/480 px widths and simulated data states.

### Verification and known blockers

**Friend discovery and contact verification**

- **Requested phone/email QA (2026-11-12).** Two disposable staging JWT accounts passed phone/email/combined matching, deduplication, opt-in/out, caller independence and changed confirmed identifier/readback checks. Verification was Admin-simulated; accounts/data removed, shared accounts untouched. Thirty contact service/controller tests pass with mocked permissions. Real SMS/email confirmation, native contact-detail screens and iOS permission/selection flows remain unverified.
- **Required-phone onboarding blocked by hosted SMS setup.** Read-only settings show phone auth disabled on staging and production; normal staging phone change failed HTTP 500, exact cause unconfirmed. Enable and validate SMS before inviting testers who need new account setup. No production tests/configuration writes. TESTING now has short VoiceOver, larger-text and real Health-sync instructions.

### Fixed

- Accepting or removing a friend refreshes the directory, personal rankings and community boards on the same account; changes on another device are picked up on friendship updates, refresh or foreground. Friendship changes affect Largest Circle and eligible personal rankings; they do not change post totals.
- The Home cycle widget uses the small phase-strip design previously explored on You. Home’s upcoming-phase card opens the full wheel on You. The compact-width cycle wheel keeps its phase and day visible at 320 px. Empty or unknown history is labeled rather than filled with invented values.
- Deleting a post updates the shared feeds, Loudest Voices and the related support score. Failed deletion leaves the post and counts intact. Post deletion does not affect friendships or cycle sync.

- **Offline empty feed has an offline state.** When disconnected and there are no visible updates, Home shows “You’re offline” and reconnect guidance instead of “No updates yet” or an indefinite loading message. Existing feed items remain visible. Uses the current connection store; no backend or queue behavior changes. 155 Jest tests, TypeScript and the iOS JavaScript export pass. Requires the next native build; not in installed 1.0.16.

### Known / not yet done

- Instagram Stories export for an author’s own posts is recorded in [Features](FEATURES.md#sharing-and-community-recognition) and [Todo](TODO.md#widget-rollout-and-follow-ups). Quests, XP and streaks in the illustration are design concepts.
- Settings verifies a replacement email by confirmation link and a replacement phone number by SMS. Re-verifying an unchanged contact remains on the [roadmap](FEATURES.md#sharing-and-community-recognition).
- The signed-in [iPhone checks](TESTING.md#widget-and-circle-smoke-check) are pending. New account setup and live phone changes depend on the hosted SMS provider.

### Verification

- [App review #97](https://github.com/kratijain2631/period-app/pull/97) merged after all four checks passed. The [database deployment](https://github.com/kratijain2631/period-app/actions/runs/43349281208) applied the comment and ranking migration to staging and production.

- Design v1.0 passed all 179 app tests, type checks for the app and preview, and the iOS JavaScript export. Browser checks opened every preview page and all 17 sample profiles, scrolled the friend directory and both Top 10 boards, switched ranking visibility, refreshed guidance, and exercised comment posting, removal and automatic collapse. The [gallery file index](../design/2026-11-12/v1.0/README.md) records each captured path.

- The native widget implementation passed all 179 app tests, the database access checks, CircleCI and the release-notes check. TypeScript passed for the native app and preview, and the iOS JavaScript bundle exported locally. [Implementation and check results](https://github.com/kratijain2631/period-app/pull/97/checks).
- The [original design branch](https://github.com/kratijain2631/period-app/tree/design/widget-preview-history) preserves the interactive mock, source artwork and iteration notes. The [widget directory](UI_ARCHITECTURE.md#page-directory) describes the implemented app.

- **Owner confirms 1.0.16 installed, force-close/offline alias retest passes, and DSA is resolved (2026-11-12).** Closed those follow-ups while retaining the future EU launch reassessment and extended phone checks.
- **Contact mismatch narrowed, not closed.** Shaan’s card originally contained only a phone number; adding an email and relaunching with Full Access still gives no match on 1.0.16. Exact account-email equality and his discovery opt-in are unconfirmed. Two isolated staging accounts verified the legacy email lookup before friendship, while accepted and after removal, plus wrong-email/opt-out exclusion; accounts/data removed. Phone/email support is already documented under the separate 1.0.17 candidate, whose build/SMS gates remain open.

### Verification and work in progress

- **Owner feedback (2026-11-12, 1.0.16 installed):** force-close/offline alias retest passes and DSA declaration is reported resolved. Offline empty-feed copy is being corrected; missing contact match for Shaan remains under investigation. Phone/email support is documented in the separate 1.0.17 candidate, not in installed 1.0.16.


### Earlier 1.0.17 candidate verification

2026-11-12 — [1.0.17 release run](https://github.com/kratijain2631/period-app/actions/runs/43318041600) passed TypeScript and all 155 Jest tests. The two dedicated staging accounts signed in and passed phone-only, email-only, combined/deduplicated, caller independence and opt-out lookups. The release job stopped before starting EAS because the GitHub Actions repository secret `EXPO_TOKEN` was missing. After configuring the secret, re-run failed jobs on that run. SMS delivery and physical-device checks remain pending.

Earlier candidate preparation is included in this build. [Contact checks](TESTING.md#1017-iphone-checklist).
- Added a startup check of recent GitHub work and an offer to review colleagues’ changes since the previous session.

- 2026-11-12 — Phone/email discovery migration applied to staging and production in [Database deploy](https://github.com/kratijain2631/period-app/actions/runs/43298960603). The 76 staging access checks, 155 Jest tests, TypeScript and local SQL contract checks passed. Hosted SMS delivery and native onboarding/contact checks remain pending. First iOS candidate with these changes: 1.0.17.
- New account setup confirms the sign-in email and verifies a phone number by SMS. Circle uses one default-off preference for matching by either verified identifier. Manage contact details is under You → Settings, where users can update their account email and verified phone number. Requires the new database RPC and a configured SMS provider before releasing the client.


### Infrastructure & release setup

- **Offline alias fix uploaded; owner checklist reconciled (2026-11-12).** Build 1.0.16 (37) and Apple submission `35b18e69-b469-498b-bf5a-f8a0797d2f7a` both report `FINISHED`, with no upload error. BUGS/TODO and relevant runbooks now distinguish delivered fix from pending phone retest. The older build-36 refresh step and nightly retirement are done; contacts/extended phone checks and DSA UI confirmation remain. Legacy `cycle-guidance` redeploy is superseded by retirement, not falsely marked deployed; the missing-sharing-row Circle UI check remains engineering work.

### Added

- **Security attack matrix (`supabase/security/engine.ts`, `supabase/security/matrix/`).** Declarative rows saying who acts (owner, friend, stranger, pending sender or recipient, no login), what they try and what must happen. Each row runs as a Jest test through the real API as that persona; outcomes are read back with the service key and every change is undone. The first file covers the friend tables: friend requests, sharing, posts, reactions, boops, raw cycle tables, the friend functions, search and the server-only reminder functions (42 rows). `npm run test:security` runs it after the rules lint (`jest.security.config.js`), so the required Security checks do too. Testing (2026-11-12, local Docker): 42 of 42 pass; with pre-accepted requests, open posts and open event reactions planted, 4 rows fail naming each attack. Phase 2 adds `matrix/account.ts` (users, push tokens, notifications, guidance, recommendations, raw cycle writes, every remaining function) and the coverage guard (`supabase/security/coverage.test.ts`): every table operation a policy allows and every function a caller can run needs a matrix row or a reasoned entry in `supabase/security/coverage.json`. 89 rows in all; with a new table and function planted, the guard fails naming both. `matrix/storage.ts` covers the avatar bucket: anyone can read, only the owner can upload, replace or delete in their own folder; the guard covers storage policies too, and CI now starts the storage service. 100 rows in all, including Krati's new `contact_friend_matches_v2` (no login denied; nobody found unless they opted in). Testing (local Docker): 100 of 100 rows and 4 of 4 guard checks pass; with avatar delete opened to any logged-in user, or upload and replace opened, the matching rows fail.
- **Security rules lint (`scripts/security/lint.js`, `supabase/security/allowlist.json`).** `npm run test:security`, and so the required Security checks, now also check the database catalog. Every table must have RLS on, and no function can be run without a login. Functions logged-in users can run must check who is calling. SECURITY DEFINER functions must set `search_path`. Every policy must check the caller, and UPDATE policies must pin ownership and consent columns. Exceptions live in the allowlist with a reason, and entries that stop matching fail the lint. It found one real gap, fixed by `20261112190000_new-user-trigger-search-path.sql`: the sign-up trigger didn't pin its `search_path`. Testing (2026-11-12, local Docker): passes on the repo; planted holes each fail with the object named, including a recipient able to rewrite a request's sender, a table with RLS off and a no-login function. `scripts/db/start-local.sh` now retries starting Supabase once, because a GitHub runner failed with "address already in use" on the database port before any check ran.

### Infrastructure & release setup

**Phase guidance**

- **Nightly guidance retired, verified on both projects (2026-11-12).** PR #83 merged at `0765324f`. [Database deploy run 43274996960](https://github.com/kratijain2631/period-app/actions/runs/43274996960) applied `20261111211000` to staging, passed all 75 staging access checks, then applied production. Post-deploy read-only metadata confirms nightly guidance absent and `daily-phase-change-reminder` active at 15:00 UTC in both projects. Cached tips, all user tables, functions and RPCs remain. No new production test users or AI calls were made.
- **Offline alias build registered and compiled.** 1.0.16 (37), [EAS build](https://expo.dev/accounts/kratijain26/projects/period-app/builds/41c1a64e-ac8a-480f-a72a-5ff377edce5e), source/tag `781bf582` / `v1.0.16-build37`, is `FINISHED`. [Automatic Apple upload](https://expo.dev/accounts/kratijain26/projects/period-app/submissions/35b18e69-b469-498b-bf5a-f8a0797d2f7a) finished successfully (rechecked 2026-11-12); TestFlight install visibility and physical cold-start retest remain unverified.

### Changed

- **Removed `node-fetch`.** It and its types were only used by the old OpenAI architecture test. No user-visible change. The unused `FeedScreen` is kept on purpose, because a feed page may come back. Testing (2026-11-12): `npx tsc --noEmit` clean, `npm test` 154 of 154.
- **⚠️ BREAKING / not backward-compatible: retire nightly guidance generation (applied 2026-11-12).** Builds <=1.0.12 no longer receive newly precomputed advice; saved tips remain readable. Fresh guidance requires an on-demand-capable client (minimum 1.0.13/build 34; validated 1.0.15/build 36). Owner confirms all important users updated and refresh works, and accepts old-client loss of fresh advice. PR #83 removes only `nightly-cycle-guidance`; daily reminders, cached advice, tables, functions and RPCs stay. Applied through Database deploy run 43274996960; both projects’ metadata verified.
- **Initial retirement hold resolved.** Builds 34/35 failed Apple upload, so the draft initially stayed unapplied. Build 36 upload/adoption and owner refresh verification now satisfy the rollout gate; DSA status remains a separate future EU launch task.

## 2026-11-12 — TestFlight build 1.0.16 (build 37)

Offline alias recovery release prepared. 154 tests, TypeScript, iOS JS export and isolated staging account-isolation checks pass. Native compilation and Apple upload finished; physical cold-start retest remains pending; this fix is not in 1.0.15. Nightly-job retirement is a separate backend rollout in PR #83.

### Fixed

- **Offline profile failures no longer restart alias setup (included in 1.0.16 (37), uploaded; physical retest pending).** Preserve the signed-in account’s cached alias when offline; without a cache, show profile retry and retry automatically on reconnect. Wait for auth restoration, clear profile state across accounts and reject late account-mismatched lookups/alias saves. Own-alias renaming remains allowed; no database permission or identifier changes.

### Verification

- **Owner 1.0.15 results and staging tests (2026-11-12).** All important users are reported updated; Refresh tips works and in-session airplane-mode refresh retains tips. Cold-start offline revealed the alias bug above. 154 Jest tests and TypeScript pass. Two isolated staging accounts verified own rename, duplicate alias denial, cross-account profile/snapshot/advice isolation and the exact 1.0.12 guidance read; both accounts/data removed, no AI calls or shared-persona resets. No simulator runtime is installed; native retest remains pending.

### Known / not yet done

- **Offline alias regression discovered (2026-11-12).** Owner confirmed Refresh tips success and correct advice retention on airplane-mode refresh in 1.0.15 (36), but offline cold start incorrectly asks for an alias. The source fix is compiled in 1.0.16 (37); Apple upload succeeded; physical cold-start retest is pending. Owner reports all important users updated to 1.0.15; legacy-client isolation checks passed and nightly retirement subsequently completed.

### Infrastructure & release setup

- **Contacts rollout verification (2026-11-12).** All 29 contacts service/controller tests passed against code matching build 36. Physical permission and two-account toggle checks remain open. See the [device checklist](CONTACT_DISCOVERY_ROLLOUT.md).

- **Guidance status audit and phone test steps (2026-11-12).** Corrected stale build-34 submission/new-build-pending wording across TODO, FEATURES, BUGS, GUIDANCE, CYCLE_SYNC and TROUBLESHOOTING. Build 36 includes on-demand advice and Refresh tips; compilation/upload succeeded, but tester group availability/adoption and native checks remain unverified. Browser access timed out when attempting to inspect availability. Closed the stale nightly-500 checkbox using the already recorded successful 2026-11-08 run; no backend change.

- **Future EU launch gate recorded (2026-11-12).** Owner confirms TestFlight-only distribution for now. TODO requires reassessing DSA trader status, updating App Store Connect and completing applicable contact verification before any future EU App Store launch. Current declaration completion is not assumed.
- **Refresh build/upload succeeded (rechecked 2026-11-12).** Build 1.0.15 (36), `70771a46-d436-4d5a-8eb2-98bfbf5625c2`, and submission `c777ddf1-bf03-4475-ba3a-f36476c233e5` both report `FINISHED`; submission has no error. Tester availability/adoption and native checks remain unverified.

- **Refresh release registered on EAS (2026-11-11).** Version 1.0.15 (36), [EAS build](https://expo.dev/accounts/kratijain26/projects/period-app/builds/70771a46-d436-4d5a-8eb2-98bfbf5625c2), was initially `IN_QUEUE` from tagged source `b3b3b493` / `v1.0.15-build36`; automatic [submission](https://expo.dev/accounts/kratijain26/projects/period-app/submissions/c777ddf1-bf03-4475-ba3a-f36476c233e5) was scheduled after compilation. Both are now `FINISHED` (rechecked 2026-11-12); tester availability/adoption and native checks remain open.

## 2026-11-11 — TestFlight build 1.0.15 (build 36)

Refresh tips native build and Apple upload both finished (rechecked 2026-11-12), excluding the concurrent Home redesign. [EAS build](https://expo.dev/accounts/kratijain26/projects/period-app/builds/70771a46-d436-4d5a-8eb2-98bfbf5625c2); automatic [submission](https://expo.dev/accounts/kratijain26/projects/period-app/submissions/c777ddf1-bf03-4475-ba3a-f36476c233e5) finished. Tag `v1.0.15-build36`, source `b3b3b493`. Tester availability/adoption and native checks remain unverified. The current DSA declaration’s completion is not confirmed.

### Added

- **Security checks on every database pull request (`.github/workflows/security.yml`).** Pull requests that touch `supabase/`, the database scripts (`scripts/db/`), the test-account scripts or persona data, and pushes to `main`, now build a throwaway Supabase from the repo's migrations on the runner, seed the personas and run all 75 access-rule checks. It uses no secrets and never touches staging or production. Other pull requests get a quick pass, so it can be made a required check. Run it locally with `npm run test:security` (needs Docker). The test-account scripts accept `TEST_ACCOUNTS_TARGET=local`, which only allows a localhost URL. Testing (2026-11-12, local Docker, same steps as the workflow): `main` passes 75 of 75 in about 40 seconds with cached images; a planted migration reopening posts fails with 3 named checks and exit code 1. Not yet run on GitHub.
- **Guidance release migration history reconciled.** Removed the unmerged duplicate `20261103120000` migration from this branch because main already captures those live objects in `20261106190000`; the refresh RPC is the only new database change. No recorded migration or database object is removed.

- **Builds 34/35 submission status corrected (2026-11-11).** Both uploads failed with the required-Apple-agreement error; they are no longer merely queued. Resolve agreements, resubmit and verify tester adoption before merging the separate nightly-guidance retirement draft. The live job remains active.

- **Refresh migration version kept unique.** Moved the pending manual-refresh migration to `20261111210000` after main added the `20261111180000` friend-rule migration; the migration is now applied to staging and production through the Database deploy workflow.

- **Manual Phase Guide refresh (backend deployed, native rollout pending).** The You page can explicitly request new AI advice without deleting current tips. Loading/error/cooldown feedback and account/phase guards are controller-owned; a new caller-scoped refresh RPC shares generation leases and enforces a two-minute cooldown. Existing page-open caching, old RPCs and cron jobs remain compatible. 145 Jest tests, TypeScript/Deno, iOS JS export and embedded PostgreSQL checks pass. Migration and handler are deployed; native delivery and phone checks remain pending.

- **PRs must update the release notes (`.github/workflows/docs-check.yml`, `scripts/ci/check-docs.sh`).** A PR that changes anything other than docs fails the Docs check unless it adds a line to this file; the `no-release-notes` label skips it. It also warns when a migration doesn't touch `SCHEMA.md` or test tooling doesn't touch `TESTING.md`. A new PR template lists the docs to check, including changes made outside git.
- Added a shared testing guide and instructions for recording code, database, staging, and test-account changes in GitHub.
- **[TESTING.md](TESTING.md) covers every way to test.** Which backend each way of running the app uses (TestFlight and `npm run start` hit production, `npm run start:staging` hits staging), the hard rules, the checks, the personas, simulator build steps, testing database changes, and what staging can't test.
- **Merged migrations apply themselves (`.github/workflows/database.yml`).** On a merge to `main` that changes `supabase/migrations/`, GitHub Actions pushes to staging, runs `test-accounts:rls` there, then pushes to production. It refuses a database with no migration history, and stops before production if anything fails. `database-setup.yml` does production's one-time history setup, checked against staging's fingerprint. Needs six repository secrets, listed in [DB_PUSH.md](DB_PUSH.md). Live on both projects since 2026-11-11 (see Infrastructure below).
- **Staging takes database changes through `supabase db push` (2026-11-08).** Its tracking table was created and filled, and the service role grants migration was the first change pushed. [docs/DB_PUSH.md](DB_PUSH.md) has the steps, how the password is handled, the emergency rule and the one-time production switch. `scripts/db/fingerprint.sql` compares two databases. Production was switched over on 2026-11-11 (see Infrastructure below).
- **Preparation for `supabase db push`.** Adds `supabase/config.toml` and a migration capturing guidance objects that were applied by hand, and retires the `seed-posts.sql` demo data. Nothing changes on existing databases yet: the capture migration is marked as applied there, not run. Hand-applied SQL continues until the tracking table is reconciled.
- **Security test suite design.** [docs/design/security-test-suite.md](design/security-test-suite.md) sets out the planned rules lint, attack tests, coverage guard and drift check, with the decisions made.
- **Staging testing guide for agents.** `AGENTS.md` is now the single source of agent instructions for any tool or model, including how to test changes on staging with personas, with hard safety rules. `CLAUDE.md` imports it. The step-by-step procedure is in `docs/TEST_ACCOUNTS.md`.
- **Staging test accounts ("personas").** Six code-defined test users (`packages/domain/testing/personas.ts`) with deterministic, generated Apple Health cycle history, friendships, posts, reactions and boops. `npm run test-accounts:seed` creates/resets them on a **separate staging Supabase project** (refuses to touch production); `npm run test-accounts:actors` makes personas post, react, boop and send friend requests through the normal API + RLS; `npm run start:staging` runs Metro against staging. See [TEST_ACCOUNTS.md](TEST_ACCOUNTS.md). Dev tooling only; no change to TestFlight builds.
- **Dev-only fake Health source.** With `EXPO_PUBLIC_FAKE_HEALTH=true` in a `__DEV__` build, `healthkitClient` serves the signed-in persona's generated samples instead of HealthKit, so the simulator runs the real sync path with realistic data. Release builds can't enable it (tested).
- **Dev environment badge.** Dev builds show a small "STAGING · FAKE HEALTH" pill when pointed at staging or using fake Health. Hidden in release builds.

### Fixed

- **The database workflows name a malformed database secret.** A value that isn't a database address used to fail with a confusing local-socket error. The scripts now check each address's shape before connecting, and say which secret is wrong without printing it.
- **Friends' data follows one rule (`20261111180000_friend-rule.sql`).** Posts, cycle events, cycle summaries, reactions and boops followed accepted friend requests, while the friends list and names followed `friend_sharing` in both directions. Someone could therefore see your data without being in your list. Now an accepted request decides everything, including the friends list (app) and the nightly guidance job's friend lookup (`cycle-guidance`, which needs redeploying). Friends see everything, and removing a friend is the only off switch; `remove_friend` now deletes both sharing rows. Reacting to a cycle event now needs to be able to see it; before, anyone could. `friend_sharing` controls nothing any more and is kept in step only for older builds. A one-time repair fills in its missing rows and removes rows with no friendship behind them. `test-accounts:rls` has 8 new checks. Testing (2026-11-11, branch `shaan/friend-rule`): `test-accounts:rls` on a local Docker database seeded with the personas, 72 passed and 3 failed without the migration, 75 of 75 with it. Simulator on staging as `ava` (app changes only, staging database unchanged): period events and posts show friends' names, and Circle lists the four accepted friends but not `fay` (pending). Post-merge on 2026-11-11, [Database deploy](https://github.com/kratijain2631/period-app/actions/runs/43074359211) applied the migration to staging, passed all 75 staging access checks, and pushed to production. The automated checks confirmed that non-friends cannot react to cycle events and disabled sharing flags do not hide accepted friends. The missing-row simulator check and `cycle-guidance` redeployment remain open. Production read-only count before merge: 3 friendships, nothing added to or removed from any list.
- **Friends' names show on Home and the Feed.** They were looked up in `users`, which only returns your own row, so friends' period events showed "Friend xxxx…xxxx". They now come from `friend_profiles`. Ships in the next build.
- **The architecture doc check no longer calls OpenAI (`__tests__/architecture-sync.test.ts`).** It now checks both ways: every path and file `architecture.md` names exists, and every folder under `app/`, `app/features/`, `app/services/` and `supabase/functions/` is in its tree. It also checks that every listed technology is in `package.json` at the stated version. It gives the same answer every run, costs nothing and runs locally. It used to be skipped locally and fail on GitHub, where no key was passed. The doc was missing `app/components/`, `app/config/`, `app/theme/`, `app/services/contacts/` and the individual edge functions; they're now added, and `AGENTS.md` links the doc. Testing (2026-11-11): `npm test` 76 of 76. Planting a renamed folder, a renamed file, a missing path, a wrong version and an undocumented folder each made the check fail and name the problem.
- **The database workflows now work on a database with no migration history.** The history check named the history table in the same query that checked whether it existed, which Postgres rejects when it doesn't. That stopped production's one-time setup before it changed anything.
- **No database function can be called without a login (`20261108180000_no-login-function-access.sql`).** Several could be called with only the public key, and staging and production disagreed on which. Logged-in users keep access to everything the app uses, server-only functions stay server-only, and new functions no longer default to no-login access. `npm run test-accounts:rls` checks it. Not breaking for any app build, because the app calls no database function before login.
- **Scheduled edge functions only run for the cron jobs (`supabase/functions/_shared/cronAuth.ts`, `20261107013000_scheduled-function-secret.sql`).** `cycle-guidance`, `friend-recommendations` and `phase-change-reminder` reject callers without a secret that lives in the vault and is sent by the cron jobs. Applied and deployed to staging and production on 2026-11-07. `notifications-handler` has the same check but isn't deployed anywhere.
- **The service role has its full access again (`20261107015000_service-role-grants.sql`).** Production's service role had lost most of its table and function access, which broke the nightly guidance job. Applied by hand to production on 2026-11-07; the 2026-11-08 03:00 UTC guidance run returned 200 again after failing with `permission denied for table cycle_snapshots`. This also widens the service role's access to `cycle_guidance_requests`.
- **The nightly friend-recommendations job stays off (`20261107014000_unschedule-friend-recommendations.sql`).** Neither project runs it, and a database built from the repo now matches.
- **Aliases are unique, and posts can't carry someone else's name (`20261106200000_unique-aliases.sql`).** Aliases are compared ignoring case and surrounding spaces, and the database sets a post's name from its author's alias. Posts also no longer fall back to showing the author's email. Applied by hand to staging and production on 2026-11-06. Existing builds show the generic save error for a taken alias; the next build shows "That alias is taken."
- **Profile emails and who can react or boop (`20261106183000_profile-email-and-social-write-rules.sql`).** The profile email always matches the login email, you can only react to posts you can see, and you can only boop friends. Applied by hand to staging and production on 2026-11-06. Not breaking for any app build. Direct API callers relying on the old behavior will now be rejected.
- **Friend search is locked down (`20261104212900_function-grants-lockdown.sql`, `20261104213000_search-users-hardening.sql`).** Search needs a login, treats `%` and `_` as plain text, needs at least 2 characters, leaves out the person searching and returns at most 20 people. The reminder functions now run only as the service role. Applied by hand to staging and production on 2026-11-04 and 2026-11-06. Not breaking for any app build. Direct API callers relying on the old behavior will now be rejected.
- **Post reactions and boops are friends-only (`20261104213100_reactions-boops-friends-only.sql`).** You see one only if you made it, received it, wrote the post, or are friends with the person who made it, so counts can differ between viewers. Applied by hand to staging and production on 2026-11-06. `npm run test-accounts:rls` now covers this and friend search.
- **Friend requests can't be forged (`supabase/migrations/20261104043000_friend-requests-lockdown.sql`).** Clients could create an already-accepted request, or as a recipient rewrite who sent one, and read another person's cycle data without their consent. Requests must now start as pending and can't be to yourself, and clients can only change `status`. Applied by hand to staging and production on 2026-11-04. Not breaking for any app build, because the app already writes only these values. Direct API callers relying on the old behavior will now be rejected. `npm run test-accounts:rls` checks it.
- **Cycle day now counts from the first day of your period.** Home, You and Circle were counting from the last day, so the day number ran several days low. Sync scores now compare period start dates too, so they may shift slightly.
- **`start:staging` now really uses staging.** Expo's dev env module let `.env` override the staging values, so the app talked to production while showing the STAGING pill. The script now writes the public staging values to a temporary, gitignored `.env.local`. Found 2026-11-04: before the fix, an empty simulator sync and two failed persona logins reached production. No persona data did, and the seed itself went to staging.

### Infrastructure & release setup

- **Manual refresh deployed (2026-11-11).** [Database deploy run 43154655774](https://github.com/kratijain2631/period-app/actions/runs/43154655774) applied `20261111210000_manual-guidance-refresh.sql` to staging, passed all 75 staging access checks, then applied it to production on 2026-11-11. The updated authenticated handler reached staging, passed isolated-account API checks (cache, refresh claim/save, duplicate suppression, cooldown and access denial), then reached production (ACTIVE version 3). Synthetic staging data was removed; no paid AI call or existing persona reset occurred. Native checks remain open.
- **Apple upload retry still blocked.** Build 35 submission `70f04e68-47e6-476c-838e-5d3e46aa6074` failed with the same required-agreement error after the owner reported accepting an agreement. Another pending item is the DSA declaration; owner assessment remains required. Nightly guidance retirement stays a draft until new-client delivery/adoption.
- **Staging Supabase project created (2026-11-03/04).** `period-app-staging` (`rntqwmptuavqnbjovnae`) on the free plan in the owner's Supabase org; a spare project in that org was paused to free the slot. Its schema was built from the repo's migrations plus a one-off catch-up script for objects production had that no migration did, and it matched production. Vault secrets set, email sign-in on, five edge functions deployed like production but without `OPENAI_API_KEY`. `notifications-handler` (not on production either) and `request-cycle-guidance` (production only) weren't deployed. Seeded with the six personas. `.env.staging` is local to the owner's Mac.
- **Production schema drift found (2026-11-04).** Production had `cycle_guidance_requests`, `cycle_guidance.phase_started_at`, `claim_cycle_guidance` and `complete_cycle_guidance` with no migration, and no friend-recommendations cron job. Captured in `20261106190000_capture-hand-applied-guidance.sql` and `20261107014000_unschedule-friend-recommendations.sql`.
- **Privacy and access fixes applied to staging and production by hand (2026-11-04 to 2026-11-08).** Before the Database deploy workflow existed, the migrations listed under Fixed went to staging first, then were pasted into production and verified on both. The dates are on each line. The scheduled edge functions were redeployed to both with the cron secret check on 2026-11-07.
- **Database deploy secrets added (2026-11-08 to 2026-11-11).** The six secrets in [DB_PUSH.md](DB_PUSH.md) are set. Production's database password was reset on 2026-11-10 and is kept in the owner's password manager. Both database secrets must be Session pooler URIs, because GitHub's runners can't reach the direct (IPv6-only) host.
- **Production switched to migration tracking (2026-11-11).** The one-time setup workflow marked 39 migrations as applied after production's fingerprint matched staging's (except function access). The first Database deploy run then applied `20261108180000_no-login-function-access.sql` to production; staging had nothing to apply and passed all 66 access checks. Three earlier setup attempts failed and changed nothing: the direct host was unreachable, the history check broke on a database without history (fixed in #77), and the staging secret was malformed (#78 now names a bad secret). From now on, merging a migration is the only way to change either database.
- **The `production` GitHub Environment** was created by the first run and has no required reviewers. Add some under Settings → Environments if production should wait for a click.
- **Edge functions still deploy by hand.** The Database deploy workflow only applies migrations.

## 2026-11-03 — TestFlight build 1.0.14 (build 35)

**Native build finished; Apple submission failed.** [EAS build](https://expo.dev/accounts/kratijain26/projects/period-app/builds/bf9a1168-1a04-430f-b342-bc6128d92fd8), [submission](https://expo.dev/accounts/kratijain26/projects/period-app/submissions/dbea0ad5-7488-4cef-a16d-cb238d5050a6). Rechecked 2026-11-11: `ERRORED` / `EAS_ASC_REQUIRED_AGREEMENTS_MISSING_OR_EXPIRED`. Account Holder must accept the required Apple agreements, then retry this completed build. This submission has not confirmed TestFlight availability.

### Fixed

- **Contacts discovery recovery and feedback.** Manage selected contacts through iOS Settings to avoid the broken native access picker; refresh permission on return, clear stale results after access/account changes, show progress immediately and put actionable empty/error messages beside Find Contacts. Late lookups cannot restore invalid results; discoverability writes verify the intended account.

### Infrastructure & release setup

- **Contacts migration confirmed live; privacy checks passed.** Verified default-off preference, exact matching RPC and grants, then tested owner-only access, opt-in/out, caller independence and self exclusion in a transaction with all synthetic data rolled back. Added reproducible SQL and permission/toggle/lifecycle regression tests; 98 Jest tests and TypeScript pass.

### Known / not yet done

- **Contacts rollout remains open.** Owner testing on 1.0.12 / iOS 26.6.2 found flashing/no result with Limited Access; Full Access reaches the empty-match state. Recovery changes still need testing on a new native build, including denied/limited/full access and two-account discoverability. See [verification matrix](CONTACT_DISCOVERY_ROLLOUT.md).

## 2026-11-03 — TestFlight build 1.0.13 (build 34)

**Native build finished; Apple submission failed.** [EAS build](https://expo.dev/accounts/kratijain26/projects/period-app/builds/b5517231-315b-48d7-adb1-9e98af8c8687), [submission](https://expo.dev/accounts/kratijain26/projects/period-app/submissions/a644dafb-6b2c-4ffc-a8b0-f8169b294049). Rechecked 2026-11-11: `ERRORED` / `EAS_ASC_REQUIRED_AGREEMENTS_MISSING_OR_EXPIRED`. Account Holder must accept the required Apple agreements, then retry this completed build. This submission has not confirmed TestFlight availability.

### Fixed

- **Phase Guide always has tips, including offline or before Health sync.** Local fallback guidance appears immediately, and cached advice from a different phase/cycle is never shown. Profile guidance refreshes only when the You page is focused and ignores late results after navigation/account changes.

### Changed

- **More useful dos and don’ts, readable at a glance.** Concrete phase-aware suggestions pair a short heading with practical detail. Full-width cards show the complete advice, wrap with larger text and replace the hidden flip interaction. AI follows the same optional, nonjudgmental content rules; NHS sources and editorial limits are documented in GUIDANCE.md.

### Infrastructure & release setup

- **On-demand guidance backend deployed (2026-11-03).** Applied the additive cache/lease migration, configured the current publishable client key and deployed `request-cycle-guidance`. PostgreSQL regression checks, Deno typecheck and live unauthenticated denial/permission checks pass; no cron or service-role key is needed for this path.
- **Live authenticated verification and status-doc audit.** An approved synthetic account verified AI generation, cache reuse, 200/202 overlapping requests and account isolation, then was removed. FEATURES/TODO/BUGS, schema, cycle-sync, design and troubleshooting now distinguish completed implementation/backend work from pending native checks. Live inventory confirms 14 public tables and two active legacy/reminder cron jobs; friend-recommendations scheduling remains absent.

### Added

- **On-demand AI guidance, cached per phase occurrence.** A new authenticated `request-cycle-guidance` function uses caller-scoped database RPCs and sanitized friend summaries; no service-role key or cron is needed. Concurrent requests share a two-minute database lease, malformed/failed AI responses are not cached, and results are discarded if the phase changes during generation. Regression coverage added for fallback selection, cache invalidation, auth/account isolation, duplicate requests and AI failures.

### Known / not yet done

- **Device verification remains required.** Backend migration/function are live, and authenticated AI generation/cache reuse passed an isolated live test. Offline/account switching, HealthKit and native accessibility still need testing on a phone. The pre-existing batch handler's missing scheduler-only authorization is logged in BUGS; its legacy cron is already active and is not used by the new client.

## 2026-08-12 — TestFlight build 1.0.12 (build 33)

Version `1.0.12` — **built + auto-submitted to TestFlight** on 2026-08-12. Adds **privacy-first contact friend discovery** (Neha, PR #65) on top of 1.0.11. **Backward-compatible / additive** — the migration only adds a column + a new RPC, so older builds are unaffected (no `⚠️ BREAKING` marker needed). _For the feature to work, apply the additive migration `20260812090000_contact-friend-discovery.sql` in the Supabase SQL editor first._

### Added

- **Privacy-first contact friend discovery in Your Circle.** People can explicitly allow full or limited iOS Contacts access, match contacts already using the app, and send requests from the results. Raw address-book emails stay on-device; only normalized SHA-256 hashes are sent for matching. A separate, default-off “Let contacts find me” control governs account discoverability. Email matching is supported now; verified phone matching remains future work. Requires additive migration `20260812090000_contact-friend-discovery.sql` and a new native build for `expo-contacts`.

### Docs / process

- **DESIGN.md — image-generation prompt for step 2 of the design pipeline.** Added a reusable master prompt (grounded in the real brand tokens: terracotta accent, phase palette, Nunito/Inter, warm neutrals, red-drop motif, "serious not girly" ethos) plus per-screen blocks (Home cycle wheel, sync leaderboard, feed, "cycle year" recap, avatars, icon/splash) to generate sample mockups for design inspiration. Also captured a **"which tool to generate with"** guide (ChatGPT GPT Image primary, Gemini for iteration, Midjourney for mood, Claude can't generate; v0/Lovable as a code-first alternative).
- **Phone-based friend discovery follow-up added to the roadmap.** Accounts will optionally support verified phone numbers, with country-aware normalization and hashed contact matching to close the Apple private-relay email gap; raw phone numbers stay private and discoverability remains separately opt-in.
- **Contact-discovery rollout instructions documented.** TROUBLESHOOTING now records the required hand-applied migration, native rebuild, iOS limited/full/denied test matrix, and the distinction between device Contacts permission and account discoverability.

## 2026-08-06 — TestFlight build 1.0.11 (build 32)

Version `1.0.11` — **built + auto-submitted to TestFlight** on 2026-08-06 (buildNumber **32**, build ID `f2165f16-9ba0-461d-ab39-025c23ccb4b2`). Carries only Neha's friend-cycle privacy-RPC work (PR #64) on top of 1.0.10. _(The earlier "build 31" placeholder was a pre-build guess; the remote auto-increment assigned 32.)_

> **⚠️ BREAKING / not backward-compatible.** Raw `cycle_snapshots`/`cycle_events` are now **owner-only** (confirmed live 2026-08-07); friends are read only via the sanitized RPCs. **What breaks:** friend-cycle sync on builds **≤1.0.10** (they read the raw tables directly → now empty). **Affected:** any tester not yet on 1.0.11. **Required minimum build: 1.0.11.** **Action:** get all testers onto 1.0.11; confirm `friend_cycle_summaries()` / `shared_cycle_events()` exist (1.0.11 has no fallback). Deliberate §12 exception, justified only because closed-beta testers update together — see [CYCLE_SYNC.md](CYCLE_SYNC.md) and the expand/contract lesson in [LEARNINGS.md](LEARNINGS.md).

### Fixed

- **Friend cycle summaries and auto-post feed rows work through privacy-safe RPCs.** Clients now read friend cycle state/events only through sanitized projection RPCs; there is no raw-table fallback because this is a dev-only release and testers can update together. The friend-detail screen loads both snapshots in one request and its copy now matches the decision that accepting a friend starts sharing. Added RPC/error regression tests and preserved the newer Circle leaderboard/navigation. Apply `20260806010000_remove-legacy-friend-cycle-read.sql` to undo the briefly applied compatibility policy and restore owner-only raw-table access.
  - **The only user-visible change** is a reworded empty state on the friend-sync screen ("Consent Needed" → "Friend Sync Unavailable / Cycle sharing starts when a friend request is accepted"); everything else is backend/RLS plumbing.
  - **Reviewed (post-merge):** the RPCs are correctly friendship-scoped (`security definer` + `revoke from public` + `grant to authenticated`; `WHERE` gates on accepted `friend_requests`), and the projection is intentionally **minimal** — it omits `periodLengthDays`/`nextPhase*` on purpose, because no friend-facing view consumes them (friend rings are the fixed-28-day `SyncRings`/`PhaseAvatar`; only your *own* ring uses `periodLengthDays`). Keeping the projection minimal is the better privacy posture, so this is by design, not a gap. See [TODO.md](TODO.md) for the one follow-up (extend the projection only *if* a real friend cycle-ring is ever added).

## 2026-08-05 — TestFlight build 1.0.10 (build 30)

Build `1.0.10` (buildNumber 30) — **built + auto-submitted to TestFlight** (build ID `23781dc7-f1ae-48df-b147-2d91aed25ef0`). A correctness fix for the **cycle "double-counting" / duplicate-phase** bug plus the docs batch below. _Shipping this build turned into a multi-hour yak-shave: `eas build` hung indefinitely at "Compressing project files" because the repo (in `~/Documents`) had an iCloud-evicted `dataless` file the archive step blocked on — see [TROUBLESHOOTING.md](TROUBLESHOOTING.md) "Build & submission gotchas". Fixed by materializing the file + `EAS_SKIP_AUTO_FINGERPRINT=1` on Node 20._

### Fixed
- **Period posts no longer mislabel the phase or duplicate it in the feed.** **Root cause was _not_ the cycle math** — `buildFlowRuns` correctly merges adjacent days (e.g. logging 7/30 right before 7/31 is one run, not two). It was two bugs in the **auto-post** path: (1) a `menstrual_flow` (period-day) post was tagged with the *current* derived phase (e.g. Follicular) instead of `'menstruation'`, so period posts read "Follicular phase" — and logging two adjacent days made it appear twice; now period-flow posts are always labeled `'menstruation'`. (2) `phase_transition` posts didn't reliably de-dupe because their `starts_at` (`currentPhaseStart`) carried the sync's time-of-day, so re-syncs of the same transition slipped past the `(user_id, starts_at, event_type)` upsert key; `currentPhaseStart` is now snapped to a stable **local day boundary**, so repeat syncs collapse to one post. Regression tests added (`models.test.ts`, `syncHealthData.test.ts`). `syncHealthData.ts`, `packages/domain/cycles/models.ts`. See [BUGS.md](BUGS.md). _(Existing duplicate rows already in `cycle_events` aren't retro-cleaned — delete the stray post, or run a one-time dedupe if needed.)_

### Docs / process
- **Codified stability guardrails (INSTRUCTIONS §12).** Overriding rule: **every change must be backward-compatible and atomic — no big-bang rehauls** (even the design rehaul lands incrementally, screen by screen). Plus: additive-only migrations (never drop/rename a column/table a shipped build reads), keep `tsc --noEmit` green as the regression gate, and a fast smoke test (TODO). Goal: updates that don't gut the app.
- **TODO close-out sweep (2026-08-02).** Marked already-done items done (parallelize `loadFeed`, reconcile duplicate migrations, `npm test` green); added an **on-device verification checklist** for the beta; and flagged the **vault-secrets gap** that silently breaks all scheduled crons.
- **Backlog triage (2026-08-03).** Logged the double-counting bug (now fixed above) and the "You" page do's/don'ts stuck on **"No guidance yet"** (the `cycle-guidance` cron never fires); promoted **contacts-based friend discovery** to a rollout blocker in TODO; cross-listed **app-level notifications**; and created **[DESIGN.md](DESIGN.md)** capturing the premium-design vision + the AI-mockup → pixel-for-pixel approach (linked from FEATURES/TODO/CLAUDE index).

## 2026-08-02 — TestFlight build 1.0.9 (build 16)

Build `1.0.9` — a social + polish batch on top of 1.0.8: the **"Most in sync" leaderboard** on your Circle (the Beli-style relative hook), a **cleaner Circle header** (removed the redundant + button), and the **"You" page settings consolidated** into one menu. Plus the docs cleanup below (CYCLE_SYNC.md, migration reconciliation, consent decision). _Built + auto-submitted to TestFlight._

### Added
- **"Most in sync" leaderboard on your Circle.** The Circle screen now shows a top-5 ranked list of the friends you're most in sync with — medal badges for the top three, each friend's phase avatar + sync %, tappable to their sync page (appears once you have 2+ scored friends). The Beli-style relative hook. (`FriendsScreen.tsx`.)

### Changed
- **Cleaner Circle header.** Removed the redundant person-plus button (it only focused the search box, which is already on the page). (`FriendsScreen.tsx`.)
- **One settings menu on the "You" page.** The settings icon (top-right) now opens a single menu — your account email, Post Settings, Sign out, Delete account — and the duplicate Account section at the bottom of the screen is gone. (`ProfileScreen.tsx`.)

### Docs / process
- **New [CYCLE_SYNC.md](CYCLE_SYNC.md)** — the full phase-derivation / sync-trigger / posting / notification / background system, as one source of truth (linked from CLAUDE.md, INSTRUCTIONS, SCHEMA).
- **"Usable vs. likeable" competitor teardown** (Flighty/Strava/Beli) + prioritized roadmap added to FEATURES.md.
- **Reconciled duplicate migrations** (33 → 25 files; removed 8 byte-identical re-creations, zero schema change).
- **Corrected the "slow tests" misdiagnosis** and documented the migration-tracking gap (DB is hand-applied; never `db push`) with a foot-gun warning + a post-beta "adopt db push" TODO.
- **Closed the consent items** per owner decision (`friend = sharing` is the intended model; remove-friend is the mutual revoke). Granular per-friend sharing is a later enhancement.

## 2026-08-02 — TestFlight build 1.0.8 (build 15)

Build `1.0.8` (buildNumber 15) — **built and uploaded to TestFlight** (auto-submit; processing on Apple's side), tagged `v1.0.8-build15`. A big notifications + cycle batch. _History: builds 12–13 failed on the EAS free-tier monthly quota (resets the 1st); build 14 compiled but was **rejected at submission** — removing `NSHealthUpdateUsageDescription` fails App Store validation (Apple requires it with the HealthKit entitlement, see BUGS/TROUBLESHOOTING). Build 15 restored the key and passed. Internal TestFlight; submit for Beta App Review to make it `· public`._ **Notifications:** the bell now opens a **dedicated page** with a real new/read distinction (no more "clears the moment you open it"); you get **in-app notifications when friends react to or boop your content**; and **friend requests arrive instantly** (realtime, not a 60s poll). **Cycle:** the ring now **reflects your real cycle length** (segments + label, not a fixed 28) and the day marker / friends' avatars sit on the phase they claim; and **phase-change posts are dated at the real transition**, not app-open time. **Feel:** **haptic taps** on boops and reactions. All client-side (added `expo-haptics`) except three additive SQL migrations. _(First build attempt on 2026-07-30 was blocked by the EAS Free-plan monthly iOS quota; rebuilt 2026-07-31.) Update this header to `· submitted for review` once App Review is requested._ **Requires three migrations applied in Supabase SQL editor: `20260730120000_notifications-read-at` (done), `20260730130000_notification-triggers-engagement`, and `20260730140000_friend-requests-realtime`.**

### Infrastructure & release setup
- **Server-side phase-change reminders (needs deploy).** New `phase-change-reminder` edge function + a daily pg_cron job (`20260802120000_phase-change-reminders.sql`) that pushes a "your phase is starting — open to share" notification to users whose predicted transition is today, so the nudge fires **even if they never open the app**. It's a notify-to-confirm nudge, not a silent post. Targets only inactive users (no sync in 2+ days) to avoid doubling the on-device reminder. Reads the predicted `nextPhaseStart`/`nextPhase` already stored in the `cycle_snapshots` jsonb; sends via Expo push (no Expo access token required). **To activate:** apply the migration, deploy the function, and confirm device push tokens register on-device (see TODO).

### Added
- **A reliable heads-up before your phase changes.** The app now predicts your next phase transition and schedules a local reminder ("Your luteal phase is starting soon — open to share with your circle") for that day. Unlike background auto-posting, a scheduled local notification fires reliably even if the app is closed — so you get a dependable nudge to open and post around the change. (`packages/domain/cycles/models.ts` predicts `nextPhaseStart`/`nextPhase`; `localCycleNotifications.ts`, `syncHealthData.ts`.)
- **Cycle phase changes can now post (and notify you) in the background.** Using HealthKit background delivery, iOS can wake the app when your cycle data changes — so a new phase transition posts to your feed and gives you a local notification even if the app is closed, instead of only appearing the next time you open it. Falls back to the existing on-open sync. _(Needs on-device verification once built — see BUGS.md; lock-screen alerts to friends about your change still need the push handler + token.)_ (`backgroundDelivery.ts`, `localCycleNotifications.ts`, `syncHealthData.ts`, `useCycleSyncLifecycle.ts`.)
- **Boops and reactions now give a little haptic tap.** A subtle medium tap when you boop someone, and a light tap when you add a reaction on the feed — small tactile feedback so the interactions feel alive. (`expo-haptics`, `HomeScreen.tsx`.)
- **Friend requests show up instantly.** A new friend request (or your request being accepted) now appears in the bell/notifications within a second via a realtime subscription, instead of waiting up to 60s for the background poll. (`useNotifications.ts`, `friendRequests.ts`; needs migration `20260730140000_friend-requests-realtime`.)
- **You now get notified when friends react to or boop your posts.** New DB triggers create an in-app notification when someone reacts to your post or cycle update, or boops you — so the notifications page shows real activity (arriving live), not just friend requests. Written so a notification failure can never block the reaction/boop itself. (Lock-screen push while the app is closed still needs the push handler + token — see BUGS/TODO.) (migration `20260730130000_notification-triggers-engagement.sql`, `NotificationsScreen.tsx` friendly text.)
- **Dedicated notifications page with a new/read distinction.** Tapping the bell now opens a full-screen Notifications page instead of a bottom sheet. It groups **Friend requests**, **New** (unread), and **Earlier** (read); unread items are accented and read items dimmed; and opening the page **no longer wipes everything** — items stay visible, and the bell badge counts only what's unread. (New `NotificationsScreen`, `useNotifications`, `notifications` service, `AppNavigator`, `HomeScreen`.) _Needs the `notifications.read_at` migration applied to Supabase and on-device verification; the DB notifications table isn't populated yet (see BUGS/TODO), so today's content is friend requests + acceptances._

### Fixed
- **Phase-change posts are dated at the real transition, not when you opened the app.** A phase-change ("you've entered ovulation") auto-post used to be stamped with the moment the app synced (i.e. when you opened it). It's now dated at the estimated day the phase actually began, so it lands correctly in the feed timeline. (Still only *fires* on app open until background posting ships — see BUGS.md.) (`packages/domain/cycles/models.ts`, `syncHealthData.ts`.)
- **The cycle ring now reflects your real cycle, not a fixed 28 days.** The colored phase segments are sized from your actual cycle length, period length, and luteal length (instead of a hardcoded 5/9/3/11 split), and the center reads "of {your} days." So a longer or shorter cycle looks right, and the day marker lands on the correct, correctly-sized phase. Falls back to the classic 28-day ring when there's no cycle data yet. (`CycleRing.tsx`, `HomeScreen.tsx`, `ProfileScreen.tsx`, `packages/domain/cycles/models.ts`.)
- **Cycle ring: the day marker now sits on the phase it says you're in.** Previously the "you are here" dot was placed by raw day-count on an idealized 28-day ring while its color came from your real phase — so on a longer cycle it could show an "ovulation" dot sitting over the (longer) luteal arc. The dot is now anchored to the segment matching your current phase, so its color and position always agree. The same fix applies to the **friend sync rings** (both avatars). (`CycleRing.tsx`.) _(Deeper redesign to make the ring's proportions reflect your real cycle length is tracked as a follow-up in BUGS.md.)_

### Docs / process
- **Logged owner backlog items (2026-07-30).** Captured four new items with diagnoses: cycle-ring "looks off" (idealized fixed 28-day segments vs real cycle length; dot color/segment mismatch) → BUGS.md; phase-change auto-post only fires on app-open and is timestamped at open-time → BUGS.md; a dedicated notifications page with a real new/read distinction → FEATURES.md; and a competitor-study task (Flighty/Beli/Strava) → TODO.md.

## 2026-07-30 — TestFlight build 1.0.7 (build 11)

Build `1.0.7` — a feed performance + polish batch plus dev-health cleanup. The Home feed now loads its posts and cycle-events concurrently (faster on real networks) and no longer flashes "No updates yet" while it's still loading; and `tsc --noEmit` is green so it can gate CI. All client-side. _Uploaded to TestFlight; submit for Beta App Review in App Store Connect to make it `· public`._

### Fixed
- **No more "No updates yet" flash while the feed is loading.** On a cold open the Home feed briefly showed the empty-state message ("No updates yet") before your posts finished loading. It now shows a small loading spinner ("Loading your circle feed…") during the initial load and only shows the empty message once loading is actually done. (`HomeScreen.tsx`.)
- **Feed loads faster.** The Home feed used to fetch everything in a long serial chain (posts, then reactions, then boops, then events, then their reactions/boops, then profiles — one after another). It now loads the posts and cycle-events sides at the same time, and fetches each side's reactions and boops in parallel, so the feed appears in roughly the time of the slowest single request instead of the sum of all of them. Behavior is unchanged. (`HomeScreen.tsx`.)

### Developer
- **`npx tsc --noEmit` is green again (0 errors).** Fixed 6 pre-existing type errors from SDK type-version drift — all runtime-neutral (added the new `NotificationBehavior` fields, fixed untyped-`navigate` casts, preserved the Apple-auth `nonce` past a lagging type, cast the persisted session subset). `tsc` can now be used as a CI/lint gate. (`usePushNotifications.ts`, `FeedScreen.tsx`, `appleAuth.ts`, `sessionStore.ts`.)
- **Corrected the "slow test suite" diagnosis (2026-07-30).** The `services/supabase/*` tests don't hit the network — they all `jest.mock('../client')`. The real cost is the `jest-expo` transform recompiling cold for every file; the only true integration test is the (already-skipped-locally) LLM eval. BUGS.md now records the corrected root cause and a verified-elsewhere plan (a lightweight `jest-expo`-free config for the RN-free suites behind `npm run test:unit`).

### Docs / process
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
