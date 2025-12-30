import { useEffect } from 'react';
import { isSupabaseConfigured, supabase } from './client';
import { getMappedSession } from './auth';
import { useSessionStore } from '../../state/sessionStore';

export const useSupabaseAuth = () => {
  const setSession = useSessionStore((state) => state.setSession);
  const setHydrating = useSessionStore((state) => state.setHydrating);

  useEffect(() => {
    let isMounted = true;
    setHydrating(true);

    if (!isSupabaseConfigured) {
      setSession(null);
      setHydrating(false);
      return () => {
        isMounted = false;
      };
    }

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!isMounted) {
          return;
        }
        if (error) {
          console.warn('[supabase] Failed to load session', error.message);
          setSession(null);
          return;
        }
        setSession(getMappedSession(data.session));
      })
      .finally(() => {
        if (isMounted) {
          setHydrating(false);
        }
      });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) {
        return;
      }
      setSession(getMappedSession(session));
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, [setHydrating, setSession]);
};
