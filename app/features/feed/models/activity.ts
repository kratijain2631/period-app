import type { CyclePhase } from '../../../../packages/domain/cycles/models';

export type ActivityTarget = { type: 'post'; id: string } | { type: 'cycle'; id: string };
export const activityKey = (target: ActivityTarget) => `${target.type}:${target.id}`;
export type ActivityItemModel = {
  target: ActivityTarget;
  actorId: string;
  actorName: string;
  actorInitial: string;
  avatarUrl: string | null;
  isSelf: boolean;
  createdAt: string;
  body: string | null;
  label: string;
  phase: CyclePhase;
  reactions: { emoji: string; count: number; selected: boolean }[];
  reactionsAvailable: boolean;
  boopsAvailable: boolean;
  boopCount: number;
  boopStatus: 'idle' | 'sending' | 'sent' | 'queued';
};
export const moodOptions = [
  { label: 'Recovering', emoji: '🌿' },
  { label: 'Amazing', emoji: '✨' },
  { label: 'Rock Hard', emoji: '💪' },
  { label: 'Sad', emoji: '🌧' },
  { label: 'Bloated af', emoji: '🫧' },
  { label: 'One more day', emoji: '🕯' },
  { label: 'Boop me', emoji: '🤝' },
];
export const quickEmojis = ['❤️', '😂', '😮', '😭', '😡', '🔥', '👏'];
export const reactionEmojis = [
  ...quickEmojis,
  '😍',
  '🤔',
  '🙌',
  '✨',
  '🫶',
  '💯',
  '🙏',
  '🤝',
  '😴',
  '🤒',
  '🤯',
  '🥳',
  '😬',
  '😅',
  '😇',
  '😎',
  '💪',
];
export const sortActivity = (items: ActivityItemModel[]) =>
  [...items].sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0));

export const updateReaction = (item: ActivityItemModel, emoji: string, selected: boolean): ActivityItemModel => {
  const previous = item.reactions.find((r) => r.emoji === emoji);
  const count = Math.max(0, (previous?.count ?? 0) + (selected ? 1 : -1));
  return {
    ...item,
    reactions: [
      ...item.reactions.filter((r) => r.emoji !== emoji),
      ...(count ? [{ emoji, count, selected }] : []),
    ],
  };
};
