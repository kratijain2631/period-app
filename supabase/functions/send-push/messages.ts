// What each push type says, and which preference turns it off. Lock-screen text
// stays neutral: it names who did something, never anything about anyone's cycle.

export type OutboxRow = {
  id: string;
  user_id: string;
  actor_id: string | null;
  type: string;
  payload: Record<string, unknown> | null;
  notification_id: string | null;
};

export type Preferences = Record<string, boolean | string | null>;

// Push type -> notification_preferences column.
const CATEGORY: Record<string, string> = {
  friend_request: 'friend_requests',
  friend_request_accepted: 'friend_requests',
  post_reaction: 'reactions',
  event_reaction: 'reactions',
  boop: 'boops',
};

// Matches the defaults in the notification_preferences table.
const DEFAULT_ON: Record<string, boolean> = {
  friend_requests: true,
  reactions: true,
  boops: true,
  comments: true,
  phase_reminders: true,
  friend_cycle_updates: false,
};

export const isWanted = (type: string, preferences: Preferences | null) => {
  const category = CATEGORY[type];
  if (!category) {
    return false;
  }
  const chosen = preferences?.[category];
  return typeof chosen === 'boolean' ? chosen : DEFAULT_ON[category] ?? false;
};

const actorName = (alias: unknown) => {
  if (typeof alias !== 'string' || !alias.trim()) {
    return 'Someone';
  }
  const trimmed = alias.trim();
  return trimmed.startsWith('@') ? trimmed : `@${trimmed}`;
};

const withEmoji = (text: string) => text.replace(/\s+/g, ' ').trim();

// The notification body, or null for a type with no push text.
export const describePush = (row: Pick<OutboxRow, 'type' | 'payload'>): string | null => {
  const payload = row.payload ?? {};
  const actor = actorName(payload.actor_alias);
  const emoji = typeof payload.emoji === 'string' ? payload.emoji : '';
  switch (row.type) {
    case 'friend_request':
      return `${actor} sent you a friend request`;
    case 'friend_request_accepted':
      return `${actor} accepted your friend request`;
    case 'post_reaction':
      return withEmoji(`${actor} reacted ${emoji} to your post`);
    case 'event_reaction':
      return withEmoji(`${actor} reacted ${emoji} to your update`);
    case 'boop':
      return `${actor} booped you 👉`;
    default:
      return null;
  }
};

// Data the app reads when the notification is tapped. Ids only.
export const pushData = (row: OutboxRow) => {
  const payload = row.payload ?? {};
  const data: Record<string, string> = { type: row.type, outbox_id: row.id };
  if (row.notification_id) data.notification_id = row.notification_id;
  if (row.actor_id) data.actor_id = row.actor_id;
  for (const key of ['request_id', 'post_id']) {
    if (typeof payload[key] === 'string') data[key] = payload[key] as string;
  }
  return data;
};
