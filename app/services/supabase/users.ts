import { isSupabaseConfigured, supabase } from './client';
import {
  DEFAULT_AUTO_POST_SETTINGS,
  resolveAutoPostSettings,
  type AutoPostSettings,
} from '../healthkit/autoPostSettings';

export type UserProfilePayload = {
  appleUserId?: string;
  email?: string;
  fullName?: string;
  alias?: string;
  bio?: string;
  avatarUrl?: string;
  avatarStyle?: string;
  avatarPrompt?: string;
  autoPostPeriodDays?: boolean;
  autoPostPeriodStartOnly?: boolean;
  autoPostPhaseTransitions?: boolean;
};

export type UserProfileRow = {
  id: string;
  full_name?: string | null;
  email?: string | null;
  alias?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  avatar_style?: string | null;
  avatar_prompt?: string | null;
  auto_post_period_days?: boolean | null;
  auto_post_period_start_only?: boolean | null;
  auto_post_phase_transitions?: boolean | null;
};

export type UserSearchResult = {
  id: string;
  full_name?: string | null;
  alias?: string | null;
};

const PROFILE_SELECT_BASE =
  'id, full_name, email, alias, bio, avatar_url, avatar_style, avatar_prompt';
const PROFILE_SELECT_WITH_AUTO_POST = `${PROFILE_SELECT_BASE}, auto_post_period_days, auto_post_period_start_only, auto_post_phase_transitions`;

const isMissingAutoPostColumnError = (error: unknown) => {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const maybeError = error as { code?: string; message?: string | null; details?: string | null };
  if (maybeError.code !== '42703' && maybeError.code !== 'PGRST204') {
    return false;
  }
  const message = maybeError.message?.toLowerCase() ?? '';
  const details = maybeError.details?.toLowerCase() ?? '';
  return (
    message.includes('users.auto_post_') ||
    message.includes('auto_post_') ||
    details.includes('auto_post_')
  );
};

const withDefaultAutoPostSettings = (row: UserProfileRow): UserProfileRow => ({
  ...row,
  auto_post_period_days:
    typeof row.auto_post_period_days === 'boolean'
      ? row.auto_post_period_days
      : DEFAULT_AUTO_POST_SETTINGS.postPeriodDays,
  auto_post_period_start_only:
    typeof row.auto_post_period_start_only === 'boolean'
      ? row.auto_post_period_start_only
      : DEFAULT_AUTO_POST_SETTINGS.postOnlyPeriodStart,
  auto_post_phase_transitions:
    typeof row.auto_post_phase_transitions === 'boolean'
      ? row.auto_post_phase_transitions
      : DEFAULT_AUTO_POST_SETTINGS.postPhaseTransitions,
});

export const hasRemoteAutoPostSettings = (row: UserProfileRow | null | undefined): boolean => {
  if (!row) {
    return false;
  }
  return (
    Object.prototype.hasOwnProperty.call(row, 'auto_post_period_days') &&
    Object.prototype.hasOwnProperty.call(row, 'auto_post_period_start_only') &&
    Object.prototype.hasOwnProperty.call(row, 'auto_post_phase_transitions')
  );
};

const buildUpdate = (
  userId: string,
  payload: UserProfilePayload,
  fallbackEmail?: string | null,
) => {
  const update: {
    id: string;
    updated_at: string;
    email?: string;
    apple_user_id?: string;
    full_name?: string;
    alias?: string;
    bio?: string;
    avatar_url?: string;
    avatar_style?: string;
    avatar_prompt?: string;
    auto_post_period_days?: boolean;
    auto_post_period_start_only?: boolean;
    auto_post_phase_transitions?: boolean;
  } = {
    id: userId,
    updated_at: new Date().toISOString(),
  };

  const resolvedEmail = payload.email ?? fallbackEmail;
  if (resolvedEmail) {
    update.email = resolvedEmail;
  }
  if (payload.appleUserId) {
    update.apple_user_id = payload.appleUserId;
  }
  if (payload.fullName) {
    update.full_name = payload.fullName;
  }
  if (payload.alias) {
    update.alias = payload.alias;
  }
  if (payload.bio) {
    update.bio = payload.bio;
  }
  if (payload.avatarUrl) {
    update.avatar_url = payload.avatarUrl;
  }
  if (payload.avatarStyle) {
    update.avatar_style = payload.avatarStyle;
  }
  if (payload.avatarPrompt) {
    update.avatar_prompt = payload.avatarPrompt;
  }
  if (payload.autoPostPeriodDays !== undefined) {
    update.auto_post_period_days = payload.autoPostPeriodDays;
  }
  if (payload.autoPostPeriodStartOnly !== undefined) {
    update.auto_post_period_start_only = payload.autoPostPeriodStartOnly;
  }
  if (payload.autoPostPhaseTransitions !== undefined) {
    update.auto_post_phase_transitions = payload.autoPostPhaseTransitions;
  }

  return update;
};

export const upsertCurrentUserProfile = async (payload: UserProfilePayload) => {
  if (!isSupabaseConfigured) {
    return;
  }

  const { data, error } = await supabase.auth.getUser();
  if (error) {
    throw error;
  }
  if (!data.user) {
    throw new Error('Supabase user is not available.');
  }

  const update = buildUpdate(data.user.id, payload, data.user.email);
  const { error: upsertError } = await supabase.from('users').upsert(update, {
    onConflict: 'id',
  });
  if (upsertError) {
    throw upsertError;
  }
};

export const fetchCurrentUserProfile = async (): Promise<UserProfileRow | null> => {
  if (!isSupabaseConfigured) {
    return null;
  }
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) {
    throw userError;
  }
  if (!userData.user) {
    return null;
  }

  let data: UserProfileRow | null = null;
  const { data: withAutoPostData, error: withAutoPostError } = await supabase
    .from('users')
    .select(PROFILE_SELECT_WITH_AUTO_POST)
    .eq('id', userData.user.id)
    .maybeSingle();
  if (withAutoPostError) {
    if (!isMissingAutoPostColumnError(withAutoPostError)) {
      throw withAutoPostError;
    }
    const { data: legacyData, error: legacyError } = await supabase
      .from('users')
      .select(PROFILE_SELECT_BASE)
      .eq('id', userData.user.id)
      .maybeSingle();
    if (legacyError) {
      throw legacyError;
    }
    data = legacyData ? (legacyData as UserProfileRow) : null;
  } else {
    data = withAutoPostData ? withDefaultAutoPostSettings(withAutoPostData as UserProfileRow) : null;
  }

  if (data) {
    return data;
  }
  return {
    id: userData.user.id,
    email: userData.user.email,
    alias:
      typeof userData.user.user_metadata?.alias === 'string'
        ? userData.user.user_metadata.alias
        : null,
    full_name:
      typeof userData.user.user_metadata?.full_name === 'string'
        ? userData.user.user_metadata.full_name
        : null,
    bio: null,
    avatar_url: null,
    avatar_style: null,
    avatar_prompt: null,
    auto_post_period_days: DEFAULT_AUTO_POST_SETTINGS.postPeriodDays,
    auto_post_period_start_only: DEFAULT_AUTO_POST_SETTINGS.postOnlyPeriodStart,
    auto_post_phase_transitions: DEFAULT_AUTO_POST_SETTINGS.postPhaseTransitions,
  };
};

export const fetchUserProfilesByIds = async (ids: string[]): Promise<UserProfileRow[]> => {
  if (!isSupabaseConfigured || ids.length === 0) {
    return [];
  }
  const { data: withAutoPostData, error: withAutoPostError } = await supabase
    .from('users')
    .select(PROFILE_SELECT_WITH_AUTO_POST)
    .in('id', ids);
  if (withAutoPostError) {
    if (!isMissingAutoPostColumnError(withAutoPostError)) {
      throw withAutoPostError;
    }
    const { data: legacyData, error: legacyError } = await supabase
      .from('users')
      .select(PROFILE_SELECT_BASE)
      .in('id', ids);
    if (legacyError) {
      throw legacyError;
    }
    return ((legacyData as UserProfileRow[]) ?? []).map(withDefaultAutoPostSettings);
  }
  return ((withAutoPostData as UserProfileRow[]) ?? []).map(withDefaultAutoPostSettings);
};

export type UserProfileUpdate = {
  fullName?: string | null;
  alias?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  avatarStyle?: string | null;
  avatarPrompt?: string | null;
  autoPostPeriodDays?: boolean;
  autoPostPeriodStartOnly?: boolean;
  autoPostPhaseTransitions?: boolean;
};

export const updateCurrentUserProfile = async (
  payload: UserProfileUpdate,
): Promise<UserProfileRow | null> => {
  if (!isSupabaseConfigured) {
    return null;
  }
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) {
    throw userError;
  }
  if (!userData.user) {
    throw new Error('Supabase user is not available.');
  }

  const update: Record<string, string | null | boolean> = {
    updated_at: new Date().toISOString(),
  };

  if (payload.fullName !== undefined) {
    update.full_name = payload.fullName ?? null;
  }
  if (payload.alias !== undefined) {
    update.alias = payload.alias ?? null;
  }
  if (payload.bio !== undefined) {
    update.bio = payload.bio ?? null;
  }
  if (payload.avatarUrl !== undefined) {
    update.avatar_url = payload.avatarUrl ?? null;
  }
  if (payload.avatarStyle !== undefined) {
    update.avatar_style = payload.avatarStyle ?? null;
  }
  if (payload.avatarPrompt !== undefined) {
    update.avatar_prompt = payload.avatarPrompt ?? null;
  }
  if (payload.autoPostPeriodDays !== undefined) {
    update.auto_post_period_days = payload.autoPostPeriodDays;
  }
  if (payload.autoPostPeriodStartOnly !== undefined) {
    update.auto_post_period_start_only = payload.autoPostPeriodStartOnly;
  }
  if (payload.autoPostPhaseTransitions !== undefined) {
    update.auto_post_phase_transitions = payload.autoPostPhaseTransitions;
  }

  const { error } = await supabase
    .from('users')
    .update(update)
    .eq('id', userData.user.id);

  if (error) {
    throw error;
  }

  return fetchCurrentUserProfile();
};

export const fetchCurrentAutoPostSettings = async (): Promise<AutoPostSettings | null> => {
  const profile = await fetchCurrentUserProfile();
  if (!hasRemoteAutoPostSettings(profile)) {
    return null;
  }
  return resolveAutoPostSettings(profile);
};

export const saveCurrentUserAutoPostSettings = async (
  settings: AutoPostSettings,
): Promise<AutoPostSettings> => {
  try {
    await updateCurrentUserProfile({
      autoPostPeriodDays: settings.postPeriodDays,
      autoPostPeriodStartOnly: settings.postOnlyPeriodStart,
      autoPostPhaseTransitions: settings.postPhaseTransitions,
    });
  } catch (error) {
    if (isMissingAutoPostColumnError(error)) {
      console.warn('[auto-post-settings] Remote columns unavailable; saved locally only');
    } else {
      console.warn('[auto-post-settings] Remote save failed; saved locally only', error);
    }
  }
  return settings;
};

export const searchUsersByAliasOrEmail = async (
  query: string,
  limit = 5,
): Promise<UserSearchResult[]> => {
  if (!isSupabaseConfigured) {
    return [];
  }
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) {
    return [];
  }
  const { data, error } = await supabase.rpc('search_users', {
    search: trimmed,
    max_results: limit,
  });
  if (error) {
    throw new Error(`[search_users] ${error.message}`);
  }
  return (data as UserSearchResult[]) ?? [];
};

export const updateUserAlias = async (alias: string) => {
  if (!isSupabaseConfigured) {
    return;
  }
  const trimmed = alias.trim();
  if (!trimmed) {
    throw new Error('Alias cannot be empty.');
  }
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    throw error;
  }
  if (!data.user) {
    throw new Error('Supabase user is not available.');
  }
  const { error: updateError } = await supabase
    .from('users')
    .update({ alias: trimmed, updated_at: new Date().toISOString() })
    .eq('id', data.user.id);
  if (updateError) {
    throw updateError;
  }
};
