import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { readCycleSyncEnabled, saveCycleSyncEnabled } from '../../../services/supabase/cyclePrivacy';
import { eraseSyncedCycleData, syncHealthData } from '../../../services/healthkit/syncHealthData';
import { useSessionStore } from '../../../state/sessionStore';
import { requestCyclePermissions } from '../../../services/healthkit/permissions';
import { useSocial } from '../../social/SocialProvider';
import { CyclePermissionError, CyclePrivacyControl } from './CyclePrivacyControl';

export function CyclePrivacySettings({ userId }: { userId: string }) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  const [revision, retry] = useState(0);
  const { feed, refreshCircle, notifications } = useSocial();
  useFocusEffect(useCallback(() => {
    let active = true;
    setEnabled(null);
    setError('');
    readCycleSyncEnabled().then(value => { if (active) setEnabled(value); })
      .catch(() => { if (active) setError('Couldn’t load cycle sharing.'); });
    return () => { active = false; };
  }, [userId, revision]));
  return <CyclePrivacyControl enabled={enabled} error={error} onRetry={() => retry(n => n + 1)} onChange={async next => {
    if (next) {
      const permission = await requestCyclePermissions(false);
      if (!permission.granted) throw new CyclePermissionError(permission.error || 'Allow cycle data access in Apple Health to reconnect.');
      await saveCycleSyncEnabled(userId, true);
      if (useSessionStore.getState().session?.userId === userId) {
        useSessionStore.getState().setHealthPermissions({ granted: true });
        await syncHealthData();
      }
    } else {
      await eraseSyncedCycleData(userId);
    }
    setEnabled(next);
    await Promise.allSettled([refreshCircle(), feed.reload(), notifications.reload()]);
  }} />;
}
