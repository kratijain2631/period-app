# Troubleshooting & operations

Everything learned bringing this app up: the issues we hit and fixed, what's configured where, what can expire or break, and the accounts you need. Read this before debugging a build, a sign-in failure, or an expiry.

## Accounts & access you need

| Service | Account | What it's for | Notes |
|---|---|---|---|
| Apple Developer Program | `kratij@gmail.com` — team "Krati Jain" (`8AMCNWFZ39`), Individual | App IDs, signing, capabilities | $99/year, renews annually |
| App Store Connect | same Apple ID | TestFlight, App Store, review | EAS authenticates via an App Store Connect API key (App Manager role) |
| Expo / EAS | `kratijain26` (a second account `kratijain2631` also exists) | Cloud builds, credentials, env vars | Project: `@kratijain26/period-app` |
| Supabase | account owning project `mmomoyszozclfjdvjbeb` | Auth + Postgres database (production) | Free tier pauses on inactivity |
| Supabase (staging) | project `period-app-staging` (`rntqwmptuavqnbjovnae`) in the owner's org, free plan | Test personas, and the first stop for every migration | The free plan allows 2 active projects per org; a spare project was paused to make room. See [TESTING.md](TESTING.md). |
| GitHub | `kratijain2631/period-app` (**public**) | Source, CI, the Database deploy workflow and its secrets | Anyone can read the repo, so never commit secrets, database URLs or details of an unfixed security hole. Making the deploy check required on `main` needs a repo admin. |

> **The paid Apple Developer Program ($99/year) is required for TestFlight.** A free Apple ID cannot distribute builds at all — no TestFlight, no App Store, and no installing signed builds on physical devices via EAS. The membership must be active (it renews annually); if it lapses, builds can't be signed or distributed until it's renewed.

The original collaborator's (Lukas's) accounts are **no longer needed** — we migrated everything to the accounts above. Note: this Apple ID is still a *member* of Lukas's Apple team, so at build time EAS shows two "providers" — always pick **Krati Jain (129196348)**, not Lukas.

## Migrations: applied by the Database deploy workflow, see [DB_PUSH.md](DB_PUSH.md)

Merging a migration to `main` applies it: the **Database deploy** GitHub Actions workflow pushes it to staging, runs `test-accounts:rls`, then pushes it to production. The steps, secrets and the emergency rule are in [DB_PUSH.md](DB_PUSH.md).

- **Both projects have migration history:** staging since 2026-11-08, production since 2026-11-11. The deploy workflow refuses a database without history, because `db push` would otherwise re-run every migration.
- **The database secrets must be Session pooler URIs.** GitHub's runners can't reach the direct database host (IPv6 only), so a Direct connection URI fails to connect. A value that isn't a database URL at all now fails with the secret's name (#78).
- **A failed run stops before production.** Read the failing step in the Actions tab, fix it with a new migration, and merge again. Don't paste a fix unless production is broken (see the emergency rule).
- **`supabase link` gets a 403** from the management API on both projects, so the scripts name the database with `--db-url` instead. Edge function deploys go through the Supabase connector or the dashboard.
- **Before 2026-11-08 every migration was pasted by hand,** and nothing recorded what had run. If a database ever seems out of step with the repo, compare [`scripts/db/fingerprint.sql`](../scripts/db/fingerprint.sql) results with staging's.
- **Friend-cycle migration mismatch (2026-08-06):** `20260729000000_friend-cycle-summary-privacy.sql` was applied live but never committed to `main`, while the client still selected raw cycle tables. The source/client port is now restored and uses only sanitized RPCs. `20260806000000_legacy-friend-cycle-read-compat.sql` was briefly applied, but the owner confirmed this is dev-only and all testers can update; run `20260806010000_remove-legacy-friend-cycle-read.sql` in the SQL editor to restore owner-only raw-table policies. Do not rerun earlier migrations or use `db push`. _(Historical note from 2026-08. Since 2026-11-11 the Database deploy workflow's `db push` is the normal path, and it only applies migrations a project hasn't recorded.)_

## On-demand cycle guidance (backend deployed 2026-11-03; device verification pending)

The You page now always renders local tips while loading/offline/AI-unavailable. New AI requests go to **`request-cycle-guidance`**, never the legacy all-users `cycle-guidance` batch handler. The new endpoint verifies the supplied JWT using `auth.getUser`, checks the expected account ID, and uses that caller's RLS/RPC permissions throughout, avoiding the old service-role-key failure.

Rollout procedure (steps 1–3 completed 2026-11-03):
1. The original on-demand objects were applied on 2026-11-03 and are canonically recorded by `20261106190000_capture-hand-applied-guidance.sql` on main. The earlier unmerged `20261103120000` duplicate is retired from this branch; do not apply it separately. The new `20261111210000_manual-guidance-refresh.sql` was applied to both projects through Database deploy run 43154655774 on 2026-11-11 for explicit refresh. See DB_PUSH.md; do not paste production SQL.
2. If the auto-injected `SUPABASE_ANON_KEY` no longer works under the project's API-key configuration, set edge-function secret **`PROJECT_PUBLISHABLE_KEY`** to the same current publishable key used by the app. This is a public client key, not the service-role key. Keep `OPENAI_API_KEY` configured server-side; `OPENAI_MODEL` remains optional.
3. Deploy `supabase functions deploy request-cycle-guidance --project-ref mmomoyszozclfjdvjbeb --no-verify-jwt`. Gateway verification is disabled to avoid the legacy JWT-key gateway issue; **the handler still verifies every user JWT** before accessing data. The publishable API key alone cannot authorize a request. No cron scheduling is required.
4. Ship the client build and verify: open You → fallback appears immediately → AI replaces it; reopen the same phase → cache reused; change phase/cycle → old advice disappears; offline/missing AI key/failed generation → fallback remains. Confirm another user's ID or an invalid JWT cannot generate guidance. Try overlapping requests from two devices.

The server compares phase **and `currentPhaseStart`** against the stored snapshot before claiming and again before saving. Missing/outdated remote snapshots must sync first; local tips remain visible until then. A failed/in-flight generation holds its lease for two minutes, so returning to the page immediately can show fallback rather than retry AI. Revisit after the cooldown. AI failures are never persisted as successful guidance. The original nightly function remains; its cron was active on 2026-11-03 and was retired through PR #83 on 2026-11-12, with gateway JWT verification enabled. Scheduler-only authorization was fixed/deployed on 2026-11-07; the new client never invokes it. Do not reapply the scheduling migration or interpret the old job as a dependency of the new guide.

**Verified 2026-11-03:** migration executed twice against embedded PostgreSQL (PGlite), with successful checks for cache reuse, lease deduplication/cooldown, stale claim rejection, phase changes, RLS account isolation and unauthenticated denial. Applied **only this migration** through the authenticated CLI `supabase db query --linked --file ...` (no `db push`). Live checks confirm RLS enabled, no direct authenticated access to the lease table, and both RPCs executable by authenticated users but not anon. `PROJECT_PUBLISHABLE_KEY` configured from the app's public client key; `request-cycle-guidance` deployed successfully. Missing and invalid user tokens both return HTTP 401 from the deployed handler.

**Local validation:** 71 Jest tests pass (one optional architecture/AI test skipped), app TypeScript and actual Deno check with the pinned remote Supabase dependency pass, and Metro/Hermes exports the iOS bundle. The actual React Native PhaseGuide component was rendered in a separate temporary Expo web preview and visually checked at 320px width; titles and details wrap without truncation. Editorial rules and NHS sources: [GUIDANCE.md](GUIDANCE.md).

**Live authenticated integration test (owner-approved, 2026-11-03):** created an isolated synthetic account with no confirmation email, stored a synthetic luteal snapshot and signed in with a real user JWT. A mismatched account ID returned 403; two overlapping generation requests returned 200/202; AI produced and saved three dos/three don’ts; another request reused the same cache without changing its generation timestamp; direct lease-table reads returned 403. Deleted the synthetic auth account afterward (test records cascade). Admin credentials stayed in process memory and were never logged or committed.

**Builds:** 1.0.13 (34), EAS submission `a644dafb-6b2c-4ffc-a8b0-f8169b294049`, and 1.0.14 (35), submission `dbea0ad5-7488-4cef-a16d-cb238d5050a6`, both have finished binaries but **failed submissions**. EAS recheck 2026-11-11 returns `ERRORED` / `EAS_ASC_REQUIRED_AGREEMENTS_MISSING_OR_EXPIRED`. Account Holder must accept agreements in App Store Connect → Business (and Developer account if prompted), then retry the existing binary. TestFlight availability is not confirmed. Build 36 later uploaded successfully and owner confirmed adoption/refresh success; retirement PR #83 completed on 2026-11-12.

**Still unverified:** native VoiceOver/Dynamic Type, real HealthKit sync and two physical devices. No usable iOS simulator runtime is installed; on-device checks in step 4 remain required. Git/network operations work with the session's escalation mechanism, so the earlier local-only/Git-blocked constraint no longer applies. System Python 3.6 has an outdated certificate store; use Node 20's fetch for endpoint smoke tests rather than disabling TLS verification.

## Contacts discovery — database verified; device rollout open (2026-11-03)

The additive `20260812090000` migration is **already applied** on project `mmomoyszozclfjdvjbeb`: live column/default, RPC definition and grants verified, then opt-in/out and owner-only RLS tested with three synthetic accounts inside a fully rolled-back transaction. Do not reapply it or use `db push`. Reproducible SQL and the physical test matrix: [CONTACT_DISCOVERY_ROLLOUT.md](CONTACT_DISCOVERY_ROLLOUT.md).

Owner testing: build 1.0.12, iOS 26.6.2, Limited Access with two contacts → both discovery controls flash without a visible result; restarting and using Find Contacts alone still flashes. Full Access → Choose more contacts disappears and lookup reaches the empty-match message. The empty state does not establish a positive match; the other account must opt in and its actual account email must match the saved contact (Apple private relay is a known limitation).

Apple acknowledges a [system contact-access-picker bug](https://developer.apple.com/forums/thread/814292); [Expo maintainers](https://github.com/expo/expo/issues/46977) classify it as upstream. This is consistent with the picker symptom, **not proof of the separate limited-read failure's root cause**. The recovery change routes selected-contact management to iOS Settings, refreshes permission on foreground, clears cached/in-flight results after background/access changes, bounds waits and shows progress/empty/error notices beside the action. Permission reads and Contacts requests never change account discoverability. Device verification on the new build remains required.

Recovery build **1.0.14 (35)** finished successfully on EAS ([EAS build](https://expo.dev/accounts/kratijain26/projects/period-app/builds/bf9a1168-1a04-430f-b342-bc6128d92fd8)); [automatic submission](https://expo.dev/accounts/kratijain26/projects/period-app/submissions/dbea0ad5-7488-4cef-a16d-cb238d5050a6) failed (`ERRORED`, required Apple agreements missing or expired; rechecked 2026-11-11). Tag `v1.0.14-build35`, source `a67b00dd`. TestFlight availability is not yet confirmed.

## Manual Phase Guide refresh (2026-11-11 — backend deployed; native rollout pending)

[Database deploy run 43154655774](https://github.com/kratijain2631/period-app/actions/runs/43154655774) applied `20261111210000_manual-guidance-refresh.sql` to staging, passed all 75 staging access checks, then applied it to production on 2026-11-11. PR #79 merged at `e32d9848`. No manual production SQL was used. The handler was then deployed to staging, authenticated API checks passed, and it was deployed to production (ACTIVE version 3). Existing requests retain their cache-first behavior; explicit refresh uses the new RPC.

Staging verification used one isolated synthetic account with a real JWT, synthetic snapshot and cached tips. Cache reads, refresh claim/save, duplicate suppression, HTTP cooldown, wrong-account/invalid-token rejection and private lease-table denial passed. Cleanup deleted the account and cascading records. No OpenAI call or shared persona reset occurred. `PROJECT_PUBLISHABLE_KEY` was configured on staging from its existing public key; no secrets were logged. Staging still has no AI key.

Local checks: 145 Jest tests, app TypeScript, actual Deno typecheck, iOS Metro/Hermes export and embedded PostgreSQL regression checks pass. The actual presenter browser fixture confirmed disabled/loading state, error feedback and retained tips. Reproduce SQL checks with `node scripts/db/test-guidance-refresh.mjs /path/to/@electric-sql/pglite/dist/index.js`.

**Current release (rechecked 2026-11-12):** 1.0.15 (36), [EAS build](https://expo.dev/accounts/kratijain26/projects/period-app/builds/70771a46-d436-4d5a-8eb2-98bfbf5625c2) and automatic [submission](https://expo.dev/accounts/kratijain26/projects/period-app/submissions/c777ddf1-bf03-4475-ba3a-f36476c233e5) both `FINISHED`, source `b3b3b493`, tag `v1.0.15-build36`. Build and upload are complete. Pending: Apple processing/group assignment and install visibility for the intended tester account, adoption, and real-phone regeneration/offline/account/phase/accessibility checks. Browser access timed out during this availability audit, so no App Store Connect group state was observed. `.env.staging` is missing locally and no usable iOS simulator runtime is installed; API checks above do not establish native behavior.

**Historical Apple blocker (superseded for build 36’s successful upload):** retry of build 35 after the owner reported accepting an agreement produced submission `70f04e68-47e6-476c-838e-5d3e46aa6074`, also `ERRORED` / `EAS_ASC_REQUIRED_AGREEMENTS_MISSING_OR_EXPIRED`. The owner reports another pending item and supplied the DSA trader declaration. Apple distinguishes TestFlight-only distribution from EU App Store commercial/professional distribution; the owner must assess and submit the accurate status. Do not assume that a free app is a non-trader or that completing DSA necessarily resolves every agreement error. [Apple criteria](https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements).

The initial retirement hold is resolved: owner-confirmed build 36 availability/adoption and refresh success preceded PR #83. [Database deploy run 43274996960](https://github.com/kratijain2631/period-app/actions/runs/43274996960) applied `20261111211000` to staging, passed all 75 staging access checks, then applied production. Post-deploy read-only metadata confirms nightly guidance absent and `daily-phase-change-reminder` active at 15:00 UTC in both projects. Existing user advice was not deleted.

## Build & submission gotchas

- **Contact discovery requires both a database migration and a fresh native build (added 2026-08-12; migration confirmed live 2026-11-03).** On a new project only, apply `supabase/migrations/20260812090000_contact-friend-discovery.sql` manually before testing; it additively creates `users.discoverable_by_contacts` (default `false`) and the `contact_friend_matches` RPC. Then create/reinstall a native dev or TestFlight build because `expo-contacts` and `NSContactsUsageDescription` are native configuration — a Metro reload cannot add them to an older binary. On iOS 18+, test both **Limited Access** (selected contacts only, including “Choose more contacts”) and **Full Access**, plus denial → Settings recovery. These are deliberately separate controls: the Apple permission determines which address-book entries this device can read, while the in-app “Let contacts find me” toggle determines whether this account can appear in another user’s hashed lookup. Matching currently uses account email only; Sign in with Apple private-relay emails may not match until verified phone-number support is added.

- **`eas build` hangs forever at "Compressing project files" — cause: iCloud-evicted (`dataless`) files (learned 2026-08-05, cost hours).** The repo lives in `~/Documents`, which **macOS "Desktop & Documents" iCloud sync** can offload: files show a normal size in `ls` but have **0 allocated blocks** and the **`dataless`** flag, and their bytes only download when read. eas-cli's project archive copies tracked files one-by-one (pure JS, no child process), so when it reaches a dataless file the read **blocks on rematerialization and the whole build hangs** — signature: process alive, **0% CPU, no child process, no network socket**, stuck on `- Compressing project files`. It reproduces on any Node/eas-cli version and is **not** the sandbox. **Diagnose:** `DEBUG='*' eas build … 2>&1 | tee /tmp/eas.log` then look at the last `copying { … relativePath }` line — that file is the culprit; confirm with `ls -lO <file>` (shows `dataless`) and `stat -f 'blocks=%b size=%z' <file>` (blocks=0, size>0). **Find them all:** `git ls-files -z | xargs -0 ls -lO | grep dataless` (and `find node_modules -type f -flags +dataless | wc -l`). On 2026-08-05 there was 1 tracked dataless file (`reference/wireframes.jpeg`) **plus ~13,871 in `node_modules`**. **Fix:** (1) materialize the tracked one(s): `cat reference/wireframes.jpeg > /dev/null` (or `brctl download <file>`) — verify `blocks` goes non-zero and the `dataless` flag clears; (2) the separate **fingerprint** step reads all of `node_modules`, so with thousands evicted there, **skip it**: `EAS_SKIP_AUTO_FINGERPRINT=1`. **The one command that worked** (Node ≥20 required — 16 is too old for eas, 18 is too old for Metro's `toReversed`; `NODE_EXTRA_CA_CERTS` only needed if a stray Node lacks CA certs):
  ```
  cd ~/Documents/period-app && \
  export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH" EAS_SKIP_AUTO_FINGERPRINT=1 && \
  cat reference/wireframes.jpeg > /dev/null && \
  ~/.npm-global/bin/eas build --platform ios --profile production --non-interactive --auto-submit
  ```
  Durable options if it recurs: keep the repo out of iCloud-synced Documents, or add heavy iCloud-prone dirs (e.g. `reference/`) to `.easignore`. **Note:** each failed `eas build` still increments the remote `buildNumber` (we burned 17→30 during debugging — harmless, just skips numbers).

- **`NSHealthUpdateUsageDescription` is mandatory — never remove it (learned 2026-08-02).** With the HealthKit entitlement present, App Store Connect **rejects the upload** without this key, even though the app is read-only: *"Missing purpose string in Info.plist … While your app might not use these APIs, a purpose string is still required."* (altool validation 409, `STATE_ERROR.VALIDATION_ERROR`). We tried removing it (to fix the misleading "…would like to update your health data" permission wording) — the build **compiled** but the TestFlight submission **failed validation**. Reverted: the key stays in `app.config.ts` with an honest string (`"<name> does not write any data back to Apple Health."`). The "update" framing only actually shows to users if the app *requests* write authorization, which it doesn't (`requestAuthorization([], cycleReadTypes)`), so read-only users see only the read section. See [BUGS.md](BUGS.md).

## Environment variables & config (where each lives)

| Value | Where it lives | Notes |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | `.env` (local, gitignored) **and** EAS env vars (production) | `https://mmomoyszozclfjdvjbeb.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `.env` **and** EAS env vars (production) | `sb_publishable_…` (client-safe publishable key) |
| Database deploy secrets | GitHub → Settings → Secrets and variables → Actions | six secrets, listed in [DB_PUSH.md](DB_PUSH.md) |
| Staging values (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `TEST_PERSONA_PASSWORD`, `EXPO_PUBLIC_FAKE_HEALTH`) | `.env.staging` (local, gitignored); template in `scripts/test-accounts/staging.env.example` | `npm run start:staging` copies the public ones into a temporary `.env.local`. The service-role key must never be in an `EXPO_PUBLIC_` variable. See [TESTING.md](TESTING.md). |
| `cron_secret` | Supabase Vault on each project | Generated by `20261107013000_scheduled-function-secret.sql`; the cron jobs send it and the scheduled edge functions check it. Never copied anywhere else. |
| `EXPO_PUBLIC_DEV_AUTH` | `.env` only | `true` — enables the dev email/password login, which only renders in `__DEV__` builds |
| Supabase Apple provider Client IDs | Supabase dashboard → Authentication → Providers → Apple | **must** include `com.syncsisters.cycle` |
| DB schema / migrations | `supabase/migrations/`, applied by the Database deploy workflow on merge | see [DB_PUSH.md](DB_PUSH.md) |

> **Critical gotcha:** `.env` is gitignored, so **cloud (EAS) builds do not see it**. Any `EXPO_PUBLIC_*` value the app needs at runtime must *also* be set as an EAS environment variable, or the production/TestFlight build ships without it. This bit us once — the first production build would have had no Supabase config. Fixed by adding both Supabase vars to EAS (`eas env:create --environment production …`).
>
> **How to verify it's working:** at the start of a build, the log prints which env vars were loaded, e.g. `Environment variables ... loaded from the production environment: EXPO_PUBLIC_SUPABASE_ANON_KEY, EXPO_PUBLIC_SUPABASE_URL`. If those two aren't listed there, the build will ship without Supabase config and the app won't reach the backend — add them to EAS before building.

## Onboarding a teammate

Contributor setup (access checklist, `.env` keys, running dev builds) lives in [ONBOARDING.md](ONBOARDING.md).

**If a contributor can't run the app or hits access/permission errors** (can't clone, can't reach Supabase, can't install a build, sign-in fails), first check the **access checklist in [ONBOARDING.md](ONBOARDING.md)** for missing access — GitHub repo, Supabase dashboard membership, EAS membership, a registered device UDID, or TestFlight. Most "it doesn't work for me" issues are missing access, not a code problem.

## Key URLs

- **Privacy policy (temporary):** https://claude.ai/code/artifact/ff7fefe2-3ece-4373-bb51-3c60bdfb8bec — a Claude artifact. Move to a permanent host before public launch (see [TODO.md](TODO.md)).
- **Expo project:** https://expo.dev/accounts/kratijain26/projects/period-app
- **Supabase project:** https://supabase.com/dashboard/project/mmomoyszozclfjdvjbeb
- **App Store Connect:** https://appstoreconnect.apple.com

## Installing a build from a raw `.ipa`

To install a build directly from an `.ipa` file (outside TestFlight or the EAS install page), you can use **[Diawi](https://www.diawi.com)** — upload the `.ipa` and it gives you an install link + QR to open on the device. Handy for ad-hoc / dev builds. Note: it doesn't bypass Apple signing — the device's UDID must still be in the build's provisioning profile (for `development` / `preview` builds), same as the EAS install page.

## Things that expire or can lapse

| Thing | When / trigger | What breaks | Fix |
|---|---|---|---|
| Apple distribution certificate (`4404A2DF…`, id `MCZNPC2CDY`) | **2027-07-20** | New builds can't be signed | EAS regenerates on build (cap ~2 distribution certs — reuse, don't hoard) |
| Provisioning profiles (dev `66GM6HX5Z5` + App Store `LS2KKHYSBX`) | **2027-07-20** | Signing fails | Regenerate on build; decline "reuse" if a profile is stale/missing a capability |
| Apple Developer membership | ~annually ($99) | Everything Apple-side stops | Renew |
| Sign in with Apple **web** OAuth secret | every ~6 months | **web** sign-in breaks | Regenerate the Apple secret key. **Not applicable right now** — this app uses the *native* Sign in with Apple flow (the Supabase Apple provider needs only Client IDs, no secret key). Only matters if you ever add the web OAuth flow. |
| App Store Connect API key (App Manager) | if revoked/expired | `eas submit` fails | Regenerate via `eas` on next submit |
| Supabase project (free tier) | pauses after ~1 week of inactivity | App can't reach backend | Un-pause in the Supabase dashboard |
| Staging Supabase project (free tier) | pauses after ~1 week of inactivity | Seeding, staging Metro and the Database deploy workflow fail (the workflow stops before production) | Un-pause it in the dashboard, then re-run the workflow |
| Production database password | if reset | `PRODUCTION_DB_URL` stops working and the deploy fails | Rebuild the Session pooler URI and update the secret ([DB_PUSH.md](DB_PUSH.md)) |
| EAS build quota (free tier) | monthly | Builds queue or block | Wait for reset or upgrade the Expo plan |
| Metro tunnel URL (`…exp.direct`) | changes when Metro restarts | Dev client can't connect | Re-enter the new URL in the dev client |
| Supabase publishable key | if rotated | Auth/API calls fail | Update `.env` **and** the EAS env var |

### GoDaddy domain and mailbox renewal (November 2026)

Krati bought the domain and Microsoft 365 Email Essentials on November 13, 2025 (New York time), for $10.19 and $11.88 respectively, plus $1.05 tax ($23.12 total). GoDaddy provisioned `krati@cadenceapp.org` on that order.

On November 13, 2026, Krati paid **$37.12** ($36.07 plus $1.05 tax), superseding the plan to let the services expire.

| Product | Price before tax | Renewal terms |
| --- | ---: | --- |
| `cadenceapp.org` .ORG domain renewal | $24.19 | One year. The receipt does not specify automatic renewal or next year's price. |
| Microsoft 365 Email Essentials for `cadenceapp.org` | $11.88 | One year. Auto-renews November 13, 2027 for $107.88 before tax. |

The receipt identifies the email plan’s domain but does not confirm which mailbox or aliases were provisioned. Purchasing it does not configure the requested `info@cadenceapp.org` sender.

## Issues we hit — and the fixes

1. **EAS "Entity not authorized" on build.** Logged into EAS as `kratijain26`, but the app.json still pointed at the collaborator's EAS project (`04bd3a64…`). → Removed the old `projectId` and ran `eas init --force` to create `@kratijain26/period-app`.
2. **Bundle id taken.** Couldn't reuse `com.cadence.cycle` (globally unique, owned by Lukas). → Used `com.syncsisters.cycle`; EAS auto-registered the App ID (with HealthKit + Sign in with Apple).
3. **Dev client: "No development servers found" / "Failed to connect".** The Wi-Fi blocked device-to-device (LAN). → Ran Metro in **tunnel** mode (`expo start --dev-client --tunnel`), which needed `@expo/ngrok` installed.
4. **Tunnel connect failed over `http://`.** iOS blocks cleartext to non-local hosts. → Use the **`https://`** form of the `…exp.direct` URL.
5. **White screen after connecting.** First bundle over the tunnel was slow and the request timed out. → Warmed Metro's cache locally first (`curl` the `node_modules/expo/AppEntry.bundle` endpoint), then the phone loaded it fast. (Entry path is `AppEntry.bundle`, not `index.bundle`.)
6. **Sign in with Apple: "Sign Up Not Completed".** The provisioning profile signing the installed build didn't include the Sign in with Apple entitlement — even though the App ID capability was enabled. (App-ID capability ≠ profile contents.) → Rebuilt and **declined "reuse profile"**, forcing EAS to regenerate a fresh profile that carried the entitlement; reinstalled.
7. **"Account not found" on the build install page.** The phone's Safari was logged into Lukas's Expo account. → Logged into expo.dev on the phone as `kratijain26`.
8. **Supabase: "unacceptable audience in id_token: com.syncsisters.cycle".** Supabase's Apple provider didn't list the bundle id as a valid audience. → Stood up our own Supabase project, pointed the app at it, and added `com.syncsisters.cycle` to the Apple provider **Client IDs**.
9. **Alias/profile errors** ("permission denied for table users", "column users.alias does not exist", "device_tokens not in schema cache", `PGRST204`). Only part of the migration SQL had been pasted/run. → Re-ran the **complete** migration script, plus explicit `grant … to anon, authenticated` and `notify pgrst, 'reload schema'`.
10. **No sign-out and no account deletion.** → Added both to Profile → Account (delete is backed by the `delete_account()` SECURITY DEFINER function).
11. **Production build missing Supabase config.** `.env` is gitignored, so cloud builds didn't have the vars. → Set them as EAS environment variables for `production`.
12. **App Review "sign-in required" wants a username/password.** The app is Sign in with Apple only (the email/password path is dev-only). → Turned off "Sign-in required" and explained in the review notes that reviewers use their own Apple ID.
13. **(Separate app) "Sync Sisters" build in Newly failed** — its app.json carried *this* project's EAS `projectId`, so slug and id mismatched. → Fix is `eas init --force` **inside Newly** (not this repo).
14. **`eas submit --non-interactive` (and `--auto-submit`) fails: "Set ascAppId in the submit profile."** `eas.json`'s `submit.production` is `{}`. In **interactive** mode EAS auto-detects the App Store Connect app from the bundle id (needs an Apple ID login / cached Apple session — which is how Beta 1–3 submitted), but in **non-interactive** mode it refuses to and demands `ascAppId`. The build itself is unaffected (it uses the ASC **API key** EAS already stores). → **Permanent fix:** put the app's App Store Connect **Apple ID** number (App Store Connect → the app → *App Information → General Information → Apple ID*, a ~10-digit number) into `eas.json` → `submit.production.ascAppId`. Then `eas submit --platform ios --profile production --latest` runs headless (uses the stored ASC API key, no Apple login). **The number is `6793724458`** (bundle `com.syncsisters.cycle`; SKU `EX1784762845924`) — now set in `eas.json` → `submit.production.ascAppId`, so `--non-interactive` / `--auto-submit` submits work headless from here on. (The bare ASC API key `.p8` was in `~/Downloads`, but the **Issuer ID** needed to query the ASC API for the number wasn't stored anywhere local, so it couldn't be auto-derived headless — hence recording it here.)

## Gotchas that could fail again

- **Never run `eas init --force` in this repo** to fix an unrelated project — it would overwrite this project's `EAS_PROJECT_ID`.
- **Changing the iOS bundle id** means re-registering the App ID, regenerating the profile, and updating the Supabase Apple provider Client IDs — all over again. Avoid unless pre-launch and deliberate. See [IDENTIFIERS.md](IDENTIFIERS.md).
- **`EXPO_PUBLIC_*` vars** must be kept in sync between `.env` and EAS env vars.
- **First external TestFlight build** needs Beta App Review (~1 day); later builds to the same group usually don't.
- **Health-app review** scrutinizes HealthKit + data sharing — keep the "read-only, never written back, shared only with approved friends" framing in review notes and the privacy policy.

- **Never sign in with a real account on the simulator.** It has no Health data, and a zero-sample sync uploads an empty snapshot over the real one friends see. Use the staging personas ([TESTING.md](TESTING.md)).
- **Supabase agent tools may refuse write SQL** with a confirmation prompt that never appears. Database changes go through migrations anyway; for read-only checks the tools work.
- **Setting `EXPO_PUBLIC_*` in the shell doesn't beat `.env` in dev bundles.** Expo's dev-only `expo/virtual/env` module merges `.env`, `.env.development`, `.env.local` and `.env.development.local` over `process.env`, so `.env` values win and keys missing from `.env` still come through. This made an early `start:staging` talk to production while showing the STAGING pill. `start:staging` now writes the public staging values to a gitignored `.env.local` while Metro runs. `EXPO_NO_DOTENV` doesn't affect this module. To check a bundle, look for the Supabase URL under its `.env*` modules, not just the env header.

## State that lives OUTSIDE git (not versioned — back up / remember separately)

- **`.env`** (gitignored): Supabase URL + publishable key + `EXPO_PUBLIC_DEV_AUTH`.
- **`.env.staging`** (gitignored): staging URL, keys and the persona password, on the owner's Mac.
- **GitHub Actions secrets:** the six Database deploy secrets ([DB_PUSH.md](DB_PUSH.md)). Both database passwords are in the owner's password manager; Supabase only shows a password when it's reset.
- **Staging project setup:** Vault secrets, deployed edge functions and the seeded personas (re-create the personas any time with `npm run test-accounts:seed`).
- **EAS environment variables** (on Expo's servers): the two `EXPO_PUBLIC_SUPABASE_*` values for `production`.
- **Supabase project config:** the Apple provider Client IDs, the applied database schema/migrations, and all app data.
- **Apple signing credentials** (certificate + provisioning profiles): stored by EAS / macOS Keychain.
- **App Store Connect API key:** stored by EAS.
- **Privacy policy:** hosted as a Claude artifact (not in the repo).
- **`@expo/ngrok`:** installed with `--no-save` for tunneling, so it's in `node_modules` but not `package.json` (reinstall if tunneling and it's missing).
- **Installed builds** (dev client + TestFlight) on the physical test phone.

## DSA distribution plan and build 36 follow-up (2026-11-12)

Owner confirms TestFlight only for now; see TODO’s future EU App Store launch gate for reassessment before expanding distribution. This records intent, not completion of the declaration in Apple’s UI. Apple explicitly treats TestFlight-only distribution as not acting as a trader on the App Store in its [DSA criteria](https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements/).

EAS build `70771a46-d436-4d5a-8eb2-98bfbf5625c2` (1.0.15 / 36) and automatic submission `c777ddf1-bf03-4475-ba3a-f36476c233e5` both now report `FINISHED`, with no submission error. This supersedes the queued status above and the earlier agreement blocker for this upload; it does not confirm tester availability, adoption, native QA or which Apple account requirement changed. Owner subsequently confirmed the replacement rollout and PR #83 completed retirement (see below).

## Offline launch asks for alias again (2026-11-12)

Root cause in 1.0.15: `useProfileGate` clears persisted `alias` on profile-fetch errors, then navigation treats it as incomplete onboarding. The existing account is intact. Reconnecting and saving from that mistaken screen can rename the same account because own-alias updates are allowed; it does not create a new identity. Database RLS restricts profile updates to the owner and the alias uniqueness index rejects duplicates.

Source fix preserves an existing same-account alias on failure, waits for auth restoration, and offers profile retry when no cached alias is available. Reconnection retries the lookup; switching accounts clears alias/settings and late lookups/saves cannot populate another account’s cache. 154 Jest tests and TypeScript pass; two isolated staging JWT accounts verified own rename, duplicate denial and cross-account alias/snapshot/advice isolation, then were deleted. Simulator UI was unavailable because no runtime is installed. The fix is compiled in 1.0.16 (37), EAS build `41c1a64e-ac8a-480f-a72a-5ff377edce5e`, source/tag `781bf582` / `v1.0.16-build37`. Apple upload `35b18e69-b469-498b-bf5a-f8a0797d2f7a` is `FINISHED` without an error (rechecked 2026-11-12); TestFlight install visibility and physical cold-start retest remain pending.

Owner confirms all important users on 1.0.15 and both successful refresh and retained tips on in-session airplane-mode refresh. This supersedes unconfirmed availability for those users; remaining native checks are in TODO. Reviewing 1.0.12 source (`110b1a38`) shows guidance is read-only there; removing nightly generation cannot make it write guidance. Old clients still make ordinary own-account/social writes under current database permissions, so do not promise they are entirely read-only.

## Nightly guidance retirement — rollout gate met (2026-11-12)

Draft PR #83 was initially held because builds 34/35 failed Apple upload with `EAS_ASC_REQUIRED_AGREEMENTS_MISSING_OR_EXPIRED`. Build 36 subsequently built/uploaded; owner now confirms all important users on 1.0.15 and working refresh, and accepts loss of fresh tips for older clients. The prior hold is resolved. The owner’s earlier request to remove the unnecessary nightly job now proceeds through Database deploy; never apply manual production SQL.

Migration `20261111211000` removes only `nightly-cycle-guidance`. Existing saved advice, tables, claim/complete RPCs, edge function and `daily-phase-change-reminder` stay. Builds <=1.0.12 can keep reading saved tips but cannot generate replacements; they must update to the on-demand client (minimum 1.0.13/34; validated 1.0.15/36) for fresh advice. Read-only build-33 source review plus two isolated staging accounts found no guidance-write path in the old client; current RLS also filters cross-account profile/snapshot writes. This is a narrow compatibility assessment, not a guarantee that all old-client behavior is bug-free. Local SQL fixture and PR security checks pass. [Database deploy run 43274996960](https://github.com/kratijain2631/period-app/actions/runs/43274996960) applied `20261111211000` to staging, passed all 75 staging access checks, then applied production. Post-deploy read-only metadata confirms nightly guidance absent and `daily-phase-change-reminder` active at 15:00 UTC in both projects.

**Checklist reconciliation (2026-11-12):** the earlier request to redeploy legacy `cycle-guidance` is superseded by retiring its scheduled caller. No redeploy was claimed. Current on-demand generation already uses accepted-friend RPCs. If the old batch is ever re-enabled, deploy its current source and repeat staging validation first. The missing-`friend_sharing` Circle UI check remains open for engineering; account-holder DSA UI confirmation and phone contacts/accessibility checks remain in TODO.

## Offline feed and contacts follow-up (2026-11-12)

Owner confirms 1.0.16 installed, force-close/offline alias retest works and current DSA declaration resolved. The next source change makes an empty disconnected Home feed say “You’re offline”; it keeps loaded items and does not alter fetching/queues/backend state. A new native build is needed for this copy.

Shaan does not appear after removal. Phone-only contact cards cannot match on 1.0.16. Adding an email and relaunching with Full Contacts access still did not match; Shaan’s exact account-email equality/private-relay address and discoverability remain unconfirmed. Two isolated staging JWT accounts matched through the legacy email RPC before/after friendship removal, so removal itself is not a backend exclusion in that tested path. Do not read or expose someone’s private email to diagnose this; have them confirm the account email and preference.

Phone/email discovery is already documented as the unreleased 1.0.17 candidate. Its release run stopped before EAS because the repository `EXPO_TOKEN` secret was absent; SMS delivery/device checks remain open. Rerunning an old workflow run builds its original commit. To include the later offline-feed fix, start a new release run from the merged source after release prerequisites are satisfied; do not claim this copy ships merely because the old run is retried.

## Widget preview appears blank or cannot be reached

Start Expo from the repository root using the [preview instructions](../design-mocks/home-widgets/README.md), then open the preview HTML on that server. The HTML, JavaScript bundle and fonts must use the same port. A second static file server can display an empty page when the font loader requests assets from another origin.

## Hosted SMS prerequisite - verified 2026-11-12

Read-only public Auth settings on staging and production report phone auth disabled (`external.phone=false`), with phone and mail auto-confirm false. Normal JWT phone change on an isolated staging user returned HTTP 500 / `unexpected_failure`; its exact cause was not diagnosed. Configure a supported SMS provider and enable verification, then repeat real delivery, wrong-code, resend and valid confirmation checks with an authorized number before mandatory phone onboarding ships. Email-change confirmation needs a controlled inbox. No configuration was changed or real delivery verified here.

Two isolated staging accounts passed v2 matching and changed confirmed identifier/readback checks with Admin-simulated verification, then were deleted. Thirty contact service/controller tests pass but OS responses are mocked. No simulator runtime is installed; native permission/Settings selection tests remain open. TESTING contains results and short VoiceOver/larger-text/Health instructions.

## Contact verification delivery and guidance on staging, 2026-11-13

Both hosted Auth configurations were read without changing them. The email provider is enabled, custom SMTP and the send-email hook are absent, secure email change is enabled, and the default Site URL points to localhost. Supabase’s shared sender restricts delivery to organization-team addresses. A successful API request alone cannot establish inbox delivery. Phone authentication was disabled on both projects at that check. A later staging check reported it enabled. Delivery to a real phone still needs verification. Production has Apple sign-in enabled.

Use a verified From address on a domain you control, configure a transactional mail provider in each target project and set the Site URL or an allowed redirect to a reachable confirmation page. Register the sender with Apple and authenticate the domain for users of Hide My Email. Test the current and replacement inboxes and return to Settings. [Supabase email sender setup](https://supabase.com/docs/guides/auth/auth-smtp) · [Apple private email relay registration](https://developer.apple.com/help/account/capabilities/configure-private-email-relay-service).

Fresh guidance generation returned HTTP 503 with an isolated staging JWT. At that first check, staging had no `OPENAI_API_KEY`. The owner subsequently added the secret. Two fresh requests with disposable staging accounts returned HTTP 503, and the function logged OpenAI HTTP 429. Check the OpenAI project’s billing and rate limits, then retry with a signed-in staging account. Cached advice, refresh claims, cooldown and authorization checks passed. The owner separately confirmed production refresh on their phone. To replace the staging key, use the saved production OpenAI key or create a separate key on the [OpenAI API keys page](https://platform.openai.com/api-keys). A shared key uses the same OpenAI project for both environments. Open [staging Edge Function Secrets](https://supabase.com/dashboard/project/rntqwmptuavqnbjovnae/functions/secrets), enter `OPENAI_API_KEY` as the name and the key as the value, and save. The hosted function picks up the secret without a TestFlight build. Verify with a signed-in staging persona with a known phase in You → Phase Guide → Refresh tips. Allow two minutes if the last request was recent.

## Account email changes are paused

Setup and Settings display the account email read-only. The code-entry form and email template are retained. Once deployed, the `pause_account_email_changes` trigger on `auth.users` rejects new requests and changes to the stored address, including confirmations started before deployment. Initial account creation and phone verification remain available. Older builds may still display Change and receive an Auth error.

The [November 13 account setup mockups](../design/2026-11-13/account-setup/) predate this pause and show the earlier proposed Settings copy.

Before restoring this feature, require fresh account-owner authentication on the server and test requests from an older client on staging. Remove the trigger in a new migration and enable `EMAIL_CHANGES_ENABLED` in ContactDetails only as part of that rollout. Verify delivery and code entry with a controlled new inbox.
