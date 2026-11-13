import { fetchPosts, type PostRow } from '../../../services/supabase/posts';
import { fetchCycleEvents, type CycleEventRow } from '../../../services/supabase/cycleEvents';
import { fetchPostReactions } from '../../../services/supabase/postReactions';
import { fetchEventReactions } from '../../../services/supabase/eventReactions';
import {
  fetchPostBoops,
  fetchPostBoopsByUser,
  fetchEventBoops,
  fetchEventBoopsByUser,
} from '../../../services/supabase/boops';
import { fetchUserProfilesByIds } from '../../../services/supabase/users';
import { listPendingBoops } from '../../../storage/sqlite/boopQueueStore';
import { type ActivityItemModel, sortActivity } from '../models/activity';
import { periodEventDays } from '../models/periodEventDays';

const labelFor = (value: string) =>
  value === 'pms' ? 'PMS' : value.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
const phaseFor = (value?: string | null): ActivityItemModel['phase'] =>
  ['menstruation', 'follicular', 'ovulation', 'luteal', 'pms'].includes(value ?? '')
    ? (value as ActivityItemModel['phase'])
    : 'unknown';

export const projectPost = (post: PostRow, userId: string): ActivityItemModel => ({
  target: { type: 'post', id: post.id },
  actorId: post.user_id,
  actorName: post.user_id === userId ? 'You' : post.alias || 'A friend',
  avatarUrl: null,
  isSelf: post.user_id === userId,
  createdAt: post.created_at,
  body: post.body,
  label: post.mood_tag?.split(',').filter(Boolean)[0] || 'Circle update',
  phase: 'unknown',
  reactions: [],
  reactionsAvailable: true,
  boopsAvailable: true,
  boopCount: 0,
  boopStatus: 'idle',
});
const projectEvent = (event: CycleEventRow, userId: string): ActivityItemModel => ({
  target: { type: 'cycle', id: event.id },
  actorId: event.user_id,
  actorName: event.user_id === userId ? 'You' : 'A friend',
  avatarUrl: null,
  isSelf: event.user_id === userId,
  createdAt: event.starts_at,
  body: null,
  label:
    event.event_type === 'phase_transition'
      ? `Entered ${labelFor(event.phase || 'a new phase')}`
      : labelFor(event.event_type),
  phase: event.event_type === 'menstrual_flow' ? 'menstruation' : phaseFor(event.phase),
  reactions: [],
  reactionsAvailable: true,
  boopsAvailable: true,
  boopCount: 0,
  boopStatus: 'idle',
});

// This adapter is the only place service rows become public feed widget models.
// A failed branch does not erase the other branch; unavailable interactions are disabled.
export const loadActivityFeed = async (userId: string) => {
  let partial = false;
  const branch = async (type: 'post' | 'cycle') => {
    const events = type === 'cycle' ? await fetchCycleEvents() : [];
    const days = periodEventDays(events);
    const items =
      type === 'post'
        ? (await fetchPosts()).map((p) => projectPost(p, userId))
        : events.map((e) => ({
            ...projectEvent(e, userId),
            ...(days[e.id] ? { label: `Period day ${days[e.id].day} of ${days[e.id].total} logged` } : {}),
          }));
    const ids = items.map((i) => i.target.id);
    const [reactions, boops, mine] = await Promise.allSettled([
      type === 'post' ? fetchPostReactions(ids) : fetchEventReactions(ids),
      type === 'post' ? fetchPostBoops(ids) : fetchEventBoops(ids),
      type === 'post' ? fetchPostBoopsByUser(ids, userId) : fetchEventBoopsByUser(ids, userId),
    ]);
    const idFor = (r: { post_id?: string | null; event_id?: string | null }) =>
      type === 'post' ? r.post_id : r.event_id;
    if ([reactions, boops, mine].some((r) => r.status === 'rejected')) partial = true;
    return items.map((item) => {
      const grouped = new Map<string, { emoji: string; count: number; selected: boolean }>();
      if (reactions.status === 'fulfilled')
        reactions.value
          .filter((r) => idFor(r) === item.target.id)
          .forEach((r) => {
            const previous = grouped.get(r.emoji);
            grouped.set(r.emoji, {
              emoji: r.emoji,
              count: (previous?.count ?? 0) + 1,
              selected: !!previous?.selected || r.user_id === userId,
            });
          });
      return {
        ...item,
        reactions: [...grouped.values()],
        reactionsAvailable: reactions.status === 'fulfilled',
        boopsAvailable: boops.status === 'fulfilled' && mine.status === 'fulfilled',
        boopCount:
          boops.status === 'fulfilled' ? boops.value.filter((r) => idFor(r) === item.target.id).length : 0,
        boopStatus:
          mine.status === 'fulfilled' && mine.value.some((r) => idFor(r) === item.target.id)
            ? ('sent' as const)
            : ('idle' as const),
      };
    });
  };
  const [posts, events, queued] = await Promise.allSettled([
    branch('post'),
    branch('cycle'),
    listPendingBoops(userId),
  ]);
  const failedKinds: ('post' | 'cycle')[] = [];
  if (posts.status === 'rejected') failedKinds.push('post');
  if (events.status === 'rejected') failedKinds.push('cycle');
  const items: ActivityItemModel[] = [
    ...(posts.status === 'fulfilled' ? posts.value : []),
    ...(events.status === 'fulfilled' ? events.value : []),
  ];
  if (queued.status === 'rejected') partial = true;
  items.forEach((item) => {
    if (
      queued.status === 'fulfilled' &&
      queued.value.some((q) =>
        item.target.type === 'post' ? q.post_id === item.target.id : q.event_id === item.target.id,
      )
    ) {
      item.boopStatus = 'queued';
    } else if (queued.status === 'rejected') item.boopsAvailable = false;
  });
  try {
    const profiles = await fetchUserProfilesByIds([...new Set(items.map((i) => i.actorId))]);
    items.forEach((item) => {
      const profile = profiles.find((p) => p.id === item.actorId);
      if (profile) {
        item.actorName = item.isSelf
          ? 'You'
          : profile.full_name?.trim() || profile.alias?.trim() || item.actorName;
        item.avatarUrl = profile.avatar_url ?? null;
      }
    });
  } catch {
    partial = true;
  }
  return { items: sortActivity(items), failedKinds, partial: partial || failedKinds.length > 0 };
};
