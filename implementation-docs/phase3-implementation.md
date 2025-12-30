# Phase 3 - Supabase Auth & Token Exchange Implementation Plan

Goal: replace the client-only Sign in with Apple session with a real Supabase-authenticated session so RLS-backed data access and token refresh work reliably. Sources: SSOT section 3, architecture notes, Task 2 handoff.

## 1. Supabase auth configuration
- [x] Enable Apple provider in Supabase and set Service ID, Team ID, Key ID, and private key settings.
- [x] Confirm redirect URI (`https://xgwcqfhkuktjfgprgkjf.supabase.co/auth/v1/callback`), bundle ID, and nonce requirements align with the Expo app.
- [x] Capture `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` in local `.env` plus EAS envs for dev/preview/prod.

## 2. Supabase client + session storage
- [x] Install `@supabase/supabase-js` and add `app/services/supabase/client.ts` to create a singleton client.
- [x] Configure auth storage (AsyncStorage), auto-refresh, and `getSession` helpers.
- [x] Add wrapper utilities for sign-in/sign-out to centralize error handling and logging hygiene.

## 3. Real SIWA token exchange
- [x] Update `app/services/auth/appleAuth.ts` to generate a nonce and send its hash to Apple.
- [x] Exchange the identity token with Supabase (`signInWithIdToken` for provider `apple`) and map the returned session into `sessionStore` (user id, access token, refresh token, expires_at).
- [x] Remove usage of `identityToken` as the app session token and avoid logging raw credentials.

## 4. Session lifecycle + navigation
- [x] Add a bootstrap hook to load `supabase.auth.getSession()` on startup and sync `sessionStore`.
- [x] Subscribe to `supabase.auth.onAuthStateChange` to update tokens and clear state on sign-out.
- [x] Update `AppNavigator` gating to show a loading state while session hydration runs and to handle expired sessions.

## 5. Backend user row + RLS readiness
- [x] Upsert the `users` table on first sign-in using `auth.uid()` and store Apple user identifiers plus profile fields when available.
- [x] Add migration for `public.users` table, auth trigger, and RLS policies (`supabase/migrations/20251229213000_create-users.sql`) and push to Supabase.
- [ ] Validate RLS policies rely on `auth.uid()` and that unauthenticated requests are rejected (smoke test still needs to be run).

## 6. Testing + QA
- [x] Unit tests for auth exchange and session store updates (mock Supabase client responses).
- [x] Manual dev-client run: sign in with Apple, confirm user appears in Supabase `auth.users`, and session persists on restart.
- [x] Expo Go dev auth (email/password) usable via dropdown selector for local testing.
- [x] RLS smoke test helper added (`runUsersRlsSmokeTest`) to attempt a protected query with and without a valid session.
- [ ] Execute the smoke test against the live project and record results.

## Key decisions
- Nonce hashing uses `js-sha256` + `crypto.getRandomValues` to avoid ExpoCrypto native dependency in Expo Go.
- Dev auth is gated behind a dropdown selector and can be forced in Expo Go via `EXPO_PUBLIC_DEV_AUTH=true`.
- Supabase session hydration runs at app boot with a blocking loading state to prevent flicker.
