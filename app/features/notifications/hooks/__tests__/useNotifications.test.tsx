import React from 'react';
import { useNotifications } from '../useNotifications';
import {
  fetchInboundFriendRequests,
  respondToFriendRequest,
  subscribeToFriendRequests,
  type FriendRequestRow,
} from '../../../../services/supabase/friendRequests';

const mockSession = { userId: 'viewer' };
jest.mock('../../../../state/sessionStore', () => ({
  useSessionStore: (select: (state: unknown) => unknown) => select({ session: mockSession }),
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue('[]'),
  setItem: jest.fn(),
}));
jest.mock('../../../../services/supabase/notifications', () => ({
  fetchNotifications: jest.fn().mockResolvedValue([]),
  subscribeToNotifications: jest.fn(),
  markNotificationsRead: jest.fn(),
}));
jest.mock('../../../../services/supabase/friendRequests', () => ({
  fetchAcceptedFriendRequests: jest.fn().mockResolvedValue([]),
  fetchInboundFriendRequests: jest.fn(),
  fetchFriendRequestProfiles: jest.fn().mockResolvedValue([{ other_user_id: 'sender', alias: 'rory' }]),
  respondToFriendRequest: jest.fn(),
  subscribeToFriendRequests: jest.fn(),
}));
const { act, create } = require('react-test-renderer');
const row: FriendRequestRow = {
  id: 'request',
  from_user_id: 'sender',
  to_user_id: 'viewer',
  status: 'pending',
  created_at: '2026-11-12T12:00:00Z',
  updated_at: '2026-11-12T12:00:00Z',
};
let inbox: ReturnType<typeof useNotifications>;
function Harness() {
  inbox = useNotifications();
  return null;
}

it.each(['accepted', 'declined'] as const)(
  'keeps the bell and both request lists current after a request is %s',
  async (status) => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    jest.clearAllMocks();
    let change!: () => void;
    jest.mocked(subscribeToFriendRequests).mockImplementation((callback) => {
      change = callback;
      return null;
    });
    const read = jest.mocked(fetchInboundFriendRequests).mockResolvedValue([]);
    let root: ReturnType<typeof create>;
    await act(async () => {
      root = create(<Harness />);
    });
    try {
      read.mockResolvedValueOnce([row]);
      await act(async () => change());
      expect(inbox.unreadCount).toBe(1);
      expect(inbox.requestProfileMap.sender.alias).toBe('rory');
      await act(async () => inbox.markAllRead());
      expect(inbox.friendRequests.map((r) => r.id)).toEqual(['request']);
      expect(inbox.unreadCount).toBe(1);
      // A rejected mutation leaves the pending request usable.
      jest.mocked(respondToFriendRequest).mockRejectedValueOnce(new Error('offline'));
      await act(async () => {
        await expect(inbox.respondToFriendRequest('request', status)).rejects.toThrow('offline');
      });
      expect(inbox.friendRequests).toHaveLength(1);
      let late!: (rows: FriendRequestRow[]) => void;
      read.mockReturnValueOnce(
        new Promise((resolve) => {
          late = resolve;
        }),
      );
      await act(async () => change());
      await act(async () => inbox.respondToFriendRequest('request', status));
      await act(async () => late([row]));
      expect(inbox.friendRequests).toEqual([]);
      expect(inbox.unreadCount).toBe(0);
    } finally {
      await act(async () => root.unmount());
    }
  },
);
