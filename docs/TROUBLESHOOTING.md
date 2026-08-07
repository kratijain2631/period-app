# Troubleshooting & operations

Everything learned bringing this app up: the issues we hit and fixed, what's configured where, what can expire or break, and the accounts you need. Read this before debugging a build, a sign-in failure, or an expiry.

## Accounts & access you need

| Service | Account | What it's for | Notes |
|---|---|---|---|
| Apple Developer Program | `kratij@gmail.com` — team "Krati Jain" (`8AMCNWFZ39`), Individual | App IDs, signing, capabilities | $99/year, renews annually |
| App Store Connect | same Apple ID | TestFlight, App Store, review | EAS authenticates via an App Store Connect API key (App Manager role) |
| Expo / EAS | `kratijain26` (a second account `kratijain2631` also exists) | Cloud builds, credentials, env vars | Project: `@kratijain26/period-app` |
| Supabase | account owning project `mmomoyszozclfjdvjbeb` | Auth + Postgres database | Free tier pauses on inactivity |
| GitHub | `kratijain2631/period-app` (private) | Source | — |

> **The paid Apple Developer Program ($99/year) is required for TestFlight.** A free Apple ID cannot distribute builds at all — no TestFlight, no App Store, and no installing signed builds on physical devices via EAS. The membership must be active (it renews annually); if it lapses, builds can't be signed or distributed until it's renewed.

The original collaborator's (Lukas's) accounts are **no longer needed** — we migrated everything to the accounts above. Note: this Apple ID is still a *member* of Lukas's Apple team, so at build time EAS shows two "providers" — always pick **Krati Jain (129196348)**, not Lukas.

## Migrations: hand-applied — do NOT `supabase db push` blindly

Migrations are applied **by hand in the Supabase SQL editor** (paste the file, Run), *not* via `supabase db push`. Consequence: Supabase's migration-tracking table (`supabase_migrations.schema_migrations`) does **not** record them, so the CLI thinks nothing is applied.

- **The schema is correct** — every migration file has been run. This is only a *CLI-tracking* gap, not a schema gap.
- **⚠️ Do not run `supabase db push` without reconciling first.** It would try to re-run **all** migrations. Most are idempotent and survive, but **`seed-posts.sql` would re-insert demo data** and cron/seed statements could duplicate or error.
- **Confirmed 2026-08-02:** `supabase_migrations.schema_migrations` **does not exist** on the project (querying it errors `42P01: relation does not exist`) — proof the DB was *never* built via `db push`, only hand-applied. So there's no partial tracking state to untangle.
- **To adopt `db push` going forward** (optional, post-beta — tracked in [TODO.md](TODO.md)): the reconciliation is to **create** the tracking table and **populate** it with all 25 current migration versions so the CLI sees them as applied. Simplest: `supabase link` the project, then `supabase migration repair --status applied <version>` for each file (that creates + fills the table); or create `supabase_migrations.schema_migrations` and insert the version rows by hand. After that, `db push` is a no-op and new migrations flow through it cleanly. Also required for crons: the vault secrets `project_url` + `publishable_key` must exist (`select vault.create_secret(...)`), or every scheduled `net.http_post` fails with a null-url error.
- **Friend-cycle migration mismatch (2026-08-06):** `20260729000000_friend-cycle-summary-privacy.sql` was applied live but never committed to `main`, while builds through 1.0.10 continued selecting raw cycle tables. The source/client port is now restored. Run only `20260806000000_legacy-friend-cycle-read-compat.sql` in the SQL editor to refresh the safe summary fields and temporarily restore legacy-build access; do not rerun the July migration and do not use `db push`. Retire the temporary raw-table policies after old builds are no longer supported.

## Build & submission gotchas

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
| `EXPO_PUBLIC_DEV_AUTH` | `.env` only | `true` — enables the dev email/password login, which only renders in `__DEV__` builds |
| Supabase Apple provider Client IDs | Supabase dashboard → Authentication → Providers → Apple | **must** include `com.syncsisters.cycle` |
| DB schema / migrations | Supabase (applied via the SQL editor) | includes `delete_account()` + table grants |

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
| EAS build quota (free tier) | monthly | Builds queue or block | Wait for reset or upgrade the Expo plan |
| Metro tunnel URL (`…exp.direct`) | changes when Metro restarts | Dev client can't connect | Re-enter the new URL in the dev client |
| Supabase publishable key | if rotated | Auth/API calls fail | Update `.env` **and** the EAS env var |

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

## State that lives OUTSIDE git (not versioned — back up / remember separately)

- **`.env`** (gitignored): Supabase URL + publishable key + `EXPO_PUBLIC_DEV_AUTH`.
- **EAS environment variables** (on Expo's servers): the two `EXPO_PUBLIC_SUPABASE_*` values for `production`.
- **Supabase project config:** the Apple provider Client IDs, the applied database schema/migrations, and all app data.
- **Apple signing credentials** (certificate + provisioning profiles): stored by EAS / macOS Keychain.
- **App Store Connect API key:** stored by EAS.
- **Privacy policy:** hosted as a Claude artifact (not in the repo).
- **`@expo/ngrok`:** installed with `--no-save` for tunneling, so it's in `node_modules` but not `package.json` (reinstall if tunneling and it's missing).
- **Installed builds** (dev client + TestFlight) on the physical test phone.
