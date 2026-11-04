# Test accounts (staging personas)

Code-defined test users with realistic Apple Health cycle history, living in a **separate staging Supabase project**, never in production. Use them to test the whole app in the simulator, including posting, reacting, booping and friend requests between accounts.

**Why staging:** the only other project (`mmomoyszozclfjdvjbeb`) is production with real TestFlight testers. Fake users there would show up in real users' search, contact matches and friend recommendations, and the daily cron jobs (including paid OpenAI calls) would process them. The scripts refuse to run against the production ref.

## The pieces

| Piece | Where | What it does |
|---|---|---|
| Personas | `packages/domain/testing/personas.ts` | The cast (logins, profiles, cycle profiles), the social graph, and a deterministic cycle-history generator. Pure TS, unit tested. |
| Seed | `npm run test-accounts:seed` | Creates or resets every persona on staging: login, profile, generated cycle snapshot + recent feed events (computed with the app's own `deriveSnapshot`), friendships, posts, reactions and boops. Idempotent: re-run it any time to get back to a known state. |
| Fake Health | `app/services/healthkit/fakeHealthClient.ts` | In **dev builds only**, with `EXPO_PUBLIC_FAKE_HEALTH=true`, `healthkitClient` serves the signed-in persona's generated samples instead of HealthKit. The real sync → snapshot → upload code runs unchanged. Release builds can't enable it (`__DEV__` gate, tested). |
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
2. **Build its schema from the repo.** Either run each file in `supabase/migrations/` in filename order in the SQL editor, or on this *fresh, empty* project use the CLI: `supabase link --project-ref <staging-ref>` then `supabase db push`. (Never `db push` to production; see TROUBLESHOOTING.md → Migrations.)
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
```

**Two phones side by side:** boot a second simulator (`xcrun simctl boot "iPhone 17"`), install the same dev build, and sign in as a different persona.

**Back to production data:** stop Metro and run the normal `npm run start` (it reads `.env`). Restart with `--clear` if the badge still shows.

## Notes and limits

- **Fake Health replaces HealthKit for every account while it's on.** For a non-persona account the fake source fails the sync instead of returning nothing, so a real account's snapshot can't be blanked. Still, keep real accounts off staging.
- History older than ~35 days lives only in the snapshot, not as feed events, to keep the feed readable.
- Phase-change reminders and other cron jobs run on staging's own schedule, so they won't fire on demand. Changing the simulator's date is the practical way to test them.
- The service-role key bypasses RLS. It stays in the gitignored `.env.staging`, and the scripts refuse to run if it appears in an `EXPO_PUBLIC_*` variable.
- **`.env.local` exists only while `start:staging` runs.** It holds the public staging values, because `.env` would otherwise override them in dev bundles (see TROUBLESHOOTING.md → Gotchas). The script refuses to overwrite a `.env.local` it didn't create and removes its own on exit. If Metro is force-killed, delete the file, or every Metro server you start will use staging. While it exists, any other running Metro server picks it up too.
- **Check where a dev build will connect before launching it with a real session.** The dev client reopens the last server, and with a production server a zero-sample sync runs immediately (BUGS.md). The most reliable proof you're on staging is that a persona can sign in; personas don't exist on production.
- New migrations should be applied to staging first, then production.
