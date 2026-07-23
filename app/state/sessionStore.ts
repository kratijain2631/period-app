import { PersistOptions, createJSONStorage, persist } from 'zustand/middleware';
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Session = {
  userId: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
};

export type HealthPermissionsState = {
  granted: boolean;
  lastPromptedAt?: string;
};

export type AutoPostSettingsState = {
  postPeriodDays: boolean;
  postOnlyPeriodStart: boolean;
  postPhaseTransitions: boolean;
};

type SessionState = {
  session: Session | null;
  hasSeenCompanionIntro: boolean;
  permissions: HealthPermissionsState;
  autoPostSettings: AutoPostSettingsState;
  isHydrating: boolean;
  alias: string | null;
  isProfileHydrating: boolean;
  setSession: (session: Session | null) => void;
  markCompanionIntroSeen: () => void;
  setHealthPermissions: (nextState: Partial<HealthPermissionsState>) => void;
  setAutoPostSettings: (nextSettings: AutoPostSettingsState) => void;
  setHydrating: (isHydrating: boolean) => void;
  setAlias: (alias: string | null) => void;
  setProfileHydrating: (isHydrating: boolean) => void;
  reset: () => void;
};

const initialPermissions: HealthPermissionsState = {
  granted: false,
  lastPromptedAt: undefined,
};

const initialAutoPostSettings: AutoPostSettingsState = {
  postPeriodDays: true,
  postOnlyPeriodStart: false,
  postPhaseTransitions: true,
};

const persistOptions: PersistOptions<SessionState> = {
  name: 'session-store',
  storage: createJSONStorage<SessionState>(() => AsyncStorage),
  partialize: (state) => ({
    session: state.session,
    hasSeenCompanionIntro: state.hasSeenCompanionIntro,
    permissions: state.permissions,
    autoPostSettings: state.autoPostSettings,
    alias: state.alias,
  }),
  version: 4,
  migrate: (persistedState, version) => {
    const state = persistedState as SessionState | undefined;
    if (!state) {
      return persistedState as SessionState;
    }
    if (version < 1) {
      return {
        ...state,
        hasSeenCompanionIntro: state.hasSeenCompanionIntro ?? false,
        permissions: state.permissions ?? initialPermissions,
        autoPostSettings: initialAutoPostSettings,
        isHydrating: false,
        alias: null,
        isProfileHydrating: false,
      } as SessionState;
    }
    if (version < 2) {
      return {
        ...state,
        autoPostSettings: initialAutoPostSettings,
        isHydrating: false,
        alias: null,
        isProfileHydrating: false,
      } as SessionState;
    }
    if (version < 3) {
      return {
        ...state,
        autoPostSettings: initialAutoPostSettings,
        alias: null,
        isProfileHydrating: false,
      } as SessionState;
    }
    if (version < 4) {
      return {
        ...state,
        autoPostSettings: initialAutoPostSettings,
      } as SessionState;
    }
    return state;
  },
};

export const useSessionStore = create<SessionState>()(
  persist<SessionState>(
    (set) => ({
      session: null,
      hasSeenCompanionIntro: false,
      permissions: initialPermissions,
      autoPostSettings: initialAutoPostSettings,
      isHydrating: true,
      alias: null,
      isProfileHydrating: false,
      setSession: (session) => set({ session }),
      markCompanionIntroSeen: () => set({ hasSeenCompanionIntro: true }),
      setHealthPermissions: (nextState) =>
        set((state) => ({
          permissions: {
            ...state.permissions,
            ...nextState,
            lastPromptedAt:
              nextState.lastPromptedAt !== undefined
                ? nextState.lastPromptedAt
                : state.permissions.lastPromptedAt,
          },
        })),
      setAutoPostSettings: (autoPostSettings) => set({ autoPostSettings }),
      setHydrating: (isHydrating) => set({ isHydrating }),
      setAlias: (alias) => set({ alias }),
      setProfileHydrating: (isProfileHydrating) => set({ isProfileHydrating }),
      reset: () =>
        set({
          session: null,
          hasSeenCompanionIntro: false,
          permissions: initialPermissions,
          autoPostSettings: initialAutoPostSettings,
          isHydrating: false,
          alias: null,
          isProfileHydrating: false,
        }),
    }),
    persistOptions,
  ),
);

export const selectSession = (state: SessionState) => state.session;
export const selectHasSeenCompanionIntro = (state: SessionState) => state.hasSeenCompanionIntro;
export const selectHealthPermissions = (state: SessionState) => state.permissions;
export const selectAutoPostSettings = (state: SessionState) => state.autoPostSettings;
export const selectIsHydrating = (state: SessionState) => state.isHydrating;
export const selectAlias = (state: SessionState) => state.alias;
export const selectIsProfileHydrating = (state: SessionState) => state.isProfileHydrating;
