import { useEffect } from 'react';
import { selectIsOnline, useConnectionStore } from '../../state/connectionStore';
import { flushBoopQueue } from '../supabase/boops';

export const useBoopQueueSync = () => {
  const isOnline = useConnectionStore(selectIsOnline);

  useEffect(() => {
    if (!isOnline) {
      return;
    }
    flushBoopQueue().catch((error) => {
      console.warn('[boop-queue] Flush failed', error);
    });
  }, [isOnline]);
};
