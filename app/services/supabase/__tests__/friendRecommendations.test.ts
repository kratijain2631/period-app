import {
  FRIEND_RECOMMENDATIONS_TTL_DAYS,
  fetchFriendRecommendations,
  isFriendRecommendationsFresh,
  shouldUseFriendRecommendations,
} from '../friendRecommendations';

jest.mock('../client', () => ({
  isSupabaseConfigured: true,
  supabase: {
    from: jest.fn(),
  },
}));

const { supabase } = jest.requireMock('../client') as {
  supabase: {
    from: jest.Mock;
  };
};

describe('friendRecommendations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-02-15T20:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('treats generated rows as fresh when within ttl', () => {
    expect(
      isFriendRecommendationsFresh({
        generatedAt: '2026-02-14T21:00:00.000Z',
      }),
    ).toBe(true);
  });

  it('treats rows as stale at or after ttl', () => {
    const staleDate = new Date(
      Date.now() - FRIEND_RECOMMENDATIONS_TTL_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();
    expect(
      isFriendRecommendationsFresh({
        generatedAt: staleDate,
      }),
    ).toBe(false);
  });

  it('does not use stale or empty recommendation rows', () => {
    expect(
      shouldUseFriendRecommendations({
        row: {
          recommendations: [],
          generated_at: '2026-02-15T19:00:00.000Z',
        },
      }),
    ).toBe(false);
    expect(
      shouldUseFriendRecommendations({
        row: {
          recommendations: ['one'],
          generated_at: 'not-a-date',
        },
      }),
    ).toBe(false);
  });

  it('maps recommendation rows from supabase', async () => {
    const maybeSingle = jest.fn().mockResolvedValue({
      data: {
        recommendations: ['Plan tea', 'Send check-in'],
        generated_at: '2026-02-15T18:30:00.000Z',
        score: 77,
      },
      error: null,
    });
    const eq = jest.fn().mockReturnValue({ maybeSingle });
    const select = jest.fn().mockReturnValue({ eq });
    supabase.from.mockReturnValue({ select });

    await expect(fetchFriendRecommendations('friend-1')).resolves.toEqual({
      recommendations: ['Plan tea', 'Send check-in'],
      generated_at: '2026-02-15T18:30:00.000Z',
      score: 77,
    });
    expect(supabase.from).toHaveBeenCalledWith('friend_recommendations');
  });

  it('falls back to empty recommendation list for malformed json', async () => {
    const maybeSingle = jest.fn().mockResolvedValue({
      data: {
        recommendations: { text: 'bad shape' },
        generated_at: '2026-02-15T18:30:00.000Z',
        score: null,
      },
      error: null,
    });
    const eq = jest.fn().mockReturnValue({ maybeSingle });
    const select = jest.fn().mockReturnValue({ eq });
    supabase.from.mockReturnValue({ select });

    await expect(fetchFriendRecommendations('friend-1')).resolves.toEqual({
      recommendations: [],
      generated_at: '2026-02-15T18:30:00.000Z',
      score: null,
    });
  });
});
