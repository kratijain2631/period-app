import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { useFonts } from 'expo-font';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import { Nunito_700Bold, Nunito_800ExtraBold } from '@expo-google-fonts/nunito';
import AppNavigator from './app/navigation/AppNavigator';
import ErrorBoundary from './app/components/ErrorBoundary';
import BrandSplash from './app/components/brand/BrandSplash';
import { useCycleSyncLifecycle } from './app/services/healthkit/useCycleSyncLifecycle';
import { useSupabaseAuth } from './app/services/supabase/useSupabaseAuth';
import { useProfileGate } from './app/services/supabase/useProfileGate';
import { usePushNotifications } from './app/services/notifications/usePushNotifications';
import { useConnectionWatcher } from './app/state/connectionStore';
import { useBoopQueueSync } from './app/services/boops/useBoopQueueSync';

function AppInner() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });

  useConnectionWatcher();
  useCycleSyncLifecycle();
  useSupabaseAuth();
  useProfileGate();
  usePushNotifications();
  useBoopQueueSync();

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="auto" />
      <AppNavigator />
    </>
  );
}

// ErrorBoundary must wrap the component that runs the launch hooks (AppInner),
// not sit inside it — a boundary only catches errors thrown by its descendants.
export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  return (
    <ErrorBoundary>
      <AppInner />
      {showSplash ? <BrandSplash onDone={() => setShowSplash(false)} /> : null}
    </ErrorBoundary>
  );
}
