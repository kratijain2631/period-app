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

type SessionState = {
  session: Session | null;
  hasSeenCompanionIntro: boolean;
  permissions: HealthPermissionsState;
  isHydrating: boolean;
  setSession: (session: Session | null) => void;
  markCompanionIntroSeen: () => void;
  setHealthPermissions: (nextState: Partial<HealthPermissionsState>) => void;
  setHydrating: (isHydrating: boolean) => void;
  reset: () => void;
};

const initialPermissions: HealthPermissionsState = {
  granted: false,
  lastPromptedAt: undefined,
};

const persistOptions: PersistOptions<SessionState> = {
  name: 'session-store',
  storage: createJSONStorage<SessionState>(() => AsyncStorage),
  partialize: (state) => ({
    session: state.session,
    hasSeenCompanionIntro: state.hasSeenCompanionIntro,
    permissions: state.permissions,
  }),
  version: 2,
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
        isHydrating: false,
      } as SessionState;
    }
    if (version < 2) {
      return {
        ...state,
        isHydrating: false,
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
      isHydrating: true,
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
      setHydrating: (isHydrating) => set({ isHydrating }),
      reset: () =>
        set({
          session: null,
          hasSeenCompanionIntro: false,
          permissions: initialPermissions,
          isHydrating: false,
        }),
    }),
    persistOptions,
  ),
);

export const selectSession = (state: SessionState) => state.session;
export const selectHasSeenCompanionIntro = (state: SessionState) => state.hasSeenCompanionIntro;
export const selectHealthPermissions = (state: SessionState) => state.permissions;
export const selectIsHydrating = (state: SessionState) => state.isHydrating;
