import type { ActivityItemModel } from '../../app/features/feed/models/activity';
import type { CycleOverview } from '../../app/features/cycle/models/cycleOverview';
import type { CirclePerson } from '../../app/features/friends/components/CircleWidgets';
import type { ProfileIdentityModel } from '../../app/features/profile/components/ProfileWidgets';

export const example: CycleOverview = {
  state: 'ready',
  phase: 'follicular',
  source: 'estimated',
  currentDay: 9,
  cycleLength: 28,
  ranges: [
    { phase: 'menstruation', startDay: 1, endDay: 5 },
    { phase: 'follicular', startDay: 6, endDay: 12 },
    { phase: 'ovulation', startDay: 13, endDay: 15 },
    { phase: 'luteal', startDay: 16, endDay: 23 },
    { phase: 'pms', startDay: 24, endDay: 28 },
  ],
  stale: false,
  syncedLabel: 'Nov 3',
  markerMatchesPhase: true,
  upcoming: { phase: 'ovulation', daysAway: 4 },
  guidance: {
    title: 'Try something new',
    body: 'If you feel up to it, make a little room for something you’ve been curious about.',
  },
};
const initialItem: ActivityItemModel = {
  target: { type: 'post', id: 'example' },
  actorId: 'example-friend',
  actorName: 'Maya',
  avatarUrl: null,
  isSelf: false,
  createdAt: '2026-11-03T14:00:00Z',
  body: 'A slow walk and a coffee with a friend. Exactly what I needed today.',
  label: 'Recovering',
  phase: 'unknown',
  reactions: [{ emoji: '❤️', count: 3, selected: false }],
  reactionsAvailable: true,
  boopsAvailable: true,
  boopCount: 2,
  boopStatus: 'idle',
};

export const people: CirclePerson[] = [
  { id: 'maya', name: 'Maya', alias: 'mayabloom', score: 91 },
  { id: 'jules', name: 'Jules', alias: 'juleswalks', score: 78 },
  { id: 'nina', name: 'Nina', alias: 'ninapark', score: null },
  { id: 'sam', name: 'Sam', alias: 'samlee', score: 72 },
  { id: 'cleo', name: 'Cleo', alias: 'cleomoon', score: null },
];
export const request: CirclePerson = { id: 'rory', name: 'Rory', alias: 'roryj', score: null };
export const initialProfile: ProfileIdentityModel = {
  name: 'Alex Rivera',
  alias: 'alex',
  bio: 'Usually out walking with a coffee.',
};
export const activity: ActivityItemModel[] = [
  { ...initialItem, actorId: 'maya' },
  {
    ...initialItem,
    actorId: 'jules',
    actorName: 'Jules',
    target: { type: 'post', id: 'walk' },
    label: 'Amazing',
    body: 'Found a new trail by the river. Anyone up for a walk this weekend?',
    createdAt: '2026-11-02T15:00:00Z',
    boopCount: 0,
    reactions: [{ emoji: '👏', count: 2, selected: false }],
  },
  {
    ...initialItem,
    target: { type: 'post', id: 'sunday-walk' },
    actorId: 'self',
    actorName: initialProfile.name,
    isSelf: true,
    createdAt: '2026-11-01T15:00:00Z',
    label: 'Circle update',
    body: 'Left my headphones at home for my Sunday walk. Heard the whole park wake up.',
    reactions: [{ emoji: '❤️', count: 1, selected: false }],
    boopCount: 0,
  },
];
export type PreviewState = 'Ready' | 'Empty' | 'Loading' | 'Error' | 'Stale' | 'Offline';
export const pages = ['Home', 'Feed', 'Circle', 'You'] as const;
export type PreviewPage = (typeof pages)[number];

export const sampleContacts: CirclePerson[] = [
  { id: 'tess', name: 'Tess', alias: 'tesslane', score: null },
  { id: 'imani', name: 'Imani', alias: 'imanireads', score: null },
  { id: 'lou', name: 'Lou', alias: 'loufern', score: null },
  { id: 'dev', name: 'Dev', alias: 'devpaint', score: null },
  { id: 'kit', name: 'Kit', alias: 'kitwalks', score: null },
  { id: 'ana', name: 'Ana', alias: 'anasketch', score: null },
  { id: 'ren', name: 'Ren', alias: 'renwrites', score: null },
  request,
  { id: 'mina', name: 'Mina', alias: 'minabee', score: null },
  { id: 'eden', name: 'Eden', alias: 'edenfern', score: null },
  { id: 'ari', name: 'Ari', alias: 'arisong', score: null },
];
export type ContactRelation = 'available' | 'outgoing' | 'incoming' | 'friends' | 'dismissed';
export const batchLimit = 5;
// Illustrative activity directed to the signed-in member in the last 30 days.
export const supportExamples: Record<string, { reactions: number; comments: number; boops: number }> = {
  jules: { reactions: 6, comments: 1, boops: 3 },
  nina: { reactions: 5, comments: 3, boops: 1 },
  maya: { reactions: 4, comments: 1, boops: 2 },
};
// The totals above are for earlier sample updates outside the preview feed.
export const earlierManualPosts = 9;
const demoReactions = [{ postId: 'sunday-walk', from: 'jules' }];
export function supportWithVisiblePosts(
  items: ActivityItemModel[],
  comments: Record<string, { user_id: string }[]>,
) {
  const totals = Object.fromEntries(Object.entries(supportExamples).map(([id, values]) => [id, { ...values }]));
  const postIds = new Set(items.filter((i) => i.isSelf && i.target.type === 'post').map((i) => i.target.id));
  for (const reaction of demoReactions) if (postIds.has(reaction.postId)) totals[reaction.from].reactions++;
  for (const postId of postIds)
    for (const comment of comments[postId] ?? []) if (totals[comment.user_id]) totals[comment.user_id].comments++;
  return totals;
}
export const communityExamples = [
  { person: sampleContacts[1], friends: 34, posts: 7 },
  { person: people[0], friends: 31, posts: 12 },
  { person: sampleContacts[0], friends: 29, posts: 9 },
  { person: people[1], friends: 24, posts: 14 },
  { person: people[2], friends: 22, posts: 10 },
  { person: people[3], friends: 20, posts: 6 },
  { person: people[4], friends: 19, posts: 4 },
  { person: sampleContacts[2], friends: 18, posts: 5 },
  { person: sampleContacts[3], friends: 17, posts: 8 },
  { person: sampleContacts[4], friends: 16, posts: 3 },
  { person: sampleContacts[5], friends: 15, posts: 11 },
];
export const bios: Record<string, string> = {
  maya: 'Sunday walks, coffee stops and sending voice notes.',
  jules: 'Always collecting new trails to try.',
  nina: 'Here for the quiet mornings.',
  sam: 'Cooking for friends is my love language.',
  rory: 'A reader with a very long book list.',
  tess: 'Usually in the garden.',
};

export const requestArrival: Record<string, string> = {
  rory: '2026-11-03T14:00:00Z',
  mina: '2026-11-03T15:30:00Z',
  eden: '2026-11-04T09:00:00Z',
  ari: '2026-11-04T12:45:00Z',
};
