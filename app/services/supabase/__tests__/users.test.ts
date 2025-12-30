import { upsertCurrentUserProfile } from '../users';

jest.mock('../client', () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
  },
}));

const { supabase } = jest.requireMock('../client');

describe('upsertCurrentUserProfile', () => {
  it('upserts the current user profile', async () => {
    const upsert = jest.fn().mockResolvedValue({ error: null });
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'user@example.com' } },
      error: null,
    });
    supabase.from.mockReturnValue({ upsert });

    await upsertCurrentUserProfile({
      appleUserId: 'apple-123',
      fullName: 'Ada Lovelace',
    });

    expect(supabase.from).toHaveBeenCalledWith('users');
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'user-1',
        email: 'user@example.com',
        apple_user_id: 'apple-123',
        full_name: 'Ada Lovelace',
      }),
      { onConflict: 'id' },
    );
  });
});
