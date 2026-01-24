export type DoubleTapState = {
  postId: string | null;
  timestamp: number | null;
};

export type DoubleTapResult = {
  isDoubleTap: boolean;
  nextState: DoubleTapState;
};

export const getDoubleTapResult = (
  state: DoubleTapState,
  postId: string,
  now: number,
  thresholdMs = 300,
): DoubleTapResult => {
  const isDoubleTap =
    state.timestamp !== null &&
    state.postId === postId &&
    now - state.timestamp < thresholdMs;
  return {
    isDoubleTap,
    nextState: isDoubleTap ? { postId: null, timestamp: null } : { postId, timestamp: now },
  };
};
