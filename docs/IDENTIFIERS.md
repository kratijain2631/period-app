# Names & identifiers

Every name and identifier used across this project, where it lives, and how costly it is to change. The **display name** is fully modular — change one constant. The rest are documented here so nobody has to hunt for them.

## Quick reference

The key identifiers, all in one place. Details, change-cost, and warnings are in the sections below.

| Identifier | Current value | Where to change it |
|------------|---------------|--------------------|
| Display name | `Cadence` | `app.config.ts` → `APP_NAME` |
| iOS bundle id | `com.syncsisters.cycle` | `app.config.ts` → `IOS_BUNDLE_ID` (⚠️ costly) |
| Deep-link scheme | `cadence` | `app.config.ts` → `SCHEME` |
| EAS slug | `period-app` | `app.config.ts` → `SLUG` (⚠️ must match server) |
| EAS owner | `kratijain26` | `app.config.ts` → `EAS_OWNER` |
| EAS project id | `2cd3e909-0079-4c58-9308-ca3262bef969` | `app.config.ts` → `EAS_PROJECT_ID` (managed by EAS) |
| npm package name | `period-app` | `package.json` → `name` |
| GitHub repo | `kratijain2631/period-app` | GitHub settings + `git remote` |
| Supabase project ref | `mmomoyszozclfjdvjbeb` | `.env` + EAS env vars |

## Display name (user-facing)

| What | Value | Where | Change cost |
|------|-------|-------|-------------|
| App display name | `Cadence` | `app.config.ts` → `APP_NAME` | **Easy.** One line. Drives the home-screen name, Health permission prompts, and all in-app text (via `app/config/branding.ts`). Rebuild to apply the native parts. |

Changing `APP_NAME` in `app.config.ts` renames the app everywhere **user-visible in the app**. Static text *outside* the app also mentions the name but can't reference `APP_NAME` — update those by hand on a rename:

- `README.md` title (`# Cadence`)
- Planning docs in `thoughts/`, `prompts/`, `implementation-docs/`, `overall/`
- The published privacy policy

(Markdown and docs can't execute code, so there's no way to make them modular — they're listed here so a rename doesn't miss them.)

## Apple / iOS

| What | Value | Where | Change cost |
|------|-------|-------|-------------|
| iOS bundle identifier | `com.syncsisters.cycle` | `app.config.ts` → `IOS_BUNDLE_ID` | **Do not change.** Wired to the Apple App ID, signing credentials, and the Supabase Apple sign-in provider. Invisible to users. |
| Apple App ID (in use) | `com.syncsisters.cycle` (portal name `kratijain26periodapp`) | Apple Developer portal | Managed by EAS. |
| Apple App ID (orphan) | `com.syncsisters.app` (portal name `Sync Sisters`) | Apple Developer portal | Unused — created by hand, not referenced anywhere. Safe to delete in the portal. |
| Apple App ID (not ours) | `com.cadence.cycle` | Apple Developer portal | Belonged to the original collaborator (Lukas). Not used by this app. |
| Apple team | `Krati Jain (Individual)` · `8AMCNWFZ39` | Apple Developer account | Fixed. |
| Supabase Apple provider Client ID | `com.syncsisters.cycle` | Supabase dashboard → Auth → Providers → Apple | Must match `IOS_BUNDLE_ID` or sign-in fails ("unacceptable audience"). |

## Android

| What | Value | Where | Change cost |
|------|-------|-------|-------------|
| Android application id | _unset (iOS-only)_ | `app.config.ts` → `ANDROID_PACKAGE` | Intentionally not set — no Android build exists. Set a unique, permanent id here before any Google Play release (can never change once published). |

## Expo / EAS

| What | Value | Where | Change cost |
|------|-------|-------|-------------|
| EAS slug | `period-app` | `app.config.ts` → `SLUG` | Tied to the EAS project — change only with care. |
| EAS owner (account) | `kratijain26` | `app.config.ts` → `EAS_OWNER` | Fixed to the account that owns the project. |
| EAS project id | `2cd3e909-0079-4c58-9308-ca3262bef969` | `app.config.ts` → `EAS_PROJECT_ID` | **Do not hand-edit.** Managed by `eas init`. |
| EAS project name | `@kratijain26/period-app` | expo.dev | Derived from owner + slug. |

## Deep-link scheme

| What | Value | Where | Change cost |
|------|-------|-------|-------------|
| URL scheme | `cadence` | `app.config.ts` → `SCHEME` | Cosmetic. Safe to change — only affects deep links, none of which are external yet. |

## Repo / package (organizational — not user-facing)

| What | Value | Where | Change cost |
|------|-------|-------|-------------|
| npm package name | `period-app` | `package.json` → `name` | Internal. Safe to rename. |
| GitHub repo | `kratijain2631/period-app` | GitHub + `git remote` | Rename in GitHub settings, then update the local remote. Organizational only. |
| README title | `# Cadence` | `README.md` | Docs — **static; update by hand on a rename** (markdown can't reference `APP_NAME`). |

## Backend

| What | Value | Where | Change cost |
|------|-------|-------|-------------|
| Supabase project ref | `mmomoyszozclfjdvjbeb` | `.env` (gitignored) + EAS env vars | Changing means pointing at a different Supabase project (URL + key). |

## Cosmetic leftovers (don't ship, safe to ignore or clean up)

- The old name **"Cycle Companion"** still appears in planning/design docs: `thoughts/`, `prompts/`, `implementation-docs/`, `overall/`, and the filename `supabase/tests/rls-cycle-companion.sql`. None of these compile into the app or are user-visible.
- Tagline: **"Where your cycle meets your circle"** (`README.md`).

## Rule of thumb

- **Display name** → edit `APP_NAME`, done.
- **Cosmetic identifiers** (scheme, npm name, repo, docs) → safe to change; nobody sees them but you.
- **Costly / do-not-touch** (iOS bundle id, EAS project id) → leave alone; changing them means redoing Apple/Supabase/EAS setup.
