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

## Onboarding a teammate / running local dev builds

No secrets are in the repo, so a new contributor has to set a few things up before they can run the app locally.

**What's committed vs. what isn't:**
- **Not committed (secrets):** Supabase keys (publishable *and* service_role) and the DB password live in `.env` (gitignored) and EAS env vars. Apple ID password, signing certificates, and private keys live in EAS / macOS Keychain. **None are in the repo.**
- **Committed (non-secret identifiers):** `app.config.ts` holds the EAS owner (`kratijain26`), EAS project id, and bundle id — standard and unavoidable in any Expo config. `IDENTIFIERS.md` additionally lists the Apple Team ID (`8AMCNWFZ39`) and Supabase project ref (`mmomoyszozclfjdvjbeb`). These are identifiers, not credentials — they can't access anything without real auth.

**To run local dev builds, a teammate needs:**
1. **Clone + install:** `git clone …` then `npm install`.
2. **Create their own `.env`** (gitignored — copy the keys, never commit it):
   - `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` — from the Supabase dashboard (Project Settings → API) if they have access to the shared project, or from their own Supabase project.
   - `EXPO_PUBLIC_DEV_AUTH=true` — enables the email/password dev login so they can sign in without Sign in with Apple during development.
3. **Access to build/run:**
   - **EAS:** be added as a member of `@kratijain26/period-app`, or use their own EAS account (`eas init`).
   - **A dev client on their device:** dev builds are **device-locked**, so they need a dev client built with *their* iPhone's UDID registered — either the owner registers their device and rebuilds, or they build their own under their own Apple account (`eas build --profile development --platform ios`).
   - **Supabase:** access to the shared project, or their own with the `supabase/migrations/` applied *and* the Apple provider configured (bundle id in Client IDs, or Sign in with Apple fails with "unacceptable audience").
4. **Start Metro:** `npx expo start --dev-client --tunnel` (tunnel avoids LAN restrictions), then open the dev client and load the `…exp.direct` URL.

## Key URLs

- **Privacy policy (temporary):** https://claude.ai/code/artifact/ff7fefe2-3ece-4373-bb51-3c60bdfb8bec — a Claude artifact. Move to a permanent host before public launch (see [TODO.md](TODO.md)).
- **Expo project:** https://expo.dev/accounts/kratijain26/projects/period-app
- **Supabase project:** https://supabase.com/dashboard/project/mmomoyszozclfjdvjbeb
- **App Store Connect:** https://appstoreconnect.apple.com

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
