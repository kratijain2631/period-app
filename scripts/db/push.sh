#!/usr/bin/env bash
# Applies pending migrations to one database. Used by .github/workflows/database.yml.
#
#   DB_URL=<session pooler URI> scripts/db/push.sh <name>
#
# Refuses a database whose migration history was never set up, because db push would then
# try to re-run every migration. Prints only migration versions, never the address.
set -euo pipefail

name="${1:?usage: push.sh <name>}"
: "${DB_URL:?DB_URL is not set}"
max_pending="${MAX_PENDING:-10}"

tracked="$(psql "$DB_URL" -Atq -v ON_ERROR_STOP=1 -c \
  "select case when to_regclass('supabase_migrations.schema_migrations') is null then 0
               else (select count(*) from supabase_migrations.schema_migrations) end")"
if [ "$tracked" -eq 0 ]; then
  echo "::error::$name has no migration history. Run the 'Set up migration tracking' workflow first (docs/DB_PUSH.md)."
  exit 1
fi
echo "$name: $tracked migrations already applied."

dry_run="$(supabase db push --db-url "$DB_URL" --dry-run 2>&1)" || { echo "$dry_run" | sed "/postgres/d"; exit 1; }
pending="$(echo "$dry_run" | grep -oE '[0-9]{14}_[^ ]+\.sql' || true)"
count="$(echo -n "$pending" | grep -c . || true)"

if [ "$count" -eq 0 ]; then
  echo "$name: nothing to apply."
  exit 0
fi
echo "$name: will apply $count migration(s):"
echo "$pending" | sed 's/^/  /'
if [ "$count" -gt "$max_pending" ]; then
  echo "::error::$name has $count pending migrations, more than the limit of $max_pending. Check its history before pushing."
  exit 1
fi

supabase db push --db-url "$DB_URL" --yes 2>&1 | sed "/postgres/d"
echo "$name: done."
