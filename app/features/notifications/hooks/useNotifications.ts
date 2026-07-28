import { useCallback, useEffect, useMemo, useState } from 'react';
import type { NotificationRow } from '../../../services/supabase/notifications';
import {
  fetchNotifications,
  subscribeToNotifications,
} from '../../../services/supabase/notifications';
import {
  fetchInboundFriendRequests,
  fetchFriendRequestProfiles,
  respondToFriendRequest,
  type FriendRequestRow,
} from '../../../services/supabase/friendRequests';
import { useSessionStore } from '../../../state/sessionStore';

export const useNotifications = () => {
  const session = useSessionStore((state) => state.session);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequestRow[]>([]);
  const [requestProfileMap, setRequestProfileMap] = useState<
    Record<string, { alias?: string | null }>
  >({});

  const loadFriendRequests = useCallback(async () => {
    if (!session) {
      setFriendRequests([]);
      setRequestProfileMap({});
      return;
    }
    try {
      const inbound = await fetchInboundFriendRequests();
      setFriendRequests(inbound);
      const requestIds = inbound.map((row) => row.id);
      if (requestIds.length === 0) {
        setRequestProfileMap({});
        return;
      }
      const profiles = await fetchFriendRequestProfiles(requestIds);
      const nextMap: Record<string, { alias?: string | null }> = {};
      profiles.forEach((profile) => {
        nextMap[profile.other_user_id] = {
          alias: profile.alias ?? null,
        };
      });
      setRequestProfileMap(nextMap);
    } catch (error) {
      console.warn('[notifications] Failed to load friend requests', error);
    }
  }, [session]);

  const loadNotifications = useCallback(async () => {
    if (!session) {
      setNotifications([]);
      return;
    }
    try {
      const rows = await fetchNotifications();
      setNotifications(rows);
    } catch (error) {
      console.warn('[notifications] Failed to fetch', error);
    }
  }, [session]);

  const reload = useCallback(async () => {
    await Promise.all([loadNotifications(), loadFriendRequests()]);
  }, [loadNotifications, loadFriendRequests]);

  useEffect(() => {
    if (!session) {
      setNotifications([]);
      setFriendRequests([]);
      setRequestProfileMap({});
      return;
    }

    loadNotifications();
    loadFriendRequests();

    const channel = subscribeToNotifications((notification) => {
      setNotifications((current) => {
        if (current.some((item) => item.id === notification.id)) {
          return current;
        }
        return [notification, ...current];
      });
    });

    return () => {
      channel?.unsubscribe();
    };
  }, [loadFriendRequests, loadNotifications, session]);

  const unreadCount = useMemo(
    () => notifications.length + friendRequests.length,
    [friendRequests.length, notifications.length],
  );

  const handleRespond = useCallback(
    async (requestId: string, status: 'accepted' | 'declined') => {
      try {
        await respondToFriendRequest(requestId, status);
        await loadFriendRequests();
      } catch (error) {
        console.warn('[notifications] Failed to respond to request', error);
      }
    },
    [loadFriendRequests],
  );

  return {
    notifications,
    unreadCount,
    friendRequests,
    requestProfileMap,
    respondToFriendRequest: handleRespond,
    reload,
  };
};
