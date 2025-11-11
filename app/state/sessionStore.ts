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
  setSession: (session: Session | null) => void;
  markCompanionIntroSeen: () => void;
  setHealthPermissions: (nextState: Partial<HealthPermissionsState>) => void;
  reset: () => void;
};

const initialPermissions: HealthPermissionsState = {
  granted: false,
  lastPromptedAt: undefined,
};

const storage: PersistOptions<SessionState>['storage'] = createJSONStorage(() => AsyncStorage);

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      session: null,
      hasSeenCompanionIntro: false,
      permissions: initialPermissions,
      setSession: (session) => set({ session }),
      markCompanionIntroSeen: () => set({ hasSeenCompanionIntro: true }),
      setHealthPermissions: (nextState) =>
        set((state) => ({
          permissions: {
            ...state.permissions,
            ...nextState,
            lastPromptedAt: nextState.lastPromptedAt ?? new Date().toISOString(),
          },
        })),
      reset: () =>
        set({
          session: null,
          hasSeenCompanionIntro: false,
          permissions: initialPermissions,
        }),
    }),
    {
      name: 'session-store',
      storage,
      version: 1,
      migrate: (persistedState, version) => {
        if (!persistedState) return persistedState;
        if (version < 1) {
          return {
            ...persistedState,
            hasSeenCompanionIntro: persistedState.hasSeenCompanionIntro ?? false,
            permissions: {
              granted: false,
              lastPromptedAt: undefined,
            },
          };
        }
        return persistedState;
      },
    },
  ),
);

export const selectSession = (state: SessionState) => state.session;
export const selectHasSeenCompanionIntro = (state: SessionState) => state.hasSeenCompanionIntro;
export const selectHealthPermissions = (state: SessionState) => state.permissions;
