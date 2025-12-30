import { useEffect, useMemo, useState } from 'react';
import type { NotificationRow } from '../../../services/supabase/notifications';
import {
  fetchNotifications,
  subscribeToNotifications,
} from '../../../services/supabase/notifications';
import { useSessionStore } from '../../../state/sessionStore';

export const useNotifications = () => {
  const session = useSessionStore((state) => state.session);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);

  useEffect(() => {
    if (!session) {
      setNotifications([]);
      return;
    }

    let active = true;
    fetchNotifications()
      .then((rows) => {
        if (active) {
          setNotifications(rows);
        }
      })
      .catch((error) => {
        console.warn('[notifications] Failed to fetch', error);
      });

    const channel = subscribeToNotifications((notification) => {
      setNotifications((current) => {
        if (current.some((item) => item.id === notification.id)) {
          return current;
        }
        return [notification, ...current];
      });
    });

    return () => {
      active = false;
      channel?.unsubscribe();
    };
  }, [session]);

  const unreadCount = useMemo(() => notifications.length, [notifications.length]);

  return {
    notifications,
    unreadCount,
  };
};
