import type { FriendRequestRow, FriendRequestProfileRow } from '../../../services/supabase/friendRequests';
import type { NotificationRow } from '../../../services/supabase/notifications';
import type { AcceptanceNotification } from '../hooks/useNotifications';

const formatAlias = (alias?: string | null) => {
  if (!alias) {
    return '@unknown';
  }
  return alias.startsWith('@') ? alias : `@${alias}`;
};

const formatActor = (value: unknown) => {
  if (typeof value === 'string' && value.trim()) {
    return formatAlias(value.trim());
  }
  return 'Someone';
};

// Friendly one-liner for a DB notification row's payload.
const describeNotification = (payload: Record<string, unknown>): string => {
  const type =
    typeof payload.type === 'string'
      ? payload.type
      : typeof payload.event_type === 'string'
        ? payload.event_type
        : 'update';
  const actor = formatActor(payload.actor_alias);
  const emoji = typeof payload.emoji === 'string' ? payload.emoji : '';
  switch (type) {
    case 'post_reaction':
      return `${actor} reacted ${emoji} to your post`.replace(/\s+/g, ' ').trim();
    case 'event_reaction':
      return `${actor} reacted ${emoji} to your update`.replace(/\s+/g, ' ').trim();
    case 'boop':
      return `${actor} booped you 👉`;
    case 'phase_transition':
      return typeof payload.phase === 'string'
        ? `You've entered your ${payload.phase} phase`
        : 'Your cycle phase changed';
    default:
      return type.replace(/_/g, ' ');
  }
};

export type InboxItem = { id: string; title: string; timestamp: string; actorId?: string; requestId?: string };

export function buildInbox({
  notifications,
  friendRequests,
  requestProfileMap,
  acceptances,
}: {
  notifications: NotificationRow[];
  friendRequests: FriendRequestRow[];
  acceptances: AcceptanceNotification[];
  requestProfileMap: Record<string, Pick<FriendRequestProfileRow, 'alias'>>;
}): InboxItem[] {
  const rows: InboxItem[] = friendRequests.map((r) => ({
    id: 'request-' + r.id,
    timestamp: r.created_at,
    actorId: r.from_user_id,
    requestId: r.id,
    title: formatActor(requestProfileMap[r.from_user_id]?.alias) + ' sent you a friend request',
  }));
  for (const a of acceptances)
    rows.push({
      id: a.id,
      timestamp: a.createdAt,
      actorId: a.actorId,
      title: a.name + ' accepted your friend request',
    });
  for (const n of notifications) {
    const payload = n.payload ?? {};
    rows.push({
      id: n.id,
      timestamp: n.created_at,
      actorId: typeof payload.actor_id === 'string' ? payload.actor_id : undefined,
      title: describeNotification(payload),
    });
  }
  return rows.sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp) || a.id.localeCompare(b.id));
}
