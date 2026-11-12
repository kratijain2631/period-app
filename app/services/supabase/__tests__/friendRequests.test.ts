import { respondToFriendRequest } from '../friendRequests';

jest.mock('../client', () => ({
  isSupabaseConfigured: true,
  supabase: {
    rpc: jest.fn(),
    from: jest.fn(),
  },
}));

const { supabase } = jest.requireMock('../client');

// A chainable stand-in for supabase.from(...): every filter returns itself,
// and awaiting it (or calling maybeSingle) resolves to `result`.
const queryBuilder = (result: unknown) => {
  const builder: Record<string, jest.Mock> & { then?: unknown } = {};
  ['update', 'delete', 'eq', 'in', 'select'].forEach((method) => {
    builder[method] = jest.fn(() => builder);
  });
  builder.maybeSingle = jest.fn(() => Promise.resolve(result));
  builder.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return builder;
};

describe('respondToFriendRequest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    supabase.rpc.mockResolvedValue({ data: null, error: null });
  });

  it('accepts, turns on sharing and removes the opposite pending request', async () => {
    const update = queryBuilder({ data: { from_user_id: 'friend', to_user_id: 'me' }, error: null });
    const cleanup = queryBuilder({ error: null });
    supabase.from.mockReturnValueOnce(update).mockReturnValueOnce(cleanup);

    await respondToFriendRequest('request-1', 'accepted');

    expect(update.update).toHaveBeenCalledWith({ status: 'accepted' });
    expect(update.eq).toHaveBeenCalledWith('id', 'request-1');
    expect(supabase.rpc).toHaveBeenCalledWith('ensure_friend_sharing', { request_ids: ['request-1'] });
    expect(cleanup.delete).toHaveBeenCalled();
    expect(cleanup.eq).toHaveBeenCalledWith('status', 'pending');
    expect(cleanup.eq).toHaveBeenCalledWith('from_user_id', 'me');
    expect(cleanup.eq).toHaveBeenCalledWith('to_user_id', 'friend');
  });

  it('declines by deleting the request', async () => {
    const remove = queryBuilder({ error: null });
    supabase.from.mockReturnValueOnce(remove);

    await respondToFriendRequest('request-2', 'declined');

    expect(remove.delete).toHaveBeenCalled();
    expect(remove.eq).toHaveBeenCalledWith('id', 'request-2');
    expect(supabase.rpc).not.toHaveBeenCalled();
  });
});
