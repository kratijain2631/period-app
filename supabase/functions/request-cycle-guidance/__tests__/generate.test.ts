import { parseGeneratedGuidance } from '../generate';

it('rejects empty, malformed and non-string tips so they cannot be cached', () => {
  expect(() => parseGeneratedGuidance('{}', [])).toThrow();
  expect(() => parseGeneratedGuidance('not json', [])).toThrow();
  expect(() => parseGeneratedGuidance(JSON.stringify({ dos: ['a', null, {}], donts: ['a', 'b', 'c'] }), [])).toThrow();
});

it('allows suggestions only for the provided friends', () => {
  const parsed = parseGeneratedGuidance(JSON.stringify({
    dos: ['a', 'b', 'c'], donts: ['d', 'e', 'f'],
    friendSuggestions: [
      { friendId: 'friend-1', suggestion: 'Check in' },
      { friendId: 'stranger', suggestion: 'Invented friend' },
      null,
    ],
  }), [{ id: 'friend-1', name: 'Maya', phase: 'luteal' }]);
  expect(parsed.friend_suggestions).toEqual([{ friend_id: 'friend-1', friend_name: 'Maya', suggestion: 'Check in' }]);
});
