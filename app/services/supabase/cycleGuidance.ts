import { isSupabaseConfigured, supabase } from './client';

export type CycleFriendSuggestion = {
  friend_id: string;
  friend_name?: string | null;
  suggestion: string;
};

export type CycleGuidanceRow = {
  phase: string | null;
  dos: string[];
  donts: string[];
  friend_suggestions: CycleFriendSuggestion[];
  generated_at: string;
};

const toStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : [];

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

export const fetchCycleGuidance = async (): Promise<CycleGuidanceRow | null> => {
  if (!isSupabaseConfigured) {
    return null;
  }
  const { data, error } = await supabase
    .from('cycle_guidance')
    .select('phase, dos, donts, friend_suggestions, generated_at')
    .maybeSingle();
  if (error) {
    throw error;
  }
  if (!data) {
    return null;
  }
  return {
    phase: typeof data.phase === 'string' ? data.phase : null,
    dos: toStringArray(data.dos),
    donts: toStringArray(data.donts),
    friend_suggestions: toFriendSuggestions(data.friend_suggestions),
    generated_at: typeof data.generated_at === 'string' ? data.generated_at : '',
  };
};
