#!/usr/bin/env bash
# Fails a PR that changes the app, database or tooling without a line in docs/RELEASE_NOTES.md.
# See docs/INSTRUCTIONS.md §1. Usage: check-docs.sh <base-sha> <head-sha>
set -euo pipefail
base="$1"; head="$2"
changed=$(git diff --name-only "$base"..."$head")

# Changes that need a release-notes line: anything except docs, Markdown and repo meta files.
needs_notes=$(printf '%s\n' "$changed" | grep -vE '^(docs/|.*\.md$|\.github/pull_request_template\.md$|\.gitignore$)' || true)

if [ -z "$needs_notes" ]; then
  echo "Docs-only change; no release-notes line needed."
  exit 0
fi

if printf '%s\n' "$changed" | grep -qx 'docs/RELEASE_NOTES.md'; then
  echo "RELEASE_NOTES.md is updated."
else
  echo "::error::This PR changes these files but not docs/RELEASE_NOTES.md:"
  printf '  %s\n' $needs_notes
  echo "Add a line under '## Unreleased' (docs/INSTRUCTIONS.md §1), or add the 'no-release-notes' label if it truly needs none."
  exit 1
fi

# Reminders for docs that usually move with certain changes. These warn, they don't fail.
warn() { echo "::warning::$1"; }
if printf '%s\n' "$changed" | grep -q '^supabase/migrations/' && ! printf '%s\n' "$changed" | grep -qx 'docs/SCHEMA.md'; then
  warn "A migration changed but docs/SCHEMA.md didn't. Update it if tables, functions or access rules changed."
fi
if printf '%s\n' "$changed" | grep -qE '^(scripts/test-accounts/|packages/domain/testing/)' && ! printf '%s\n' "$changed" | grep -qE '^docs/(TESTING|TEST_ACCOUNTS)\.md$'; then
  warn "Test-account tooling changed but docs/TESTING.md and docs/TEST_ACCOUNTS.md didn't."
fi
if printf '%s\n' "$changed" | grep -q '^\.github/workflows/' && ! printf '%s\n' "$changed" | grep -qE '^docs/(DB_PUSH|TROUBLESHOOTING|TESTING)\.md$'; then
  warn "A workflow changed. Check DB_PUSH.md, TROUBLESHOOTING.md or TESTING.md still describe it."
fi
