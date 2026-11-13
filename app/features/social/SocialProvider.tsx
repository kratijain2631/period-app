import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { useActivityFeed } from '../feed/hooks/useActivityFeed';
import { useNotifications } from '../notifications/hooks/useNotifications';
import { useSessionStore } from '../../state/sessionStore';
import { loadCircle } from './CircleData';

function useSocialResources(id: string, alias: string | null) {
  const feed = useActivityFeed(id, alias);
  const notifications = useNotifications();
  const [circle, setCircle] = useState<Awaited<ReturnType<typeof loadCircle>>>({ people: [], outgoing: [] });
  const [circleStatus, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const generation = useRef(0);
  const refreshCircle = useCallback(async () => {
    const token = ++generation.current;
    const active = () => token === generation.current && useSessionStore.getState().session?.userId === id;
    try {
      const value = await loadCircle(id);
      if (active()) {
        setCircle(value);
        setStatus('ready');
      }
    } catch {
      if (active()) {
        setCircle({ people: [], outgoing: [] });
        setStatus('error');
      }
    }
  }, [id]);
  // Notifications owns the one friend-request subscription. Acceptance changes also invalidate the graph.
  const changes =
    notifications.friendRequests.map((r) => r.id).join(',') +
    ';' +
    notifications.acceptances.map((r) => r.id).join(',');
  useEffect(() => {
    void refreshCircle();
    return () => {
      generation.current++;
    };
  }, [refreshCircle, changes, notifications.friendshipRevision]);
  useEffect(() => {
    const reload = () => {
      void feed.reload();
      void refreshCircle();
      void notifications.reload();
    };
    void feed.reload();
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') reload();
    }, 60000);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') reload();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [feed.reload, refreshCircle, notifications.reload]);
  const [commentsRevision, setCommentsRevision] = useState(0);
  const commentsChanged = useCallback(() => setCommentsRevision((value) => value + 1), []);
  const respondToRequest = useCallback(
    async (requestId: string, status: 'accepted' | 'declined') => {
      await notifications.respondToFriendRequest(requestId, status);
      await refreshCircle();
    },
    [notifications.respondToFriendRequest, refreshCircle],
  );
  return {
    id,
    feed,
    notifications,
    circle,
    circleStatus,
    refreshCircle,
    respondToRequest,
    commentsRevision,
    commentsChanged,
  };
}
const Social = createContext<ReturnType<typeof useSocialResources> | null>(null);
function OwnedSocial({ id, alias, children }: { id: string; alias: string | null; children: ReactNode }) {
  const value = useSocialResources(id, alias);
  return <Social.Provider value={value}>{children}</Social.Provider>;
}
export function SocialProvider({ children }: { children: ReactNode }) {
  const id = useSessionStore((s) => s.session?.userId);
  const alias = useSessionStore((s) => s.alias);
  const seenIntro = useSessionStore((s) => s.hasSeenCompanionIntro);
  return id && alias && seenIntro ? (
    <OwnedSocial key={id} id={id} alias={alias ?? null}>
      {children}
    </OwnedSocial>
  ) : (
    <>{children}</>
  );
}
export function useSocial() {
  const value = useContext(Social);
  if (!value) throw Error('Signed-in screen requires an account');
  return value;
}
