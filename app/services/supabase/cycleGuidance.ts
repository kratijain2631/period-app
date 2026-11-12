import { isSupabaseConfigured, supabase } from './client';
import { guidanceMatchesPhase } from '../../../packages/domain/cycles/guidance';

export type CycleFriendSuggestion = {
  friend_id: string;
  friend_name?: string | null;
  suggestion: string;
};

export type CycleGuidanceRow = {
  phase: string | null;
  phase_started_at?: string | null;
  dos: string[];
  donts: string[];
  friend_suggestions: CycleFriendSuggestion[];
  generated_at: string;
};

const toStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
    : [];

const toFriendSuggestions = (value: unknown): CycleFriendSuggestion[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }
      const record = item as Partial<CycleFriendSuggestion>;
      if (!record.friend_id || !record.suggestion) {
        return null;
      }
      return {
        friend_id: String(record.friend_id),
        friend_name: record.friend_name ? String(record.friend_name) : undefined,
        suggestion: String(record.suggestion),
      };
    })
    .filter(Boolean) as CycleFriendSuggestion[];
};

const parseGuidance = (data: Record<string, unknown> | null): CycleGuidanceRow | null => {
  if (!data) return null;
  return {
    phase: typeof data.phase === 'string' ? data.phase : null,
    phase_started_at: typeof data.phase_started_at === 'string' ? data.phase_started_at : null,
    dos: toStringArray(data.dos),
    donts: toStringArray(data.donts),
    friend_suggestions: toFriendSuggestions(data.friend_suggestions),
    generated_at: typeof data.generated_at === 'string' ? data.generated_at : '',
  };
};

export const fetchCycleGuidance = async (userId: string): Promise<CycleGuidanceRow | null> => {
  if (!isSupabaseConfigured) {
    return null;
  }
  const { data, error } = await supabase
    .from('cycle_guidance')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    throw error;
  }
  return parseGuidance(data);
};

// Coalesce overlapping focus/snapshot refreshes within this process. The database
// lease also protects against concurrent requests from other devices.
const inFlight = new Map<string, Promise<CycleGuidanceRow | null>>();

export const ensureCycleGuidance = (
  userId: string,
  phase: string,
  phaseStart: string | null,
): Promise<CycleGuidanceRow | null> => {
  if (!isSupabaseConfigured || !userId || phase === 'unknown') return Promise.resolve(null);
  const key = JSON.stringify([userId, phase, phaseStart]);
  const pending = inFlight.get(key);
  if (pending) return pending;
  const request = (async () => {
    const cached = await fetchCycleGuidance(userId);
    if (guidanceMatchesPhase(cached, phase, phaseStart)) return cached;
    const { data, error } = await supabase.functions.invoke('request-cycle-guidance', {
      body: { userId, phase, phaseStart },
    });
    if (error) throw error;
    const generated = parseGuidance(data?.guidance ?? null);
    return guidanceMatchesPhase(generated, phase, phaseStart) ? generated : null;
  })().finally(() => { inFlight.delete(key); });
  inFlight.set(key, request);
  return request;
};

export type GuidanceRefreshResult = {
  guidance: CycleGuidanceRow | null;
  refreshLimited: boolean;
  pending: boolean;
};

const refreshing = new Map<string, Promise<GuidanceRefreshResult>>();

// Explicit refresh bypasses a valid cache. The server enforces account-scoped
// cooldown/leases; old guidance is never deleted to request new advice.
export const refreshCycleGuidance = (
  userId: string,
  phase: string,
  phaseStart: string | null,
): Promise<GuidanceRefreshResult> => {
  if (!isSupabaseConfigured || !userId || phase === 'unknown') {
    return Promise.resolve({ guidance: null, refreshLimited: false, pending: false });
  }
  const key = JSON.stringify([userId, phase, phaseStart]);
  const pending = refreshing.get(key);
  if (pending) return pending;
  const request = (async () => {
    // Avoid racing an automatic generation already started in this process.
    await inFlight.get(key)?.catch(() => null);
    const { data, error } = await supabase.functions.invoke('request-cycle-guidance', {
      body: { userId, phase, phaseStart, refresh: true },
    });
    if (error) throw error;
    const guidance = parseGuidance(data?.guidance ?? null);
    if (!guidanceMatchesPhase(guidance, phase, phaseStart) && data?.pending !== true) {
      throw new Error('Refresh returned no current guidance');
    }
    return {
      guidance: guidanceMatchesPhase(guidance, phase, phaseStart) ? guidance : null,
      refreshLimited: data?.refreshLimited === true,
      pending: data?.pending === true,
    };
  })().finally(() => { refreshing.delete(key); });
  refreshing.set(key, request);
  return request;
};
