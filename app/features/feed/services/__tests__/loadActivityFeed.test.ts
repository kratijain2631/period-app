import { loadActivityFeed } from '../loadActivityFeed';
import { fetchPosts } from '../../../../services/supabase/posts';
import { fetchCycleEvents } from '../../../../services/supabase/cycleEvents';
import { fetchPostReactions } from '../../../../services/supabase/postReactions';
import { fetchEventReactions } from '../../../../services/supabase/eventReactions';
import { fetchPostBoops, fetchPostBoopsByUser, fetchEventBoops, fetchEventBoopsByUser } from '../../../../services/supabase/boops';
import { fetchUserProfilesByIds } from '../../../../services/supabase/users';
import { listPendingBoops } from '../../../../storage/sqlite/boopQueueStore';
import { periodEventDays } from '../../models/periodEventDays';
jest.mock('../../../../services/supabase/posts', () => ({ fetchPosts: jest.fn() }));
jest.mock('../../../../services/supabase/cycleEvents', () => ({ fetchCycleEvents: jest.fn() }));
jest.mock('../../../../services/supabase/postReactions', () => ({ fetchPostReactions: jest.fn() }));
jest.mock('../../../../services/supabase/eventReactions', () => ({ fetchEventReactions: jest.fn() }));
jest.mock('../../../../services/supabase/boops', () => ({ fetchPostBoops: jest.fn(), fetchPostBoopsByUser: jest.fn(), fetchEventBoops: jest.fn(), fetchEventBoopsByUser: jest.fn() }));
jest.mock('../../../../services/supabase/users', () => ({ fetchUserProfilesByIds: jest.fn() }));
jest.mock('../../../../storage/sqlite/boopQueueStore', () => ({ listPendingBoops: jest.fn() }));
const post = { id: 'shared-id', user_id: 'friend', alias: 'A', body: 'Hi', mood_tag: null, created_at: '2026-11-03T12:00:00Z' };
const event = { id: 'shared-id', user_id: 'friend', event_type: 'phase_transition', phase: 'pms', starts_at: '2026-11-02T12:00:00Z', created_at: '2026-11-02T12:00:00Z' };
beforeEach(() => {
  jest.resetAllMocks();
  jest.mocked(fetchPosts).mockResolvedValue([post]); jest.mocked(fetchCycleEvents).mockResolvedValue([event]);
  [fetchPostReactions, fetchEventReactions, fetchPostBoops, fetchPostBoopsByUser, fetchEventBoops, fetchEventBoopsByUser, fetchUserProfilesByIds, listPendingBoops].forEach(fn => (fn as jest.Mock).mockResolvedValue([]));
});
it('preserves the successful branch when the other fails', async () => {
  jest.mocked(fetchPosts).mockRejectedValueOnce(new Error('offline'));
  const result = await loadActivityFeed('self');
  expect(result.failedKinds).toEqual(['post']);
  expect(result.items).toHaveLength(1);
  expect(result.items[0]).toMatchObject({ label: 'Entered PMS', target: { type: 'cycle' } });
});
it('disables unknown reaction state without hiding posts', async () => {
  jest.mocked(fetchPostReactions).mockRejectedValueOnce(new Error('offline'));
  const result = await loadActivityFeed('self');
  expect(result.partial).toBe(true);
  expect(result.items[0]).toMatchObject({ body: 'Hi', reactionsAvailable: false });
});
it('restores queued boops only on their typed target and projects no raw profile data', async () => {
  jest.mocked(listPendingBoops).mockResolvedValue([{ id: 'q', user_id: 'self', to_user_id: 'friend', post_id: 'shared-id', created_at: '' }]);
  jest.mocked(fetchUserProfilesByIds).mockResolvedValue([{ id: 'friend', full_name: 'Maya', email: 'private@example.com', avatar_url: null } as any]);
  const result = await loadActivityFeed('self');
  expect(result.items[0]).toMatchObject({ actorName: 'Maya', boopStatus: 'queued', boopCount: 0 });
  expect(result.items[1].boopStatus).toBe('idle');
  expect(JSON.stringify(result)).not.toContain('private@example.com');
});
it('groups flow days across a DST boundary, separately by author and run', () => {
  const e = (id: string, day: number, user = 'a') => ({ id, user_id: user, event_type: 'menstrual_flow', starts_at: new Date(2026, 10, day, 12).toISOString() });
  expect(periodEventDays([e('1', 1), e('2', 2), e('3', 3), e('4', 8), e('5', 2, 'b')])).toEqual({
    '1': { day: 1, total: 3 }, '2': { day: 2, total: 3 }, '3': { day: 3, total: 3 }, '4': { day: 1, total: 1 }, '5': { day: 1, total: 1 },
  });
});
