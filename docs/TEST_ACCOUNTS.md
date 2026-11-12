# Test accounts (staging personas)

Code-defined test users with realistic Apple Health cycle history, living in a **separate staging Supabase project**, never in production. Use them to test the whole app in the simulator, including posting, reacting, booping and friend requests between accounts.

**Why staging:** the only other project (`mmomoyszozclfjdvjbeb`) is production with real TestFlight testers. Fake users there would show up in real users' search, contact matches and friend recommendations, and the daily cron jobs (including paid OpenAI calls) would process them. The scripts refuse to run against the production ref.

## The pieces

| Piece | Where | What it does |
|---|---|---|
| Personas | `packages/domain/testing/personas.ts` | The cast (logins, profiles, cycle profiles), the social graph, and a deterministic cycle-history generator. Pure TS, unit tested. |
| Seed | `npm run test-accounts:seed` | Creates or resets every persona on staging: login, profile, generated cycle snapshot + recent feed events (computed with the app's own `deriveSnapshot`), friendships, posts, reactions and boops. Idempotent: re-run it any time to get back to a known state. |
| Fake Health | `app/services/healthkit/fakeHealthClient.ts` | In **dev builds only**, with `EXPO_PUBLIC_FAKE_HEALTH=true`, `healthkitClient` serves the signed-in persona's generated samples instead of HealthKit. The real sync → snapshot → upload code runs unchanged. Release builds can't enable it (`__DEV__` gate, tested). |
| Access checks | `npm run test-accounts:rls` | Signs in as personas and checks the access rules: friend requests, friend search, reactions, boops, emails and no-login function access. The Database deploy workflow runs it on staging before every production push. |
| Actors | `npm run test-accounts:actors -- <command>` | Signs in as personas with their password and acts through the normal API + RLS: post, react, boop, friend requests, scripted scenarios. |
| Staging Metro | `npm run start:staging` | Starts the dev-client Metro server with `.env.staging` values. A purple **STAGING · FAKE HEALTH** pill shows in dev builds so you always know where you are. |

## The cast

| Persona | Login | Cycle | Exercises |
|---|---|---|---|
| `ava` | `ava@personas.example.com` | Regular 28 days, 7 periods of history, follicular today | Happy path; every screen complete. Friends with bea, cleo, eli, dev; has sent fay a request. |
| `bea` | `bea@personas.example.com` | Irregular 24–36 days, ovulation tests + basal temperature | Observed (signal-based) phases. |
| `cleo` | `cleo@personas.example.com` | First ever period, day 3 | First-week / little-data experience. |
| `dev` | `dev@personas.example.com` | None | No-data / empty states (e.g. a partner). |
| `eli` | `eli@personas.example.com` | Day 26 of 28 (late luteal / PMS) | Phase transitions, reminders, sync-score edges. |
| `fay` | `fay@personas.example.com` | Regular ~31 days | Incoming friend request, no friends yet. |

All personas share one password: `TEST_PERSONA_PASSWORD` from your `.env.staging`.

## One-time setup

1. **Create the staging project** in the Supabase dashboard (e.g. `period-app-staging`; the free plan allows 2 active projects per org).
2. **Build its schema from the repo.** Either run each file in `supabase/migrations/` in filename order in the SQL editor, or on this *fresh, empty* project use the CLI: `supabase link --project-ref <staging-ref>` then `supabase db push`. (Production is changed only by the Database deploy workflow; see [DB_PUSH.md](DB_PUSH.md).) The current staging project was built this way on 2026-11-03/04, plus a catch-up script for objects production had that no migration did at the time; those are now in migrations.
3. **Check staging matches production.** Production was built by hand-pasting SQL, so compare schemas, e.g. `supabase db dump --schema public -f prod.sql` against each project and `diff` them. Fix any gaps on staging before relying on it.
4. **Deploy the edge functions** to staging (`supabase functions deploy --project-ref <staging-ref>`). Leave `OPENAI_API_KEY` unset there so recommendations use their free fallback text.
5. **Make sure Email sign-in is enabled** (Authentication → Providers → Email). Confirmation emails aren't needed; the seed confirms persona logins itself.
6. `cp scripts/test-accounts/staging.env.example .env.staging` and fill in the staging URL, publishable key, service-role key and a persona password.
7. `npm run test-accounts:seed`

## Everyday use

```bash
npm run start:staging                     # Metro against staging, fake Health on
# In the dev build: Email (dev) login → ava@personas.example.com + TEST_PERSONA_PASSWORD

npm run test-accounts:actors -- list                       # personas + scenarios
npm run test-accounts:actors -- scenario cramps-thread     # others react to ava while you watch as ava
npm run test-accounts:actors -- post eli "Cramps incoming"
npm run test-accounts:actors -- react bea ❤️ ava
npm run test-accounts:actors -- request fay cleo
npm run test-accounts:actors -- accept cleo

npm run test-accounts:seed                # reset everything to the known state
npm run test-accounts:rls                 # check access rules: requests, search, reactions, boops, emails (run after RLS changes)
```

**Two phones side by side:** boot a second simulator (`xcrun simctl boot "iPhone 17"`), install the same dev build, and sign in as a different persona.

**Back to production data:** stop Metro and run the normal `npm run start` (it reads `.env`). Restart with `--clear` if the badge still shows.

## Testing as an AI agent

This isn't tied to any agent or model. The hard rules are in [AGENTS.md](../AGENTS.md).

**What you need:** a Mac with Xcode, the dev build installed, a local `.env.staging`, and a way to tap and type in the simulator. `xcrun simctl` can launch apps and take screenshots but can't tap, so without a simulator UI tool, ask a person to do the tapping. The seed and actor commands only need Node, so they work anywhere that has `.env.staging`. An agent in a cloud sandbox usually can't run the simulator; it can still run `tsc` and `npm test`, and should say that it didn't test on staging.

### Procedure

1. **Preflight.** Stop and fix anything that fails:
   - `.env.staging` exists. If it's missing, copy `scripts/test-accounts/staging.env.example` and ask the owner for the values. Don't fall back to production.
   - No other Metro is running: `lsof -i :8081 -i :8082`. Stop only a server you started, or ask first.
   - The simulator is booted: `xcrun simctl list devices booted`.
   - The dev build is installed: `xcrun simctl get_app_container booted com.syncsisters.cycle`.
2. **Seed:** `npm run test-accounts:seed`. This resets every persona to a known state.
3. **Start staging Metro** in the background: `npm run start:staging`. Add `-- --port 8082` if 8081 is taken.
4. **Open the dev client:** `xcrun simctl launch booted com.syncsisters.cycle`. Launch by bundle ID, because builds can share URL schemes and opening a URL may start the wrong app. If the launcher appears, choose the staging server. Confirm a bundle request appears in the Metro log. If it connected elsewhere, use the dev menu's **Go home** and choose the staging server.
5. **Sign out of any account** from You → gear icon → Sign out. Do this only on the staging bundle, never on production Metro. On staging Metro the fake Health source refuses non-persona accounts, so no sync reaches that account's snapshot.
6. **Sign in as a persona** with "Email (dev)":
   - Type the email in short chunks and check it with a screenshot. Long text can drop characters or land in the wrong field when focus moves.
   - Copy the password without printing it, paste it into the field, then clear the pasteboard:

     ```bash
     node -e "process.stdout.write(require('dotenv').parse(require('fs').readFileSync('.env.staging')).TEST_PERSONA_PASSWORD)" | xcrun simctl pbcopy booted
     printf '' | xcrun simctl pbcopy booted
     ```

   - A successful login proves you're on staging, because personas don't exist on production. The STAGING pill alone doesn't prove it.
7. **Exercise the feature** with the persona that fits it. Use the actor commands under [Everyday use](#everyday-use) to act as other accounts while you watch, then pull to refresh, because the feed doesn't update live.
8. **Take screenshots** into `screenshots/<task>-<date>/`: `xcrun simctl io booted screenshot <path>`. Never commit them, because they can contain personal data.
9. **Check the Metro log** for errors and red screens. Push and background-delivery warnings are normal on the simulator.
10. **Stop Metro and confirm `.env.local` is gone:** `ls .env.local` should report no such file.
11. **Report** the persona used, what you checked, screenshot paths, errors, and anything you couldn't test. Log unfixed bugs in `docs/BUGS.md`.

### Troubleshooting

- **The app shows production data while running `start:staging`:** Expo's dev bundles merge `.env` over shell variables. The script's temporary `.env.local` overrides `.env`, so check that it exists and that nothing like `.env.development.local` overrides it.
- **`[fake-health] Signed-in account is not a test persona`:** a real account is signed in. The refusal is intentional. Sign out and use a persona.
- **The app reconnects to the last Metro and syncs on launch:** with a real account on production Metro, this can overwrite that account's snapshot with an empty one. Stop production Metro and start staging Metro before launching.
- **`Invalid login credentials`:** first confirm the bundle is on staging, then check the fields for dropped or misplaced characters.
- **`expo run:ios` fails on code signing:** build with `xcodebuild` and the `com.syncsisters.cycle` bundle ID instead.
- **A Supabase agent tool refuses write SQL:** run it in the Supabase dashboard's SQL editor on the staging project.

## Notes and limits

- **Fake Health replaces HealthKit for every account while it's on.** For a non-persona account the fake source fails the sync instead of returning nothing, so a real account's snapshot can't be blanked. Still, keep real accounts off staging.
- History older than ~35 days lives only in the snapshot, not as feed events, to keep the feed readable.
- Phase-change reminders and other cron jobs run on staging's own schedule, so they won't fire on demand. Changing the simulator's date is the practical way to test them.
- The service-role key bypasses RLS. It stays in the gitignored `.env.staging`, and the scripts refuse to run if it appears in an `EXPO_PUBLIC_*` variable.
- **`.env.local` exists only while `start:staging` runs.** It holds the public staging values, because `.env` would otherwise override them in dev bundles (see TROUBLESHOOTING.md → Gotchas). The script refuses to overwrite a `.env.local` it didn't create and removes its own on exit. If Metro is force-killed, delete the file, or every Metro server you start will use staging. While it exists, any other running Metro server picks it up too.
- **Check where a dev build will connect before launching it with a real session.** The dev client reopens the last server, and with a production server a zero-sample sync runs immediately (BUGS.md). The most reliable proof you're on staging is that a persona can sign in; personas don't exist on production.
- New migrations reach staging first automatically: merging one runs the Database deploy workflow, which applies it to staging, runs `test-accounts:rls`, then applies it to production ([DB_PUSH.md](DB_PUSH.md)). Edge functions aren't covered, so deploy a changed one to staging by hand first.
- [TESTING.md](TESTING.md) is the overview of every kind of testing; this file is the persona detail.


### Contact-discovery QA pair

The 1.0.17 release workflow provisions `circleqa-a@personas.example.com` (searcher) and `circleqa-b@personas.example.com` (target) only in staging. Use Email (dev) and the existing `TEST_PERSONA_PASSWORD`. The target fixture number is the fictional +1 202-555-0148. Automated checks simulate confirmation with the staging Admin API and restore the target to undiscoverable. For a real delivery test, use an authorized SMS-capable number. The six shared cycle personas are independent of this pair.
