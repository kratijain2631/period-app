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
