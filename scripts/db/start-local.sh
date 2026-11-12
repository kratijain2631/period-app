#!/usr/bin/env bash
# Starts a local Supabase in Docker with only the services the access-rule checks need, then
# rebuilds the database from every migration in the repo.
set -euo pipefail

start() {
  supabase start -x realtime,storage-api,imgproxy,mailpit,postgres-meta,studio,edge-runtime,logflare,vector,supavisor
}

# GitHub's runners occasionally fail to bind the database port on the first try ("address
# already in use"). Clean up and try once more; a second failure is a real failure.
if ! start; then
  echo "Starting Supabase failed; stopping and retrying once."
  supabase stop --no-backup || true
  sleep 5
  start
fi
supabase db reset --local
