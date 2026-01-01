import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AuthScreen from '../features/auth/screens/AuthScreen';
import CompanionIntroScreen from '../features/companion/screens/CompanionIntroScreen';
import FriendSyncScreen from '../features/friends/screens/FriendSyncScreen';
import FeedScreen from '../features/feed/screens/FeedScreen';
import HomeScreen from '../features/home/screens/HomeScreen';
import ProfileScreen from '../features/profile/screens/ProfileScreen';
import AliasScreen from '../features/profile/screens/AliasScreen';
import { navigationRef } from './navigationRef';
import {
  selectAlias,
  selectHasSeenCompanionIntro,
  selectHealthPermissions,
  selectIsHydrating,
  selectIsProfileHydrating,
  selectSession,
  useSessionStore,
} from '../state/sessionStore';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const AppNavigator = () => {
  const session = useSessionStore(selectSession);
  const hasSeenIntro = useSessionStore(selectHasSeenCompanionIntro);
  const permissionsGranted = useSessionStore(selectHealthPermissions).granted;
  const isHydrating = useSessionStore(selectIsHydrating);
  const alias = useSessionStore(selectAlias);
  const isProfileHydrating = useSessionStore(selectIsProfileHydrating);

  useEffect(() => {
    console.log(
      `[nav] session=${Boolean(session)} introSeen=${hasSeenIntro} permissions=${permissionsGranted}`,
    );
  }, [session, hasSeenIntro, permissionsGranted]);

  const isAuthed = Boolean(session);
  const needsAlias = isAuthed && !alias;
  const needsIntro = isAuthed && (!hasSeenIntro || !permissionsGranted);
  const readyForHome = isAuthed && !needsAlias && !needsIntro;

  return (
    <SafeAreaProvider>
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {(isHydrating || (isAuthed && isProfileHydrating)) && (
            <Stack.Screen
              name="AuthLoading"
              component={AuthLoadingScreen}
              options={{ animation: 'fade' }}
            />
          )}
          {!isHydrating && !isAuthed && <Stack.Screen name="Auth" component={AuthScreen} />}
          {!isHydrating && isAuthed && !isProfileHydrating && needsAlias && (
            <Stack.Screen name="Alias" component={AliasScreen} />
          )}
          {!isHydrating && !needsAlias && needsIntro && (
            <Stack.Screen name="CompanionIntro" component={CompanionIntroScreen} />
          )}
          {!isHydrating && readyForHome && <Stack.Screen name="MainTabs" component={MainTabs} />}
          {!isHydrating && readyForHome && (
            <Stack.Screen name="FriendSync" component={FriendSyncScreen} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

const AuthLoadingScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <ActivityIndicator />
  </View>
);

const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#3d2f8f',
        tabBarInactiveTintColor: '#777',
        tabBarStyle: { backgroundColor: '#fff' },
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home-outline';
          if (route.name === 'Home') {
            iconName = 'home-outline';
          } else if (route.name === 'Feed') {
            iconName = 'people-outline';
          } else if (route.name === 'Profile') {
            iconName = 'person-outline';
          }
          return <Ionicons name={iconName} size={size ?? 20} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Feed" component={FeedScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

export default AppNavigator;
