# Task 4 - Local Storage and TTL Implementation Plan

Goal: cache the latest cycle snapshot locally (SQLite) and hide stale data after 24 hours, so the feed and profile remain responsive offline and consistent with HealthKit sync timing. Sources: SSOT section 5 (Task 4), designs, requirements.

## 1. Dependencies and schema
- [x] Add `expo-sqlite` dependency.
- [x] Create `app/storage/sqlite/cycleSnapshotStore.ts` with on-demand table creation.
- [x] Define `cycle_snapshots` table with columns: `id` (primary key), `user_id`, `snapshot_json`, `last_synced_at`, `created_at`, `updated_at`.
- [x] Add an index on `user_id` to speed reads.

## 2. Store helpers
- [x] Implement lazy init via `ensureInitialized()` on first store call.
- [x] Add `upsertCycleSnapshot(userId, snapshot)` to overwrite the latest row.
- [x] Add `getLatestCycleSnapshot(userId)` returning the parsed snapshot.
- [x] Add `pruneStaleSnapshots(userId, ttlHours = 24)` plus `isSnapshotStale`.
- [x] Emit `CYCLE_SNAPSHOT_UPDATED` so UI hooks can refresh.

## 3. Sync integration
- [x] Update `syncHealthData.ts` to write the snapshot into SQLite and emit updates.
- [x] Keep `syncHealthData.ts` return value as the derived snapshot (stored copy now lives in SQLite).

## 4. Hook for consumers
- [x] Implement `app/features/feed/hooks/useCycleSnapshot.ts` to load from SQLite.
- [x] Apply TTL logic inside the selector: if `now - last_synced_at > 24h`, return `null`.
- [x] Revalidate when `syncHealthData` runs (event emitter refresh).

## 5. Testing and QA
- [x] Unit tests for store helpers (insert, read, TTL).
- [x] Jest time-based assertions for the 24h threshold.
- [ ] Manual QA: adjust device time and confirm the feed card hides, then re-sync to restore.

## Key decisions
- Store the snapshot as JSON (`snapshot_json`) to avoid repeated schema changes as fields evolve.
- Keep a single row per user and overwrite on each sync to simplify TTL behavior.
- TTL uses `last_synced_at` from HealthKit sync (not app clock) when available.
- SQLite initialization is lazy to avoid extra startup cost; store functions auto-create schema.
