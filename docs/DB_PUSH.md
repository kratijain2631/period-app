# Changing the database

Every database change is a migration file in `supabase/migrations/`. Merging it to `main` applies it automatically: the **Database deploy** workflow ([`.github/workflows/database.yml`](../.github/workflows/database.yml)) pushes it to staging, runs the security checks there, then pushes it to production. Don't paste SQL into the dashboard's SQL editor, except in an emergency (see below).

| Project | Ref | Applied by |
|---|---|---|
| Staging | `rntqwmptuavqnbjovnae` | The Database deploy workflow (tracking set up 2026-11-08) |
| Production | `mmomoyszozclfjdvjbeb` | The Database deploy workflow (tracking set up 2026-11-11, see [below](#production-one-time-setup)) |

## Making a change

1. **Write the migration.** Add `supabase/migrations/<YYYYMMDDHHMMSS>_<what-it-does>.sql`, timestamped later than every existing file. Follow the migration rules in [INSTRUCTIONS.md](INSTRUCTIONS.md) §12 (additive only), and make it safe to re-run where you can.
2. **Grant function access explicitly.** New functions are callable only by logged-in users and the service role. Write `grant execute ... to authenticated` only when the app needs to call the function, and add a `revoke` when a function is server-only. Nothing should be callable without a login.
3. **Test it locally in Docker.** `npm run test:security` rebuilds a database from every migration, seeds the personas and runs the access-rule checks.
4. **Open a PR.** The **Security checks** workflow runs the same thing on the PR, with no secrets and nothing touching staging or production. Merge once it's green.
5. **Watch the Actions tab.** The Database deploy run shows which migrations it applied to each project. If anything fails, it stops before production and GitHub emails whoever merged.
6. **Record it in [RELEASE_NOTES.md](RELEASE_NOTES.md)** in the same PR.

## What the workflow does

On every push to `main` that changes `supabase/migrations/` (or when started by hand from the Actions tab):

1. **Staging.** Refuses if staging has no migration history. Lists what's pending, refuses more than 10 at once, then applies them.
2. **Security checks.** Runs `npm run test-accounts:rls` against staging. A failure stops the run here.
3. **Production.** Same as staging, inside the GitHub Environment `production`. To make production wait for an approval click, add required reviewers to that environment under **Settings → Environments → production**. No code change is needed.

The workflow applies migrations only. Edge functions are still deployed by hand: deploy a changed function to staging, test it, then deploy it to production.

Only one database run happens at a time. The Supabase CLI and every action are pinned to fixed versions. Database addresses and keys come from repository secrets, which GitHub hides in logs, and the scripts print only migration names.

## Secrets

These live under **Settings → Secrets and variables → Actions** on GitHub. All six were added between 2026-11-08 and 2026-11-11. Use the **Session pooler** URI for both databases: GitHub's runners can't reach the direct database host, which is IPv6-only, so a direct URI fails with a connection error. GitHub never shows a secret again after it's saved, so the values come from Supabase or your password manager.

| Secret | Contents |
|---|---|
| `STAGING_DB_URL` | Staging's **Session pooler** URI with the database password filled in |
| `PRODUCTION_DB_URL` | Production's **Session pooler** URI with the database password filled in |
| `STAGING_SUPABASE_URL` | `EXPO_PUBLIC_SUPABASE_URL` from `.env.staging` |
| `STAGING_SUPABASE_ANON_KEY` | `EXPO_PUBLIC_SUPABASE_ANON_KEY` from `.env.staging` |
| `STAGING_SUPABASE_SERVICE_ROLE_KEY` | `SUPABASE_SERVICE_ROLE_KEY` from `.env.staging` |
| `TEST_PERSONA_PASSWORD` | `TEST_PERSONA_PASSWORD` from `.env.staging` |

Each command below copies one value to the clipboard without showing it. Run it from the repo folder, click **New repository secret** on GitHub, paste and save, then do the next one.

**The two database addresses.** The database password is under **Database → Settings** in the dashboard; Supabase only shows it when you reset it, so keep it in a password manager. The Session pooler URI is under **Connect → Session pooler**. Run this once with staging's values, then again with production's:
```bash
read -rs "PW?Database password: "; echo; read -r "POOLER?Session pooler URI with [YOUR-PASSWORD] left in: "; PW="$PW" POOLER="$POOLER" node -e 'const u=process.env.POOLER;if(!u.includes("[YOUR-PASSWORD]"))throw new Error("leave [YOUR-PASSWORD] in the URI");process.stdout.write(u.replace("[YOUR-PASSWORD]",encodeURIComponent(process.env.PW)))' | pbcopy; unset PW POOLER; echo "Copied"
```

**The four staging values.** Change the name at the end to `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` or `TEST_PERSONA_PASSWORD`:
```bash
node -e 'const v=require("dotenv").parse(require("fs").readFileSync(".env.staging"))[process.argv[1]];if(!v)throw new Error("not in .env.staging");process.stdout.write(v)' EXPO_PUBLIC_SUPABASE_URL | pbcopy; echo "Copied"
```

When you're done, clear the clipboard:
```bash
pbcopy < /dev/null
```

## Production one-time setup

**Done on 2026-11-11.** The setup run marked 39 migrations as applied after production's fingerprint matched staging's in everything except function access. The first Database deploy run then applied `20261108180000` to production, and staging passed all 66 access checks. Three earlier attempts failed safely before changing anything: the direct host was unreachable (use the Session pooler), the history check broke on a database without history (fixed in #77), and the staging secret was malformed (#78 now names the bad secret). The steps are kept for the record, and the workflow refuses to run again on a database that already has history.

Production's migrations had been pasted by hand, so it had no migration history, and the Database deploy workflow refuses to touch a database without one.

1. Add all six secrets.
2. On GitHub, go to **Actions → Set up migration tracking (one time) → Run workflow**. Leave the pending version as `20261108180000`, the one migration production doesn't have yet.
3. The workflow ([`scripts/db/setup-tracking.sh`](../scripts/db/setup-tracking.sh)) refuses if production already has a history, or if its [fingerprint](../scripts/db/fingerprint.sql) differs from staging's in anything except function access. Otherwise it records every other migration as applied, without running any, and checks that the dry run lists exactly the pending one.
4. Then go to **Actions → Database deploy → Run workflow**. It applies the pending migration to staging (nothing to do there), runs the checks, and applies it to production.

## Emergencies: pasting SQL

If production is broken and can't wait for a PR, you can paste SQL into the SQL editor. Afterwards, the same day:

1. Add the same SQL as a migration file, safe to re-run, and open a PR.
2. Before merging, mark it as applied on the project where it was pasted, so the workflow doesn't run it there again. From the repo folder, with that project's address in `DB_URL`:
   ```bash
   supabase migration repair --db-url "$DB_URL" --status applied <version>
   ```
3. Merge. The workflow applies it to the other project.
4. Note it in RELEASE_NOTES.md.

## How staging was switched over (2026-11-08)

Every migration up to then had been pasted by hand, so staging had no tracking table. The owner checked that staging matched a rebuild from the repo, using [`scripts/db/fingerprint.sql`](../scripts/db/fingerprint.sql). They then ran `supabase migration repair --status applied` for every migration staging already had, checked that a dry run listed only `20261107015000_service-role-grants.sql`, and pushed it. The production setup workflow automates the same steps.
