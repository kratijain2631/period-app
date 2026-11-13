import { describePush, isWanted, pushData } from '../messages';

it('describes each push type without cycle details', () => {
  expect(describePush({ type: 'friend_request', payload: { actor_alias: 'ava' } })).toBe('@ava sent you a friend request');
  expect(describePush({ type: 'friend_request_accepted', payload: { actor_alias: '@bea' } })).toBe('@bea accepted your friend request');
  expect(describePush({ type: 'event_reaction', payload: { actor_alias: 'ava', emoji: '💛', phase: 'luteal' } })).toBe(
    '@ava reacted 💛 to your update',
  );
  expect(describePush({ type: 'post_reaction', payload: {} })).toBe('Someone reacted to your post');
  expect(describePush({ type: 'phase_transition', payload: { phase: 'luteal' } })).toBeNull();
});

it('uses the table defaults until the user chooses', () => {
  expect(isWanted('friend_request', null)).toBe(true);
  expect(isWanted('boop', { boops: false })).toBe(false);
  expect(isWanted('post_reaction', { reactions: null })).toBe(true);
  expect(isWanted('something_new', null)).toBe(false);
});

it('sends only ids in the tap data', () => {
  expect(
    pushData({
      id: 'o1',
      user_id: 'u',
      actor_id: 'a',
      type: 'friend_request',
      notification_id: null,
      payload: { request_id: 'r1', actor_alias: 'ava', emoji: 1 },
    }),
  ).toEqual({ type: 'friend_request', outbox_id: 'o1', actor_id: 'a', request_id: 'r1' });
});
