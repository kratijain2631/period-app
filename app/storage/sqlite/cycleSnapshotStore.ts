import * as SQLite from 'expo-sqlite';
import type { CycleSnapshot } from '../../../packages/domain/cycles/models';

const DB_NAME = 'health.db';
const TABLE_NAME = 'cycle_snapshots';
const STALE_AFTER_MS = 24 * 60 * 60 * 1000;

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;
let initPromise: Promise<void> | null = null;
let initialized = false;

const getDb = () => {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DB_NAME);
  }
  return dbPromise;
};

const ensureInitialized = async () => {
  if (initialized) {
    return;
  }
  if (!initPromise) {
    initPromise = (async () => {
      const db = await getDb();
      await db.execAsync(
        `create table if not exists ${TABLE_NAME} (
          id text primary key not null,
          user_id text not null,
          snapshot_json text not null,
          last_synced_at text not null,
          created_at text not null,
          updated_at text not null
        );`,
      );
      await db.execAsync(
        `create index if not exists idx_${TABLE_NAME}_user_id on ${TABLE_NAME} (user_id);`,
      );
      initialized = true;
    })();
  }
  await initPromise;
};

export type StoredCycleSnapshot = {
  snapshot: CycleSnapshot;
  lastSyncedAt: string;
};

export const isSnapshotStale = (lastSyncedAt: string, ttlMs = STALE_AFTER_MS) =>
  Date.now() - new Date(lastSyncedAt).getTime() > ttlMs;

export const upsertCycleSnapshot = async (userId: string, snapshot: CycleSnapshot) => {
  await ensureInitialized();
  const db = await getDb();
  const now = new Date().toISOString();
  const rowId = `${userId}-latest`;
  const lastSyncedAt = snapshot.syncedAt;
  await db.runAsync(
    `insert into ${TABLE_NAME} (id, user_id, snapshot_json, last_synced_at, created_at, updated_at)
     values (?, ?, ?, ?, ?, ?)
     on conflict(id) do update set
       snapshot_json = excluded.snapshot_json,
       last_synced_at = excluded.last_synced_at,
       updated_at = excluded.updated_at;`,
    [rowId, userId, JSON.stringify(snapshot), lastSyncedAt, now, now],
  );
};

export const getLatestCycleSnapshot = async (userId: string): Promise<StoredCycleSnapshot | null> => {
  await ensureInitialized();
  const db = await getDb();
  const row = await db.getFirstAsync<{ snapshot_json: string; last_synced_at: string }>(
    `select snapshot_json, last_synced_at from ${TABLE_NAME}
     where user_id = ?
     order by last_synced_at desc
     limit 1;`,
    [userId],
  );
  if (!row) {
    return null;
  }
  try {
    const snapshot = JSON.parse(row.snapshot_json) as CycleSnapshot;
    return { snapshot, lastSyncedAt: row.last_synced_at };
  } catch (error) {
    console.warn('[cycle-snapshot] Failed to parse snapshot JSON', error);
    return null;
  }
};

export const clearCycleSnapshots = async (userId?: string) => {
  await ensureInitialized();
  const db = await getDb();
  if (userId) {
    await db.runAsync(`delete from ${TABLE_NAME} where user_id = ?;`, [userId]);
  } else {
    await db.runAsync(`delete from ${TABLE_NAME};`);
  }
};

export const pruneStaleSnapshots = async (userId: string, ttlMs = STALE_AFTER_MS) => {
  await ensureInitialized();
  const db = await getDb();
  const cutoff = new Date(Date.now() - ttlMs).toISOString();
  await db.runAsync(
    `delete from ${TABLE_NAME}
     where user_id = ? and last_synced_at < ?;`,
    [userId, cutoff],
  );
};
