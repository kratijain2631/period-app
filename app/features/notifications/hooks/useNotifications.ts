import { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NotificationRow } from '../../../services/supabase/notifications';
import {
  fetchNotifications,
  subscribeToNotifications,
} from '../../../services/supabase/notifications';
import {
  fetchAcceptedFriendRequests,
  fetchInboundFriendRequests,
  fetchFriendRequestProfiles,
  respondToFriendRequest,
  type FriendRequestRow,
} from '../../../services/supabase/friendRequests';
import { useSessionStore } from '../../../state/sessionStore';

export type AcceptanceNotification = {
  id: string;
  requestId: string;
  name: string;
  createdAt: string;
};

const seenAcceptedKey = (userId: string) => `seen-accepted-requests:${userId}`;

const formatAcceptanceName = (alias?: string | null, fullName?: string | null) => {
  const name = fullName?.trim();
  if (name) {
    return name;
  }
  const trimmedAlias = alias?.trim();
  if (trimmedAlias) {
    return trimmedAlias.startsWith('@') ? trimmedAlias : `@${trimmedAlias}`;
  }
  return 'A friend';
};

export const useNotifications = () => {
  const session = useSessionStore((state) => state.session);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequestRow[]>([]);
  const [requestProfileMap, setRequestProfileMap] = useState<
    Record<string, { alias?: string | null }>
  >({});
  const [acceptances, setAcceptances] = useState<AcceptanceNotification[]>([]);

  // Detect "your friend request was accepted" client-side, on refresh — no
  // realtime/edge function needed. We diff your accepted *outbound* requests
  // against a locally-stored "seen" set; anything new becomes a notification.
  // On first run we baseline every existing acceptance as seen so pre-existing
  // friends don't flood the bell.
  const loadAcceptances = useCallback(async () => {
    if (!session?.userId) {
      setAcceptances([]);
      return;
    }
    try {
      const accepted = await fetchAcceptedFriendRequests();
      const outbound = accepted.filter((row) => row.from_user_id === session.userId);
      const key = seenAcceptedKey(session.userId);
      const raw = await AsyncStorage.getItem(key);
      if (raw === null) {
        // First run for this account: establish a baseline, notify nothing.
        await AsyncStorage.setItem(key, JSON.stringify(outbound.map((row) => row.id)));
        setAcceptances([]);
        return;
      }
      const seen = new Set<string>(JSON.parse(raw) as string[]);
      const unseen = outbound.filter((row) => !seen.has(row.id));
      if (unseen.length === 0) {
        setAcceptances([]);
        return;
      }
      const profiles = await fetchFriendRequestProfiles(unseen.map((row) => row.id));
      const nameByRequestId = new Map<string, string>();
      profiles.forEach((profile) => {
        nameByRequestId.set(profile.request_id, formatAcceptanceName(profile.alias, profile.full_name));
      });
      setAcceptances(
        unseen.map((row) => ({
          id: `accept-${row.id}`,
          requestId: row.id,
          name: nameByRequestId.get(row.id) ?? 'A friend',
          createdAt: row.updated_at,
        })),
      );
    } catch (error) {
      console.warn('[notifications] Failed to load acceptances', error);
    }
  }, [session?.userId]);

  const markAcceptancesSeen = useCallback(async () => {
    if (!session?.userId || acceptances.length === 0) {
      return;
    }
    const key = seenAcceptedKey(session.userId);
    try {
      const raw = await AsyncStorage.getItem(key);
      const seen = raw ? (JSON.parse(raw) as string[]) : [];
      const next = Array.from(new Set([...seen, ...acceptances.map((item) => item.requestId)]));
      await AsyncStorage.setItem(key, JSON.stringify(next));
    } catch (error) {
      console.warn('[notifications] Failed to persist seen acceptances', error);
    }
    setAcceptances([]);
  }, [acceptances, session?.userId]);

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
    await Promise.all([loadNotifications(), loadFriendRequests(), loadAcceptances()]);
  }, [loadNotifications, loadFriendRequests, loadAcceptances]);

  useEffect(() => {
    if (!session) {
      setNotifications([]);
      setFriendRequests([]);
      setRequestProfileMap({});
      setAcceptances([]);
      return;
    }

    loadNotifications();
    loadFriendRequests();
    loadAcceptances();

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
  }, [loadAcceptances, loadFriendRequests, loadNotifications, session]);

  const unreadCount = useMemo(
    () => notifications.length + friendRequests.length + acceptances.length,
    [acceptances.length, friendRequests.length, notifications.length],
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
    acceptances,
    markAcceptancesSeen,
    respondToFriendRequest: handleRespond,
    reload,
  };
};
