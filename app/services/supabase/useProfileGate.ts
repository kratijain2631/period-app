import { useEffect } from 'react';
import { fetchCurrentUserProfile, hasRemoteAutoPostSettings } from './users';
import { useSessionStore } from '../../state/sessionStore';
import { resolveAutoPostSettings } from '../healthkit/autoPostSettings';
import { useConnectionStore } from '../../state/connectionStore';

export const useProfileGate = () => {
  const userId = useSessionStore((state) => state.session?.userId);
  const isHydrating = useSessionStore((state) => state.isHydrating);
  const retryCount = useSessionStore((state) => state.profileRetryCount);
  const isOnline = useConnectionStore((state) => state.isOnline);
  const setAlias = useSessionStore((state) => state.setAlias);
  const setAutoPostSettings = useSessionStore((state) => state.setAutoPostSettings);
  const setProfileHydrating = useSessionStore((state) => state.setProfileHydrating);
  const setProfileLoadError = useSessionStore((state) => state.setProfileLoadError);

  useEffect(() => {
    // Wait for auth restoration before touching the persisted account profile.
    if (isHydrating) return;
    let isMounted = true;
    const isCurrentAccount = () => isMounted && useSessionStore.getState().session?.userId === userId;
    const loadProfile = async () => {
      if (!userId) {
        setAlias(null);
        setProfileLoadError(null);
        setProfileHydrating(false);
        return;
      }
      setProfileHydrating(true);
      setProfileLoadError(null);
      try {
        if (!isOnline) throw new Error('Offline');
        const profile = await fetchCurrentUserProfile();
        if (!isCurrentAccount()) return;
        if (profile && profile.id !== userId) throw new Error('Account changed while loading profile');
        setAlias(profile?.alias?.trim() || null);
        if (hasRemoteAutoPostSettings(profile)) {
          setAutoPostSettings(resolveAutoPostSettings(profile));
        }
      } catch (error) {
        if (!isCurrentAccount()) return;
        console.warn('[profile] Failed to hydrate alias', error);
        // Unavailable is not confirmed missing. Retain this account's alias;
        // without a cached alias, navigation offers retry rather than setup.
        setProfileLoadError('Your profile could not be loaded. Connect to the internet and try again.');
      } finally {
        if (isCurrentAccount()) setProfileHydrating(false);
      }
    };
    void loadProfile();
    return () => { isMounted = false; };
  }, [userId, isHydrating, retryCount, isOnline, setAlias, setAutoPostSettings, setProfileHydrating, setProfileLoadError]);
};
