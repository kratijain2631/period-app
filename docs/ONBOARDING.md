# Onboarding

How to get set up to run and contribute to this app.

## Access checklist

Ask the project owner for:
- [ ] **GitHub repo** — collaborator access to the private repo (`kratijain2631/period-app`).
- [ ] **Supabase dashboard** — invited as a **member** of the project (to see tables, edge functions, logs).
- [ ] **EAS / Expo account** — added as a **member** of `@kratijain26/period-app` so you can run builds (or use your own Expo account). *(EAS is Expo's build service — same login as your Expo account.)*
- [ ] **Apple Developer / App Store Connect** — only if you'll build/sign or submit. To just *test*, you don't need this.
- [ ] **Register your device UDID** — for **dev builds** (they're device-locked; the owner registers your iPhone, or you build your own).
- [ ] **Download TestFlight** (App Store) — to install **test builds** (no keys needed, just an invite link).

## Local setup (to run a dev build)

1. **Clone + install:** `git clone …` then `npm install`.
2. **Create a gitignored `.env`** (never commit it) with:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://mmomoyszozclfjdvjbeb.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_9EVAMPWcOlrwW93fQZoFnQ_rFBB_65X
   EXPO_PUBLIC_DEV_AUTH=true
   ```
   The publishable key is **client-side** — it ships inside the app anyway, so it's safe to share. `EXPO_PUBLIC_DEV_AUTH=true` enables the email/password dev login so you can sign in without Sign in with Apple during development.
3. **Get a dev build on your device** (device-locked): the owner registers your UDID and shares a build, or you build your own (`eas build --profile development --platform ios`).
4. **Start Metro:** `npx expo start --dev-client --tunnel`, then open the dev client and load the `…exp.direct` URL.

## What's committed vs. not (secrets)

- **Not committed (secrets):** the `service_role` key and DB password (in `.env` / EAS env vars); Apple ID password, signing certs, private keys (EAS / macOS Keychain); the OpenAI key (Supabase secret). **Never commit these.**
- **Committed (non-secret):** the Supabase URL + publishable key (above, client-safe), and identifiers in `app.config.ts` / [IDENTIFIERS.md](IDENTIFIERS.md).

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for accounts/access details and what can expire.
