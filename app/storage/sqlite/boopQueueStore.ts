import * as SQLite from 'expo-sqlite';

const DB_NAME = 'health.db';
const TABLE_NAME = 'boop_queue';

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
          to_user_id text not null,
          event_id text,
          created_at text not null
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

const buildId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export type BoopQueueItem = {
  id: string;
  user_id: string;
  to_user_id: string;
  event_id?: string | null;
  created_at: string;
};

export const enqueueBoop = async (userId: string, toUserId: string, eventId?: string | null) => {
  await ensureInitialized();
  const db = await getDb();
  const id = buildId();
  const createdAt = new Date().toISOString();
  await db.runAsync(
    `insert into ${TABLE_NAME} (id, user_id, to_user_id, event_id, created_at)
     values (?, ?, ?, ?, ?);`,
    [id, userId, toUserId, eventId ?? null, createdAt],
  );
  return id;
};

export const listPendingBoops = async (userId: string): Promise<BoopQueueItem[]> => {
  await ensureInitialized();
  const db = await getDb();
  const rows = await db.getAllAsync<BoopQueueItem>(
    `select id, user_id, to_user_id, event_id, created_at
     from ${TABLE_NAME}
     where user_id = ?
     order by created_at asc;`,
    [userId],
  );
  return rows ?? [];
};

export const removeQueuedBoop = async (id: string) => {
  await ensureInitialized();
  const db = await getDb();
  await db.runAsync(`delete from ${TABLE_NAME} where id = ?;`, [id]);
};

export const clearBoopQueue = async (userId?: string) => {
  await ensureInitialized();
  const db = await getDb();
  if (userId) {
    await db.runAsync(`delete from ${TABLE_NAME} where user_id = ?;`, [userId]);
  } else {
    await db.runAsync(`delete from ${TABLE_NAME};`);
  }
};
