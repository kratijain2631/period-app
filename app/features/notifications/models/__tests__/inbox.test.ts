import { buildInbox } from '../inbox';
it('places requests among reactions and acceptances by arrival, regardless of fetch order or read status', () => {
  const at = (hour: number) => '2026-11-12T' + hour + ':00:00Z';
  const request = (id: string, hour: number) => ({
    id,
    from_user_id: id,
    to_user_id: 'self',
    created_at: at(hour),
    updated_at: at(17),
    status: 'pending' as const,
  });
  const rows = buildInbox({
    friendRequests: [request('last', 16), request('first', 10)],
    requestProfileMap: { first: { alias: 'rory' } },
    notifications: [
      {
        id: 'reaction',
        user_id: 'self',
        created_at: at(12),
        read_at: at(18),
        payload: { type: 'post_reaction', actor_alias: 'maya', actor_id: 'maya' },
      },
    ],
    acceptances: [
      { id: 'accept-other', requestId: 'other', actorId: 'member', name: 'Member', createdAt: at(14) },
    ],
  });
  expect(rows.map((r) => r.id)).toEqual(['request-first', 'reaction', 'accept-other', 'request-last']);
  expect(rows[0]).toMatchObject({
    title: '@rory sent you a friend request',
    requestId: 'first',
    actorId: 'first',
  });
});
