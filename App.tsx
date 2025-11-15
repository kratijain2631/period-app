import { StatusBar } from 'expo-status-bar';
import AuthScreen from './app/features/auth/screens/AuthScreen';
import CompanionIntroScreen from './app/features/companion/screens/CompanionIntroScreen';
import FeedScreen from './app/features/feed/screens/FeedScreen';
import { useCycleSyncLifecycle } from './app/services/healthkit/syncHealthData';
import {
  selectHasSeenCompanionIntro,
  selectHealthPermissions,
  selectSession,
  useSessionStore,
} from './app/state/sessionStore';

export default function App() {
  useCycleSyncLifecycle();
  const session = useSessionStore(selectSession);
  const hasSeenIntro = useSessionStore(selectHasSeenCompanionIntro);
  const permissions = useSessionStore(selectHealthPermissions);

  let content = <AuthScreen />;
  if (session) {
    if (!hasSeenIntro || !permissions.granted) {
      content = <CompanionIntroScreen />;
    } else {
      content = <FeedScreen />;
    }
  }

  return (
    <>
      <StatusBar style="auto" />
      {content}
    </>
  );
}
