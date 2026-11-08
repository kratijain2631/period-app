# Changing the database

Every database change is a migration file in `supabase/migrations/`, applied with `supabase db push`. Don't paste SQL into the dashboard's SQL editor, except in an emergency (see below).

| Project | Ref | On `db push`? | Who pushes |
|---|---|---|---|
| Staging | `rntqwmptuavqnbjovnae` | Yes, since 2026-11-08 | The owner, or an agent the owner asks |
| Production | `mmomoyszozclfjdvjbeb` | Not yet: see [Switching production over](#switching-production-over) | The owner only |

## Making a change

1. **Write the migration.** Add `supabase/migrations/<YYYYMMDDHHMMSS>_<what-it-does>.sql`, timestamped later than every existing file. Follow the migration rules in [INSTRUCTIONS.md](INSTRUCTIONS.md) §12 (additive only), and make it safe to re-run where you can.
2. **Grant function access explicitly.** New functions are callable only by logged-in users and the service role. Write `grant execute ... to authenticated` only when the app needs to call the function, and add a `revoke` when a function is server-only. Nothing should be callable without a login.
3. **Test it locally in Docker.** Run `supabase start`, then `supabase db reset --local`, which rebuilds from every migration. Check the result with SQL or the local API.
4. **Open a PR.** Merge it before pushing to production, so the repo always matches what's live.
5. **Push to staging and test** (below), including `npm run test-accounts:rls`.
6. **Push to production** (below, once production is switched over). Only the owner does this.
7. **Record it in [RELEASE_NOTES.md](RELEASE_NOTES.md)** with the date it reached each project.

## Pushing

Run these in Terminal from the repo folder, all in the same window. The database password is typed at a hidden prompt and never printed or saved. Keep it in a password manager, labelled with the project ref. It's under Dashboard → Database → Settings, and Supabase only shows it when you reset it.

`supabase link` doesn't work here (the CLI gets a 403 from the management API), so every command names the database with `--db-url`.

```bash
read -rs "PW?Database password: "; echo
```
```bash
read -r "POOLER?Session pooler URI from Dashboard > Connect, with [YOUR-PASSWORD] left in: "
```
Set `REF` to the project you're pushing to (staging shown):
```bash
REF=rntqwmptuavqnbjovnae
```
```bash
export DB_URL="$(PW="$PW" POOLER="$POOLER" REF="$REF" node -e 'const u=process.env.POOLER;if(!u.includes(process.env.REF)||!u.includes("[YOUR-PASSWORD]"))throw new Error("that URI is not for "+process.env.REF);process.stdout.write(u.replace("[YOUR-PASSWORD]",encodeURIComponent(process.env.PW)))')"; unset PW POOLER
```
```bash
supabase migration list --db-url "$DB_URL"
```
```bash
supabase db push --db-url "$DB_URL" --dry-run
```
Check that the dry run lists only the migrations you expect. Then:
```bash
supabase db push --db-url "$DB_URL"
```
```bash
unset DB_URL
```

The password appears in the local process list while each command runs, so only do this on your own machine.

## Emergencies: pasting SQL

If production is broken and can't wait for a PR, you can paste SQL into the SQL editor. Afterwards, the same day:

1. Add the same SQL as a migration file, safe to re-run.
2. Apply it to staging with `db push`, which runs it there too.
3. Mark it as applied on the project where it was pasted, so `db push` doesn't run it again:
   ```bash
   supabase migration repair --db-url "$DB_URL" --status applied <version>
   ```
4. Note it in RELEASE_NOTES.md and open a PR.

## How staging was switched over (2026-11-08)

Every migration up to then had been pasted by hand, so staging had no tracking table. To switch:

1. Check that the database matches a rebuild from the repo by running [`scripts/db/fingerprint.sql`](../scripts/db/fingerprint.sql) on both and comparing the hashes.
2. Mark every migration already applied as applied, without running it:
   ```bash
   supabase migration repair --db-url "$DB_URL" --status applied <version> <version> ...
   ```
3. Run a dry run. It should list only the migrations that genuinely haven't run yet. For staging that was `20261107015000_service-role-grants.sql`.
4. Run the real push, then check the fingerprint again.

## Switching production over (one time, not done yet)

**Stop and check with Claude (or whoever is maintaining this) before starting.** This is a one-time change to the live database, and the checks below have to be done in order.

Production uses the same steps as staging, done by the owner. Before starting:

- Production's fingerprint ([`scripts/db/fingerprint.sql`](../scripts/db/fingerprint.sql)) should match staging's. The no-login function access migration (`20261108180000`) must have reached production first, by pasting, so the remaining differences are gone.
- The owner needs production's database password. Don't reset it without checking whether anything connects to the database directly.
- Every migration in the repo is then already applied on production, so mark all of them as applied. `migration list` should show every version in both columns, and the dry run should list nothing.
