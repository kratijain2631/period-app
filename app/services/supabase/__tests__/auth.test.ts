import { signInWithPassword, signOut } from '../auth';
import { upsertCurrentUserProfile } from '../users';

jest.mock('../users', () => ({
  upsertCurrentUserProfile: jest.fn(),
}));

jest.mock('../client', () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
    },
  },
}));

const { supabase } = jest.requireMock('../client');

describe('signInWithPassword', () => {
  it('maps Supabase session to app session', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: {
        session: {
          user: { id: 'user-1' },
          access_token: 'access',
          refresh_token: 'refresh',
          expires_at: 1234,
        },
      },
      error: null,
    });

    const session = await signInWithPassword('dev@example.com', 'password');

    expect(session).toEqual({
      userId: 'user-1',
      accessToken: 'access',
      refreshToken: 'refresh',
      expiresAt: 1234,
    });
    expect(upsertCurrentUserProfile).toHaveBeenCalledWith({ email: 'dev@example.com' });
  });
});

describe('signOut', () => {
  it('signs out locally and triggers global revoke', async () => {
    supabase.auth.signOut.mockResolvedValue({ error: null });

    await signOut();

    expect(supabase.auth.signOut).toHaveBeenNthCalledWith(1, { scope: 'local' });
    expect(supabase.auth.signOut).toHaveBeenNthCalledWith(2, { scope: 'global' });
  });
});
