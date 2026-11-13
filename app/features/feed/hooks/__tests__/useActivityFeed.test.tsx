import React from 'react';
import { useActivityFeed } from '../useActivityFeed';
import { loadActivityFeed } from '../../services/loadActivityFeed';
import { createPost, deletePost } from '../../../../services/supabase/posts';
import { addPostReaction } from '../../../../services/supabase/postReactions';
import { addEventReaction } from '../../../../services/supabase/eventReactions';
import { sendBoop } from '../../../../services/supabase/boops';
import { type ActivityItemModel } from '../../models/activity';

jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn().mockResolvedValue(null) }));
let mockUser = 'self';
let mockOnline = true;
jest.mock('../../../../state/sessionStore', () => ({
  useSessionStore: { getState: () => ({ session: { userId: mockUser } }) },
}));
jest.mock('../../../../state/connectionStore', () => ({
  useConnectionStore: { getState: () => ({}) },
  selectIsOnline: () => mockOnline,
}));
jest.mock('../../services/loadActivityFeed', () => ({ loadActivityFeed: jest.fn(), projectPost: jest.fn() }));
jest.mock('../../../../services/supabase/posts', () => ({ createPost: jest.fn(), deletePost: jest.fn() }));
jest.mock('../../../../services/supabase/postReactions', () => ({
  addPostReaction: jest.fn(),
  removePostReaction: jest.fn(),
}));
jest.mock('../../../../services/supabase/eventReactions', () => ({
  addEventReaction: jest.fn(),
  removeEventReaction: jest.fn(),
}));
jest.mock('../../../../services/supabase/boops', () => ({ sendBoop: jest.fn() }));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: {},
}));
const { act, create } = require('react-test-renderer');
let current: ReturnType<typeof useActivityFeed>;
let root: ReturnType<typeof create>;
const Harness = ({ userId = 'self' }: { userId?: string }) => {
  current = useActivityFeed(userId, null);
  return null;
};
const item = (type: 'post' | 'cycle' = 'post'): ActivityItemModel => ({
  target: { type, id: 'same-id' },
  actorId: 'friend',
  actorName: 'Friend',
  avatarUrl: null,
  isSelf: false,
  createdAt: '2026-03-09',
  body: 'Hello',
  label: 'Update',
  phase: 'unknown',
  reactions: [],
  reactionsAvailable: true,
  boopsAvailable: true,
  boopCount: 0,
  boopStatus: 'idle',
});
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { resolve, promise };
};
const loaded = (items = [item(), item('cycle')]) => ({ items, partial: false, failedKinds: [] });
const mount = async () => {
  await act(async () => {
    root = create(<Harness />);
  });
  await act(async () => current.reload());
};
beforeEach(() => {
  jest.clearAllMocks();
  mockUser = 'self';
  mockOnline = true;
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  jest.mocked(loadActivityFeed).mockResolvedValue(loaded());
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
});
it('routes equal IDs by target type and never duplicates an in-flight reaction', async () => {
  await mount();
  const wait = deferred<any>();
  jest.mocked(addPostReaction).mockReturnValue(wait.promise);
  await act(async () => {
    void current.react(item().target, '❤️');
    void current.react(item().target, '❤️');
  });
  expect(addPostReaction).toHaveBeenCalledTimes(1);
  await act(async () => wait.resolve({ id: 'r' }));
  expect(current.items[0].reactions[0]).toMatchObject({ count: 1, selected: true });
  expect(current.items[1].reactions).toEqual([]);
  await act(async () => current.react(item().target, '❤️', true));
  expect(addPostReaction).toHaveBeenCalledTimes(1);
  jest.mocked(addEventReaction).mockResolvedValue({ id: 'event-reaction' } as any);
  await act(async () => current.react(item('cycle').target, '✨'));
  expect(addEventReaction).toHaveBeenCalledWith('same-id', '✨');
});
it('does not let a stale feed response overwrite a successful mutation', async () => {
  await mount();
  const wait = deferred<any>();
  jest.mocked(loadActivityFeed).mockReturnValueOnce(wait.promise);
  let request!: Promise<void>;
  await act(async () => {
    request = current.reload();
  });
  jest.mocked(addPostReaction).mockResolvedValue({ id: 'r' } as any);
  await act(async () => current.react(item().target, '❤️'));
  await act(async () => {
    wait.resolve(loaded());
    await request;
  });
  expect(current.items[0].reactions[0].selected).toBe(true);
});
it('coalesces loads and ignores old-account responses', async () => {
  const wait = deferred<any>();
  jest.mocked(loadActivityFeed).mockReturnValueOnce(wait.promise);
  await act(async () => {
    root = create(<Harness />);
  });
  await act(async () => {
    void current.reload();
    void current.reload();
  });
  expect(loadActivityFeed).toHaveBeenCalledTimes(1);
  mockUser = 'another';
  await act(async () => wait.resolve(loaded()));
  expect(current.items).toEqual([]);
});
it('keeps the draft on failure, blocks offline posting, and prevents duplicate submits', async () => {
  await mount();
  await act(async () => current.composer.setText('Keep this draft'));
  mockOnline = false;
  await act(async () => current.composer.submit());
  expect(createPost).not.toHaveBeenCalled();
  mockOnline = true;
  const wait = deferred<any>();
  jest.mocked(createPost).mockReturnValueOnce(wait.promise);
  await act(async () => {
    void current.composer.submit();
    void current.composer.submit();
  });
  expect(createPost).toHaveBeenCalledTimes(1);
  await act(async () => wait.resolve(null));
  expect(current.composer.text).toBe('Keep this draft');
  expect(current.composer.error).toContain('draft');
});
it('keeps queued boops distinct from delivered counts and prevents repeats', async () => {
  await mount();
  jest.mocked(sendBoop).mockResolvedValue({ status: 'queued' });
  await act(async () => current.boop(item().target));
  await act(async () => current.boop(item().target));
  expect(sendBoop).toHaveBeenCalledTimes(1);
  expect(current.items[0]).toMatchObject({ boopCount: 0, boopStatus: 'queued' });
});
it('keeps failed reaction state unchanged and exposes an error', async () => {
  await mount();
  jest.mocked(addPostReaction).mockRejectedValueOnce(new Error('network'));
  await act(async () => current.react(item().target, '❤️'));
  expect(current.items[0].reactions).toEqual([]);
  expect(current.error).toContain('couldn’t save');
  expect(current.pending).toEqual([]);
});

it('invalidates ranking counts only after a confirmed deletion and keeps failed deletes visible', async () => {
  const owned = { ...item(), actorId: 'self', isSelf: true };
  jest.mocked(loadActivityFeed).mockResolvedValue(loaded([owned]));
  await mount();
  jest.mocked(deletePost).mockRejectedValueOnce(Error('offline'));
  await act(async () => current.remove(owned.target));
  expect(current.items).toHaveLength(1);
  expect(current.rankingsRevision).toBe(0);
  jest.mocked(deletePost).mockResolvedValueOnce(undefined);
  await act(async () => current.remove(owned.target));
  expect(current.items).toHaveLength(0);
  expect(current.rankingsRevision).toBe(1);
});
