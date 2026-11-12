#!/usr/bin/env bash
# Starts a local Supabase in Docker with only the services the access-rule checks need, then
# rebuilds the database from every migration in the repo.
set -euo pipefail

supabase start -x realtime,storage-api,imgproxy,mailpit,postgres-meta,studio,edge-runtime,logflare,vector,supavisor
supabase db reset --local
