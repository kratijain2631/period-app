import {
  fetchCurrentAutoPostSettings,
  fetchCurrentUserProfile,
  hasRemoteAutoPostSettings,
  saveCurrentUserAutoPostSettings,
  upsertCurrentUserProfile,
} from '../users';

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
  beforeEach(() => {
    jest.clearAllMocks();
  });

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

  it('returns local settings even when remote auto-post columns are missing on save', async () => {
    const settings = {
      postPeriodDays: true,
      postOnlyPeriodStart: true,
      postPhaseTransitions: false,
    };
    const eq = jest.fn().mockResolvedValue({
      error: {
        code: '42703',
        message: 'column users.auto_post_period_days does not exist',
      },
    });
    const update = jest.fn().mockReturnValue({ eq });
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'user@example.com' } },
      error: null,
    });
    supabase.from.mockReturnValue({ update });

    await expect(saveCurrentUserAutoPostSettings(settings)).resolves.toEqual(settings);
    expect(warnSpy).toHaveBeenCalledWith(
      '[auto-post-settings] Remote columns unavailable; saved locally only',
    );
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        auto_post_period_days: true,
        auto_post_period_start_only: true,
        auto_post_phase_transitions: false,
      }),
    );
    warnSpy.mockRestore();
  });

  it('falls back to legacy profile query without overriding local auto-post settings', async () => {
    const withAutoPostMaybeSingle = jest.fn().mockResolvedValue({
      data: null,
      error: {
        code: 'PGRST204',
        message: 'Could not find the column users.auto_post_period_days',
      },
    });
    const legacyMaybeSingle = jest.fn().mockResolvedValue({
      data: {
        id: 'user-1',
        email: 'user@example.com',
        full_name: 'User One',
      },
      error: null,
    });

    const withAutoPostEq = jest.fn().mockReturnValue({
      maybeSingle: withAutoPostMaybeSingle,
    });
    const legacyEq = jest.fn().mockReturnValue({
      maybeSingle: legacyMaybeSingle,
    });

    const withAutoPostSelect = jest.fn().mockReturnValue({
      eq: withAutoPostEq,
    });
    const legacySelect = jest.fn().mockReturnValue({
      eq: legacyEq,
    });

    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'user@example.com', user_metadata: {} } },
      error: null,
    });
    supabase.from
      .mockReturnValueOnce({ select: withAutoPostSelect })
      .mockReturnValueOnce({ select: legacySelect });

    const profile = await fetchCurrentUserProfile();

    expect(profile).toEqual(
      expect.objectContaining({
        id: 'user-1',
        email: 'user@example.com',
        full_name: 'User One',
      }),
    );
    expect(profile?.auto_post_period_days).toBeUndefined();
    expect(profile?.auto_post_period_start_only).toBeUndefined();
    expect(profile?.auto_post_phase_transitions).toBeUndefined();
    expect(hasRemoteAutoPostSettings(profile)).toBe(false);
    expect(supabase.from).toHaveBeenNthCalledWith(1, 'users');
    expect(supabase.from).toHaveBeenNthCalledWith(2, 'users');
  });

  it('returns null remote settings when auto-post columns are not available', async () => {
    const withAutoPostMaybeSingle = jest.fn().mockResolvedValue({
      data: null,
      error: {
        code: 'PGRST204',
        message: 'Could not find the column users.auto_post_period_days',
      },
    });
    const legacyMaybeSingle = jest.fn().mockResolvedValue({
      data: {
        id: 'user-1',
        email: 'user@example.com',
      },
      error: null,
    });
    const withAutoPostEq = jest.fn().mockReturnValue({
      maybeSingle: withAutoPostMaybeSingle,
    });
    const legacyEq = jest.fn().mockReturnValue({
      maybeSingle: legacyMaybeSingle,
    });
    const withAutoPostSelect = jest.fn().mockReturnValue({
      eq: withAutoPostEq,
    });
    const legacySelect = jest.fn().mockReturnValue({
      eq: legacyEq,
    });
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'user@example.com', user_metadata: {} } },
      error: null,
    });
    supabase.from
      .mockReturnValueOnce({ select: withAutoPostSelect })
      .mockReturnValueOnce({ select: legacySelect });

    await expect(fetchCurrentAutoPostSettings()).resolves.toBeNull();
  });
});
