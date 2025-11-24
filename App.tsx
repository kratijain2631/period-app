import { StatusBar } from 'expo-status-bar';
import AppNavigator from './app/navigation/AppNavigator';
import { useCycleSyncLifecycle } from './app/services/healthkit/useCycleSyncLifecycle';

export default function App() {
  useCycleSyncLifecycle();

  return (
    <>
      <StatusBar style="auto" />
      <AppNavigator />
    </>
  );
}
