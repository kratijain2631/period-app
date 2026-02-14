import { useEffect } from 'react';
import { fetchCurrentUserProfile, hasRemoteAutoPostSettings } from './users';
import { useSessionStore } from '../../state/sessionStore';
import { resolveAutoPostSettings } from '../healthkit/autoPostSettings';

export const useProfileGate = () => {
  const session = useSessionStore((state) => state.session);
  const setAlias = useSessionStore((state) => state.setAlias);
  const setAutoPostSettings = useSessionStore((state) => state.setAutoPostSettings);
  const setProfileHydrating = useSessionStore((state) => state.setProfileHydrating);

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      if (!session) {
        setAlias(null);
        setProfileHydrating(false);
        return;
      }
      setProfileHydrating(true);
      try {
        const profile = await fetchCurrentUserProfile();
        if (!isMounted) {
          return;
        }
        const resolvedAlias = profile?.alias?.trim() || null;
        setAlias(resolvedAlias);
        if (hasRemoteAutoPostSettings(profile)) {
          setAutoPostSettings(resolveAutoPostSettings(profile));
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }
        console.warn('[profile] Failed to hydrate alias', error);
        setAlias(null);
      } finally {
        if (isMounted) {
          setProfileHydrating(false);
        }
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [session, setAlias, setAutoPostSettings, setProfileHydrating]);
};
