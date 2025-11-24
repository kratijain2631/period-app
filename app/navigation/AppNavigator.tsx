import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AuthScreen from '../features/auth/screens/AuthScreen';
import CompanionIntroScreen from '../features/companion/screens/CompanionIntroScreen';
import HomeScreen from '../features/home/screens/HomeScreen';
import {
  selectHasSeenCompanionIntro,
  selectHealthPermissions,
  selectSession,
  useSessionStore,
} from '../state/sessionStore';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  const session = useSessionStore(selectSession);
  const hasSeenIntro = useSessionStore(selectHasSeenCompanionIntro);
  const permissionsGranted = useSessionStore(selectHealthPermissions).granted;

  useEffect(() => {
    console.log(
      `[nav] session=${Boolean(session)} introSeen=${hasSeenIntro} permissions=${permissionsGranted}`,
    );
  }, [session, hasSeenIntro, permissionsGranted]);

  const isAuthed = Boolean(session);
  const needsIntro = isAuthed && (!hasSeenIntro || !permissionsGranted);
  const readyForHome = isAuthed && !needsIntro;

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!isAuthed && <Stack.Screen name="Auth" component={AuthScreen} />}
          {needsIntro && <Stack.Screen name="CompanionIntro" component={CompanionIntroScreen} />}
          {readyForHome && <Stack.Screen name="Home" component={HomeScreen} />}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

export default AppNavigator;
