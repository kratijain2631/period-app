import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { useEffect } from 'react';
import { create } from 'zustand';

export type ConnectionState = {
  isOnline: boolean;
  isInternetReachable: boolean | null;
  lastChangedAt?: string;
  setConnection: (next: Pick<ConnectionState, 'isOnline' | 'isInternetReachable'>) => void;
};

const computeIsOnline = (state: NetInfoState) => {
  if (state.isInternetReachable === false) {
    return false;
  }
  return Boolean(state.isConnected);
};

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  isOnline: true,
  isInternetReachable: null,
  lastChangedAt: undefined,
  setConnection: ({ isOnline, isInternetReachable }) => {
    const prev = get();
    const changed = prev.isOnline !== isOnline || prev.isInternetReachable !== isInternetReachable;
    set({
      isOnline,
      isInternetReachable,
      lastChangedAt: changed ? new Date().toISOString() : prev.lastChangedAt,
    });
  },
}));

export const selectIsOnline = (state: ConnectionState) => state.isOnline;

export const useConnectionWatcher = () => {
  useEffect(() => {
    const handleState = (state: NetInfoState) => {
      useConnectionStore.getState().setConnection({
        isOnline: computeIsOnline(state),
        isInternetReachable: state.isInternetReachable ?? null,
      });
    };

    NetInfo.fetch().then(handleState).catch(() => undefined);
    const unsubscribe = NetInfo.addEventListener(handleState);

    return () => {
      unsubscribe();
    };
  }, []);
};
