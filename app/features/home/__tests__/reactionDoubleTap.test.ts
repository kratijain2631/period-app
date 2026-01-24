import { getDoubleTapResult, type DoubleTapState } from '../utils/reactionDoubleTap';

const makeState = (postId: string | null, timestamp: number | null): DoubleTapState => ({
  postId,
  timestamp,
});

describe('getDoubleTapResult', () => {
  it('treats two taps on the same post within the threshold as a double tap', () => {
    const state = makeState('post-a', 1000);
    const result = getDoubleTapResult(state, 'post-a', 1200, 300);

    expect(result.isDoubleTap).toBe(true);
    expect(result.nextState).toEqual({ postId: null, timestamp: null });
  });

  it('does not treat taps on different posts within the threshold as a double tap', () => {
    const state = makeState('post-a', 1000);
    const result = getDoubleTapResult(state, 'post-b', 1200, 300);

    expect(result.isDoubleTap).toBe(false);
    expect(result.nextState).toEqual({ postId: 'post-b', timestamp: 1200 });
  });
});
