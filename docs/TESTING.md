# Testing

How to test a change in this app, from unit tests to the simulator on staging. Read it alongside [INSTRUCTIONS.md](INSTRUCTIONS.md), and update it whenever the testing workflow, staging setup or test accounts change. The hard rules for agents are in [AGENTS.md](../AGENTS.md).

## Which backend am I on?

There are two Supabase projects. Production has real TestFlight users; staging has only the test personas.

| How you run the app | Backend | Health data | Use it for |
|---|---|---|---|
| TestFlight / App Store build | Production (`mmomoyszozclfjdvjbeb`) | Real Apple Health | Real use only. Never test there. |
| `npm run start` (dev build) | Production, from `.env` | Real Apple Health | Debugging on your own phone with your own account. Not the simulator. |
| `npm run start:staging` (dev build) | Staging (`rntqwmptuavqnbjovnae`), from `.env.staging` | Fake Health for the signed-in persona | All simulator testing and anything that writes data. |

Run one Metro server at a time. `start:staging` writes a temporary `.env.local` that every Metro picks up while it exists, and it deletes the file on exit. If Metro is force-killed, delete `.env.local` by hand.

The STAGING · FAKE HEALTH pill alone doesn't prove you're on staging. A successful persona login does, because personas don't exist on production.

## Hard rules

- **Never sign in with a real account on the simulator.** The simulator has no Health data, and a sync with zero samples uploads an empty snapshot over the real one that friends see ([BUGS.md](BUGS.md)). This happened on 2026-11-03.
- **Never run test tooling against production.** The seed, actor and RLS scripts refuse the production ref.
- **Never print or commit secrets.** The service-role key and persona password live only in the gitignored `.env.staging`. Don't commit `screenshots/` or any `.env*` file.
- **Check where a dev build will connect before launching it.** The dev client reopens the last Metro server and syncs straight away.

## 1. Checks that run anywhere

| Check | Command | When |
|---|---|---|
| Unit tests | `npm test` | Every change. CI runs it on every push to `main`. |
| Types | `npx tsc --noEmit` | Every change. EAS and Metro don't type-check, so this is the only static net. |
| Access rules, local | `npm run test:security` | Before opening a PR that touches `supabase/`. Needs Docker. Builds a throwaway database from the migrations, seeds the personas and runs the same checks. The **Security checks** workflow runs this on every such PR and on pushes to `main`, with no secrets. |
| Access rules on staging | `npm run test-accounts:rls` | After any change to RLS, grants or database functions. Needs `.env.staging`. The Database deploy workflow also runs it on staging before every production push. Use the staging job log for the count and result of a specific run. |

A cloud agent without a Mac can run these but not the simulator. Say so in the report rather than claiming a staging test.

## 2. Staging and test accounts

Staging is a separate Supabase project (`period-app-staging`) built from the repo's migrations. Its schema matches production, and the Database deploy workflow applies every merged migration to it first. Full detail on the personas and scripts is in [TEST_ACCOUNTS.md](TEST_ACCOUNTS.md).

**Setup, once per machine:** copy `scripts/test-accounts/staging.env.example` to `.env.staging` and ask the owner for the values. Never fall back to production values.

**The personas** (`<name>@personas.example.com`, password `TEST_PERSONA_PASSWORD` from `.env.staging`):

| Persona | Use it to test |
|---|---|
| `ava` | The happy path: regular 28-day cycle, every screen populated, four friends, a sent request to fay |
| `bea` | Irregular cycles with ovulation tests and temperature (observed phases) |
| `cleo` | A first-ever period, day 3 (little data) |
| `dev` | No cycle data at all (empty states) |
| `eli` | Day 26 of 28 (PMS window, phase transitions, reminders) |
| `fay` | An incoming friend request and no friends yet |

**Everyday commands:**

| Task | Command |
|---|---|
| Reset every persona to its seeded state | `npm run test-accounts:seed` |
| Start Metro against staging with fake Health | `npm run start:staging` |
| List actors and scenarios | `npm run test-accounts:actors -- list` |
| Act as another persona while you watch | `npm run test-accounts:actors -- post eli "Cramps incoming"` (also `react`, `boop`, `request`, `accept`, `scenario <name>`) |
| Verify access rules | `npm run test-accounts:rls` |

Seeding resets all personas, so check nobody is mid-scenario first. The feed doesn't update live, so pull to refresh after an actor command.

## 3. The simulator

The step-by-step procedure, including preflight checks, signing in safely and reporting, is ["Testing as an AI agent" in TEST_ACCOUNTS.md](TEST_ACCOUNTS.md#testing-as-an-ai-agent). It applies to people too. In short:

1. Seed, then `npm run start:staging` (add `-- --port 8082` if 8081 is taken).
2. Launch the dev build by bundle ID: `xcrun simctl launch booted com.syncsisters.cycle`.
3. Sign out of any account, then sign in with **Email (dev)** as a persona.
4. Exercise the feature, take screenshots into `screenshots/<task>-<date>/` (gitignored), and check the Metro log.
5. Stop Metro and confirm `.env.local` is gone.

**Building the dev client for the simulator:**

- `expo run:ios` fails with "No code signing certificates". Build with `xcodebuild` and start Metro separately.
- Build with the bundle ID `com.syncsisters.cycle`. The untracked `ios/` folder can be stale and carry the old `com.cadence.cycle`, which breaks Sign in with Apple.
- Run `pod install` with `LANG=en_US.UTF-8`.
- For two accounts side by side, boot a second simulator (`xcrun simctl boot "iPhone 17"`), install the same build, and sign in as another persona.

## 4. Database changes

1. Write a migration (rules in [DB_PUSH.md](DB_PUSH.md)) and test it locally in Docker: `supabase start`, then `supabase db reset --local`.
2. If it changes access rules, add or update a check in `npm run test-accounts:rls`, and run `npm run test:security`. The PR's **Security checks** run does the same, and fails before anything reaches staging.
3. Merge the PR. The Database deploy workflow applies it to staging, runs the RLS checks there, and only then applies it to production. Watch the run in the Actions tab.
4. Edge functions aren't deployed by the workflow. Deploy a changed function to staging first, test it there, then deploy it to production.

## 5. Things staging can't test

- **Real HealthKit, background delivery, push notifications and haptics** need a real phone on a TestFlight or dev build. The on-device checklist is in [TODO.md](TODO.md).
- **Scheduled phase reminders** at 15:00 UTC run on their own schedule. Nightly guidance was retired on 2026-11-12. Changing the simulator's date is the practical way to test reminders.
- **AI text**: staging has no `OPENAI_API_KEY`, so recommendations use their free fallback text.
- **`request-cycle-guidance`** is deployed on staging and production (2026-11-11). Staging has `PROJECT_PUBLISHABLE_KEY` configured but no `OPENAI_API_KEY`; cached requests and refresh claim/save/cooldown can be verified without paid generation. Actual AI generation still needs separate verification in an appropriately configured staging environment.

## Guidance verification — 2026-11-11

PR #79 / merge `e32d9848`: Database deploy run 43154655774 passed 75 staging access checks before production. An isolated synthetic staging account (not a shared persona) verified real JWT login, cached HTTP response, refresh claim/save, duplicate suppression, HTTP refresh cooldown, wrong-account/invalid-token denial and private lease-table denial. The account and cascading records were removed in cleanup; no OpenAI request or shared persona reset occurred. Production received only the migration and handler deployment, with no synthetic test records.

Local checks: 145 Jest tests, TypeScript, Deno, iOS JS export, embedded PostgreSQL and actual-component browser feedback checks pass. Reproduce SQL coverage with `node scripts/db/test-guidance-refresh.mjs /path/to/@electric-sql/pglite/dist/index.js`. Browser fixtures do not prove native accessibility, HealthKit or real-phone lifecycle behavior; these remain open in TODO. `.env.staging` is still absent locally and no usable simulator runtime is installed.

## Recording changes and results

When a persona, fixture, or setup step changes, update the [persona runbook](TEST_ACCOUNTS.md) and any affected steps above. Add a dated entry to [RELEASE_NOTES.md](RELEASE_NOTES.md) under `Unreleased` for staging or test-account changes, including changes made in a dashboard. Record the environment, build or commit, persona aliases, checks run, observed outcome, and pending checks. Link unresolved failures in [BUGS.md](BUGS.md) and follow-up work in [TODO.md](TODO.md). Use secret names when documenting access setup.

## Offline profile and legacy-client checks — 2026-11-12

154 Jest tests and TypeScript pass after the offline alias fix. `useProfileGate.test.tsx` covers persisted-cache cold start, network failure before offline detection, missing-cache retry, confirmed missing alias, auth hydration, reconnection, account switching/late results and same-account token refresh. Alias save rejects a changed initiating account. No iPhone simulator runtimes are installed (`simctl list runtimes` empty); native UI checks are not claimed.

Two disposable synthetic staging accounts signed in with real JWTs. Own-alias rename succeeded; duplicate aliases were rejected; cross-account alias/snapshot updates affected zero rows and target values remained unchanged. The exact build-33 guidance SELECT returned its own cached advice; another account could not overwrite it. Both accounts and cascading records were deleted, shared personas were untouched, and no AI calls or production test writes occurred. Keys stayed in memory. Existing six shared personas remain available; no password reset or reseed occurred.

Owner’s 1.0.15 physical-device results: Refresh tips works, in-session airplane-mode refresh retains advice with an error, and offline cold start incorrectly entered alias setup. Retest cold start after installing the fix.

## Nightly guidance retirement gate — updated 2026-11-12

Owner confirms important users on 1.0.15, successful refresh and accepts missing/stale new advice for older clients. This supersedes the initial draft’s Apple agreement blocker. `scripts/db/test-guidance-schedule-retirement.mjs` executes the migration in embedded PostgreSQL with a stubbed pg_cron API, verifying named-job targeting, retained reminder/unrelated jobs, retained saved tips and safe reruns. Run it with a temporary PGlite module path. It does not replace the PR’s full migration/security checks or staging deployment. Completed: [Database deploy run 43274996960](https://github.com/kratijain2631/period-app/actions/runs/43274996960) applied `20261111211000` to staging, passed all 75 staging access checks, then applied production. Post-deploy read-only metadata confirms nightly guidance absent and `daily-phase-change-reminder` active at 15:00 UTC in both projects. No production job was invoked and no production test users were created.

**Release handoff (2026-11-12):** offline-profile fix source `781bf582` / `v1.0.16-build37`, build `41c1a64e-ac8a-480f-a72a-5ff377edce5e` and submission `35b18e69-b469-498b-bf5a-f8a0797d2f7a` both `FINISHED`. Owner should retest offline cold start on 1.0.16 when installable. The earlier 1.0.15 refresh and offline-retention tests are already complete; contacts, extended phone tests and the engineering missing-sharing-row Circle UI check remain open.


## Phone and email discovery

Before distributing a client with required phone setup, enable phone verification, require phone change confirmations, and configure an SMS provider in the target Supabase Auth project. Validate delivery with an authorized test number. Keep provider credentials server-side. Apple users can keep their sign-in email (including a private relay) or verify a different account email that friends know. Verify email change confirmations are enabled. Existing users can verify a number in You → Settings → Manage contact details.

On staging, use two synthetic accounts. Complete fresh alias setup with a verified email and SMS number. Try an incorrect code and retry. Open Manage contact details from You → Settings, verify the signed-in account is shown, and go back to You. In Circle, confirm Find Contacts and Let contacts find me are still available. With B opted in, test three address cards separately: B’s phone only, B’s email only, and both together (one result). Repeat with B off (zero). Verify denied, limited and full iOS access and Settings revocation. A must be able to search while undiscoverable. Record the backend, build, OS, aliases and actual results. Do not record codes or phone numbers. Hosted SMS and native UI checks are pending.

2026-11-12 — Phone/email discovery migration applied to staging and production in [Database deploy](https://github.com/kratijain2631/period-app/actions/runs/43298960603). The 76 staging access checks, 155 Jest tests, TypeScript and local SQL contract checks passed. Hosted SMS delivery and native onboarding/contact checks remain pending. No TestFlight build includes this change yet.


## 1.0.17 iPhone checklist

Use the staging development client for repeatable checks. Start it with `npm run start:staging`. Sign in with Email (dev) as circleqa-a or circleqa-b from the [persona guide](TEST_ACCOUNTS.md). These staging accounts have no production access. TestFlight uses production and Apple sign-in; use two consenting developers on physical phones for the final pass.

1. On a new account, keep the verified Apple email or confirm an alternative. Enter a phone number with country code. Try an incorrect code, then enter the delivered code and finish setup. Record actual delivery separately from the automated fixture.
2. On an existing developer account open **You → Settings → Manage contact details**, verify the displayed account, update a number and navigate back. Check the setting persists after relaunch.
3. On B, enable **Circle → Let contacts find me**. On A, leave the switch off. Save B's verified number in a dedicated contact with no email. Open Circle and check that permission is first requested after tapping Find Contacts.
4. Test denied access, then return directly from Settings with Limited Access. Select B and search (one match). Deselect B (zero matches and no stale name). Switch to Full (B returns). Repeat with B's verified email alone, then both identifiers (one row).
5. With A's Contacts permission denied, toggle A's discoverability. From B, search for A by a saved identifier after each toggle. Confirm A disappears on the next search after opt-out and stays opted out after relaunch. Send and accept a request using two eligible accounts.
6. As an upgrade regression, open an existing profile online, force-quit and launch in airplane mode. Verify it keeps its alias. Restore connectivity and confirm Refresh tips still works.

Record build, iOS version, tester aliases, and observed outcomes. Leave phone numbers and verification codes out of GitHub.

2026-11-12 — [1.0.17 release run](https://github.com/kratijain2631/period-app/actions/runs/43318041600) passed TypeScript and all 155 Jest tests. The two dedicated staging accounts signed in and passed phone-only, email-only, combined/deduplicated, caller independence and opt-out lookups. The release job stopped before starting EAS because the GitHub Actions repository secret `EXPO_TOKEN` was missing. After configuring the secret, re-run failed jobs on that run. SMS delivery and physical-device checks remain pending.

## Owner feedback and offline feed — 2026-11-12

Owner confirms 1.0.16 install and successful force-close/offline alias retest; DSA declaration reported resolved. Home’s empty-feed presentation now prioritizes the existing offline state over loading/empty copy. Code review confirms already loaded feed items remain visible; 155 Jest tests, TypeScript and the iOS JavaScript/Hermes export pass. No new low-impact copy-only unit test was added. Native feed rendering still requires a device check because no simulator runtime is installed locally.

A separate isolated staging check used two temporary real-JWT accounts with the exact build-37 email RPC, confirming matches before friendship, while accepted and after removal, wrong-email exclusion and opt-out. Both accounts/data were deleted. No real contacts or production test writes. Owner’s Full Access positive-match case with Shaan remains open until his account email and discovery preference are confirmed.


## Widget and Circle smoke check

Use two staging accounts and a third unrelated viewer after applying the migration. The local [four-tab fixture preview](../design-mocks/home-widgets/README.md) exercises navigation, responsive states and appearance without sending anything to the backend.

1. Request a friendship. Open the recipient’s bell, then tap Add Friends beside the friend directory. Confirm the same request appears in both; accept in one, then verify it disappears from both and from contact suggestions. Repeat with Decline. Background and reopen the app during a request.
2. Select up to five permitted contact matches, including a pending or incoming match. Check that only eligible selections can be sent and the remaining rows still work after a partial failure. Test limited contacts permission, exact phone and email lookup, Share and Copy on iPhone.
3. Opt in to the community boards. Create a post and react, comment and boop from a second accepted account. Delete a comment; check the 30-day support count drops by one. Remove/re-accept the friend and check personal eligibility and Largest Circle without changing post totals. Delete the qualifying post and revisit both personal and global boards: the post and its associated support disappear, friendship and cycle sync do not change. Opt out and confirm the alias leaves the boards for the other viewer. Repeat with an empty board.
4. Follow Home previews to Feed, the inline guide/wheel in You and Circle rankings. Open a profile as self, friend and stranger, and revisit after unfriending. Confirm a stranger cannot see the bio, updates or health information. Test 320 px, large text, VoiceOver, tab focus and the posting keyboard.

Local verification (2026-11-12): all 179 app tests passed; TypeScript passed for native and preview, and the iOS JavaScript bundle exported. The preview confirmed accepting a sample request in Notifications adds the sender to Friends and removes the request from Add friends. No iPhone simulator runtime was installed.

Automated coverage includes cycle range/empty-state selectors, request subscriptions and response races, shared feed mutation failures and deletion, and the transaction in `supabase/tests/circle-rankings.sql` exercised in the disposable database security checks. The iOS JavaScript export does not replace a signed-in device run.

## Illustrated preview · 2026-11-12

[Design v1.0](../design/2026-11-12/v1.0/README.md) records 118 browser screenshots with local sample accounts. Checked contact-setting screens and simulated email/SMS confirmation, Community rankings visibility off and on, scrollable lists to rank ten, one open comment thread, small comment deletion, composer, notifications and guidance refresh. The iOS JavaScript bundle exported locally. Signed-in device testing and real contact confirmation remain pending.

## Requested contact QA results - 2026-11-12

Baseline `8b8bb8e6`: two new isolated staging accounts signed in with real JWTs. v2 tests passed for phone only, email only, both returning one row, default-off/target opt-in, caller searching while undiscoverable, target opt-out/persisted readback, and changed confirmed phone/email invalidating old matches. Normal current-user Auth readback returned the changed details. **Confirmation and identifier changes were simulated with the Admin API.** This proves matching/readback after changes, not native contact-detail updates or SMS/email delivery. Both accounts/data deleted; shared personas and circleqa pair untouched. No actual contacts, Health data or production test writes.

The two contact suites passed **30/30** service/controller tests using mocked OS permission responses. Native iOS denied/limited/full prompts and Settings selections remain untested. `simctl list runtimes` returned no runtime.

Read-only public Auth settings on both hosted environments report phone authentication disabled, phone auto-confirm false and mailer auto-confirm false. Normal staging phone-change request returned HTTP 500 / `unexpected_failure`; exact error cause unconfirmed. Configure/enable SMS before required-phone release; validate real delivery and confirmation using an authorized number. Email-change delivery needs a controlled inbox. Neither delivery flow was verified here.

## Short physical iPhone checks

Use your existing real account and Health records on TestFlight; synthetic Health belongs only in staging.

| Check | Steps | Pass condition |
| --- | --- | --- |
| VoiceOver | Settings > Accessibility > VoiceOver; enable it or ask Siri. Swipe right/left to move focus and double-tap to activate. Read You tips and try Refresh tips and Circle discovery. Ask Siri to turn VoiceOver off afterward. | Understandable labels, full readable tips, sensible focus order and announced loading/errors. [Apple](https://support.apple.com/guide/iphone/iph3e2e415f/ios). |
| Larger text | Settings > Accessibility > Display & Text Size > Larger Text. Enable Larger Accessibility Sizes, increase the slider, then open You/Circle and scroll through cards/controls. | Text wraps without overlap/cutoff and controls remain reachable. [Apple](https://support.apple.com/guide/iphone/make-text-easier-to-read-iph3c076905a/ios). |
| Real Health sync | Health > profile picture > Privacy > Apps > this app; enable the cycle categories you want it to read. Return to this app, open You and compare the sync status and cycle data with your existing Health records. | Recent sync status and period-derived dates/day count agree with existing records. Phase labels remain this app's estimates. [Apple Health permissions](https://support.apple.com/en-us/108779). |

Record build, iOS version, affected control and outcome; do not publish personal Health records, contact addresses, numbers or codes.

## Design v1.0 TestFlight walkthrough

1. Install **1.0.18 (40)** from TestFlight. Apple confirmed it is available to both existing internal groups, **Dev Team** and **Team (Expo)**. The same walkthrough applies to the preceding **1.0.17 (39)** redesign. Use an account that has already finished setup. Cold-launch the app to see the icon and illustrated opening.
2. On Home, open the cycle strip and the upcoming phase to reach the wheel on You. Tap the wheel for phase ranges. Open the phase tip and tap **Refresh tips**. Use a tester with synced cycle data for refresh.
3. In Feed, open comments, switch to another thread and tap another post body. Confirm the old thread collapses. Post a comment and delete it with the small trash icon. Look at **My posts** at the bottom of You.
4. In **You → Settings**, open **Manage contact details** and **Post settings**. Enable **Show me in Community rankings**. Return to Circle, check **Largest Circle** and **Loudest Voices**, then turn visibility off. A tester outside the Top 10 can opt in without ranking.
5. With a second existing account, send a friend request, accept it from Notifications and open the sender’s profile. On Circle, scroll past four friends, switch personal ranking tabs, and scroll the community boards to tenth place when enough testers opt in. Verify relevant scores after a comment, post deletion or friendship change.
6. Try larger text and VoiceOver. Report the screen, action, expected result, actual result, iOS version and build number. Keep any private health or contact data out of shared screenshots.

Live SMS verification, new-account setup and Shaan’s contact match have separate follow-up work. Browser verification uses synthetic contacts.

### Standalone Settings and approved thumbnail

Browser checks followed You → Settings → Post settings and back, changed the sample email and phone with confirmation, and verified ranking visibility survives leaving and returning. The full bio mascot fits at 320, 390 and 480 px. All 179 app tests, native and preview type checks, and the local iOS bundle export passed. Hosted SMS delivery is pending the owner’s provider setup. [Current Settings screenshot](../design/2026-11-12/settings/settings.png).

## 1.0.19 Settings and mascot

Install 1.0.19 (41) in TestFlight using an existing account.

1. Cold-launch from the waving mascot icon. Compare the opening wordmark to Home.
2. On You, check that the drop’s tip and feet are fully visible on the bio banner. Try larger text.
3. Open Settings. Verify Personal info shows each value once. Change an email using a test account you control and complete the confirmation. After hosted SMS is configured, verify a replacement phone number using its code. Confirm a cancelled change keeps the old value.
4. Under Privacy and permissions, open Post settings, return to Settings, and toggle Community rankings visibility. Confirm the preference survives navigating away and back. Sign out and Delete account sit at the bottom.

The earlier core widget checks still apply. See the [v1.0 walkthrough](#design-v10-testflight-walkthrough).

## Feed, setup and sent requests

1. In Feed, tap **Share an update**, enter a draft and choose a mood. Go back and tap **Continue your draft**. Share it and confirm the new post appears in Feed.
2. In first-time setup, finish email and phone verification and choose an alias. Set Community rankings and Post settings. Save, then connect Apple Health or tap **Not now**. Reopen Settings and verify the same choices.
3. With two testers, send a friend request. On Add Friends, check the recipient under **Sent**, tap **Cancel request**, and verify it disappears from the recipient’s Notifications and can be sent again. Also try cancellation from the recipient’s profile. Once accepted, it stays a friendship.
4. Look at the illustrated drop on You and an outward profile. Check the pointed tip, hands and feet. [Phone-width captures](../design/2026-11-12/setup-and-requests/).

The browser preview passed draft/resume/share, setup-to-Settings readback, request cancellation, and mascot bounds at 320, 390 and 480 px. Two isolated staging accounts passed preferences save/readback, request profile lookup, sender-only pending cancellation, recipient inbox removal, resending, and preservation of an accepted friendship. Both test accounts were removed. All 181 app tests passed, along with type checking and an iOS bundle export. No iOS simulator runtime is installed here. Real SMS delivery and the signed-in physical iPhone walkthrough are pending.

## Automatic comments and request tabs

In Feed, open Comments on a period update or phase transition, post two replies, and check the space before each divider. Switch to a written post and back. Check that exactly one thread opens, both replies persist, and you can delete your own. With two existing friends, confirm the recipient’s Most supportive score reflects a new comment and its deletion.

On Circle → Add Friends, switch between Received and Sent. Open a profile, accept or decline an incoming request and cancel an outgoing one. Check the tab counts and the empty state after the last cancellation. On narrow screens and at large text sizes, the row actions can sit below the identity.

The preview passed adding, reading and removing comments on a phase update, single-thread selection, 18 px of space below each comment, tab counts, cancellation and decline. The phone layouts are saved in [the dated screenshots](../design/2026-11-12/requests-and-comments/). All 181 app tests, native and preview type checks and the iOS bundle export passed.
