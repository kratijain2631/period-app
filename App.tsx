import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './app/navigation/AppNavigator';
import { useCycleSyncLifecycle } from './app/services/healthkit/useCycleSyncLifecycle';
import { useSupabaseAuth } from './app/services/supabase/useSupabaseAuth';
import { usePushNotifications } from './app/services/notifications/usePushNotifications';
import { useConnectionWatcher } from './app/state/connectionStore';
import { useBoopQueueSync } from './app/services/boops/useBoopQueueSync';

export default function App() {
  useConnectionWatcher();
  useCycleSyncLifecycle();
  useSupabaseAuth();
  usePushNotifications();
  useBoopQueueSync();

  return (
    <>
      <StatusBar style="auto" />
      <AppNavigator />
    </>
  );
}
