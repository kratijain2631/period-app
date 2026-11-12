#!/usr/bin/env bash
# Seeds the test personas into the local Supabase and runs the access-rule checks against it.
# Uses the local stack's own keys; refuses anything that isn't a localhost URL.
set -euo pipefail

eval "$(supabase status -o env | grep -E '^(API_URL|ANON_KEY|SERVICE_ROLE_KEY)=')"
export API_URL ANON_KEY SERVICE_ROLE_KEY
export TEST_ACCOUNTS_TARGET=local
# Only for this throwaway database.
TEST_PERSONA_PASSWORD="local-$(openssl rand -hex 12)"
export TEST_PERSONA_PASSWORD

npm run --silent test-accounts:seed
npm run --silent test-accounts:rls
