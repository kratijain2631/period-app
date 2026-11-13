#!/usr/bin/env bash
# Runs the rules lint, then seeds the test personas into the local Supabase and runs the
# attack matrix and the access-rule checks against it.
# Uses the local stack's own keys; refuses anything that isn't a localhost URL.
set -euo pipefail

eval "$(supabase status -o env | grep -E '^(API_URL|ANON_KEY|SERVICE_ROLE_KEY|DB_URL)=')"
export API_URL ANON_KEY SERVICE_ROLE_KEY DB_URL
export TEST_ACCOUNTS_TARGET=local
# Only for this throwaway database.
TEST_PERSONA_PASSWORD="local-$(openssl rand -hex 12)"
export TEST_PERSONA_PASSWORD

node scripts/security/lint.js
npm run --silent test-accounts:seed
npx jest -c jest.security.config.js
npm run --silent test-accounts:rls


# Exercise verified-phone matching in the disposable database.
psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/phone-contact-discovery.sql

psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/circle-rankings.sql
psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/one-request-per-pair.sql
psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/friendship-end-cleanup.sql
psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/paused-email-changes.sql
