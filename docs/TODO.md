# TODO

Open items, roughly in priority order. Done work isn't listed here.

## Finish the `main` integration (post-merge) — do this next
We merged `main` (57 commits) onto our identity/docs. To make it actually run on **our** Supabase + Apple account:
- [x] `npm install` new native deps (`react-native-svg`, `expo-image-picker`, `expo-font`).
- [x] Apply main's DB migrations to **our** Supabase (schema, done via the SQL editor).
- [x] Deploy `delete-account` edge function (done — powers the delete flow; no secrets needed, uses Supabase's auto-injected keys).
- [ ] **Rebuild** (native deps require it), reinstall, and test — this also fixes the crash (from the stale base).
- [ ] **Resubmit to TestFlight, but do NOT submit for Beta App Review yet** — just get the build up on TestFlight.

## Fix avatars + AI features (OpenAI key)
- [x] Get an **OpenAI API key** and set it as an edge-function secret (`supabase secrets set OPENAI_API_KEY=…`), then deploy the AI edge functions (`avatar-generator`, `cycle-guidance`, `friend-recommendations`). This fixes the avatar feature and the AI guidance/recommendations. _(Done 2026-07-24: secret set + all three functions deployed ACTIVE via the Supabase CLI. Key kept out of the repo — **rotate it**, it was shared in a chat transcript.)_
- [ ] Deploy `notifications-handler` (needs an Expo push access token) and then run the 3 `schedule-*` cron migrations.

## Deploy / data follow-ups (2026-07-24)
- [ ] **Redeploy the `delete-account` edge function** — it now also deletes the user's `posts`, `post_reactions`, `event_reactions`, and `boops` (previously orphaned). `npx supabase functions deploy delete-account`.
- [ ] **One-time cleanup of already-orphaned rows** from accounts deleted before the fix (posts/reactions/boops whose `user_id` no longer exists in `auth.users`), and of the backdated flood posts on already-synced accounts. Run [`supabase/cleanup/2026-07-24-orphaned-and-backdated-cleanup.sql`](../supabase/cleanup/2026-07-24-orphaned-and-backdated-cleanup.sql) via the SQL editor (preview counts, then the delete block). Note: it also removes the demo seed rows, since their user_ids aren't real accounts.

## New features (Beta 2 feedback — 2026-07-24)
Larger asks that need their own design + PRs (not part of the composer/reaction bugfix PR):
- [ ] **Sign in without Apple.** Add an alternative auth path so people can use the app without an Apple ID (e.g. email/OTP via Supabase Auth). Touches `AuthScreen`, `appleAuth`/auth services, Supabase Auth config, and onboarding. See FEATURES.md → "other auth methods" (Level 2).
- [ ] **Manual cycle entry (no Apple Health).** Let users enter/log cycle data by hand instead of requiring HealthKit — needed for non-iOS-Health users and Android later. Requires new logging UI + data model. See FEATURES.md → "In-app logging" / Level 2 "in-app tracking (vs. read-only)".

## Ship the beta (external TestFlight)
- [x] Production build (`eas build --profile production --platform ios`)
- [x] Submit to App Store Connect (`eas submit --profile production --platform ios --latest`)
- [x] App Store Connect / TestFlight setup: export compliance, beta description, privacy policy URL, review notes
- [x] Submit for Beta App Review — **awaiting Apple (~1 day)**
- [ ] Once approved: share the public TestFlight link with friends
- [ ] **Next TestFlight submission — fix the tester test-description.** Say **"menstrual"** data, not "period" data, and fix typos. (Tester feedback, Beta 2.)

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

## Before a public App Store release (not needed for beta)
- [ ] App Privacy "nutrition labels" + age rating in App Store Connect (declare health-data collection)

## Nice to have
- [ ] Set up EAS Update (`expo-updates`) for instant over-the-air JS updates during the beta (no rebuild)
- [ ] Cosmetic: clean up leftover "Cycle Companion" references in docs (`thoughts/`, `prompts/`, `implementation-docs/`, `overall/`)

## Separate track (not this repo)
- [ ] Fix the "Sync Sisters" app in Newly: run `eas init --force` inside Newly so it gets its own EAS project id (currently collides with this project's id)

See [IDENTIFIERS.md](IDENTIFIERS.md) for all names/identifiers and where to change them.
