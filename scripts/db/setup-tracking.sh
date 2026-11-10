#!/usr/bin/env bash
# One-time setup of the migration history on a database whose migrations were pasted by
# hand. Used by .github/workflows/database-setup.yml.
#
#   DB_URL=<target> REFERENCE_DB_URL=<staging> EXPECTED_PENDING="<version> ..." \
#     scripts/db/setup-tracking.sh <name>
#
# Marks every repo migration except EXPECTED_PENDING as applied, without running them. It
# refuses unless the target has no history yet and its schema fingerprint matches the
# reference, which is already on db push. function_acl is allowed to differ, because the
# no-login cleanup is one of the pending migrations.
set -euo pipefail

name="${1:?usage: setup-tracking.sh <name>}"
: "${DB_URL:?DB_URL is not set}"
: "${REFERENCE_DB_URL:?REFERENCE_DB_URL is not set}"
expected="$(echo "${EXPECTED_PENDING:-}" | tr ' ,' '\n\n' | grep -E '^[0-9]{14}$' | sort -u || true)"
here="$(cd "$(dirname "$0")" && pwd)"
migrations="$here/../../supabase/migrations"

# Postgres checks every table a query names before running it, so the count has to be a
# separate query that only runs once the history table is known to exist.
tracked=0
if [ "$(psql "$DB_URL" -Atq -v ON_ERROR_STOP=1 -c "select to_regclass('supabase_migrations.schema_migrations') is not null")" = "t" ]; then
  tracked="$(psql "$DB_URL" -Atq -v ON_ERROR_STOP=1 -c "select count(*) from supabase_migrations.schema_migrations")"
fi
if [ "$tracked" -ne 0 ]; then
  echo "::error::$name already has $tracked migrations recorded. This setup only runs once."
  exit 1
fi

for version in $expected; do
  ls "$migrations/${version}_"*.sql >/dev/null 2>&1 || { echo "::error::No migration file for $version."; exit 1; }
done

fingerprint() {
  psql "$1" -Atq -F ' ' -v ON_ERROR_STOP=1 -f "$here/fingerprint.sql" | grep -v '^function_acl '
}
target_print="$(fingerprint "$DB_URL")"
reference_print="$(fingerprint "$REFERENCE_DB_URL")"
if [ "$target_print" != "$reference_print" ]; then
  echo "::error::$name's schema doesn't match the reference. Nothing was changed."
  diff <(echo "$reference_print") <(echo "$target_print") | sed 's/^</reference:/; s/^>/'"$name"':/' || true
  exit 1
fi
echo "$name matches the reference apart from function access."

to_mark="$(ls "$migrations" | grep -oE '^[0-9]{14}' | sort -u | grep -vxF -f <(echo "$expected"; echo none) || true)"
echo "Marking $(echo "$to_mark" | grep -c .) migrations as applied."
# shellcheck disable=SC2086
supabase migration repair --db-url "$DB_URL" --status applied $to_mark --yes 2>&1 | sed "/postgres/d"

pending="$(supabase db push --db-url "$DB_URL" --dry-run 2>&1 | grep -oE '[0-9]{14}' | sort -u || true)"
if [ "$pending" != "$expected" ]; then
  echo "::error::After setup, $name would apply: ${pending:-nothing}. Expected: ${expected:-nothing}."
  echo "To undo the setup: supabase migration repair --db-url <url> --status reverted <versions>"
  exit 1
fi
echo "$name is set up. Pending: ${expected:-nothing}. The next database deploy applies it."
