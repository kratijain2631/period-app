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
import FriendsScreen from '../features/friends/screens/FriendsScreen';
import HomeScreen from '../features/home/screens/HomeScreen';
import ProfileScreen from '../features/profile/screens/ProfileScreen';
import AutoPostSettingsScreen from '../features/profile/screens/AutoPostSettingsScreen';
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
const HomeStack = createNativeStackNavigator();
const FriendsStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();

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
  const needsIntro = isAuthed && !hasSeenIntro;
  const readyForHome = isAuthed && !needsAlias && !needsIntro;

  return (
    <SafeAreaProvider>
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator screenOptions={{ headerShown: false, gestureEnabled: true }}>
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
            <Stack.Screen
              name="FriendSync"
              component={FriendSyncScreen}
              options={{ gestureEnabled: true, fullScreenGestureEnabled: true }}
            />
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

const HomeStackScreen = () => (
  <HomeStack.Navigator screenOptions={{ headerShown: false, gestureEnabled: true }}>
    <HomeStack.Screen name="HomeRoot" component={HomeScreen} />
    <HomeStack.Screen
      name="HomeProfile"
      component={ProfileScreen}
      options={{ gestureEnabled: true, fullScreenGestureEnabled: true }}
    />
    <HomeStack.Screen
      name="AutoPostSettings"
      component={AutoPostSettingsScreen}
      options={{ gestureEnabled: true, fullScreenGestureEnabled: true }}
    />
  </HomeStack.Navigator>
);

const FriendsStackScreen = () => (
  <FriendsStack.Navigator screenOptions={{ headerShown: false, gestureEnabled: true }}>
    <FriendsStack.Screen name="FriendsRoot" component={FriendsScreen} />
  </FriendsStack.Navigator>
);

const ProfileStackScreen = () => (
  <ProfileStack.Navigator screenOptions={{ headerShown: false, gestureEnabled: true }}>
    <ProfileStack.Screen name="ProfileRoot" component={ProfileScreen} />
    <ProfileStack.Screen
      name="AutoPostSettings"
      component={AutoPostSettingsScreen}
      options={{ gestureEnabled: true, fullScreenGestureEnabled: true }}
    />
  </ProfileStack.Navigator>
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
          } else if (route.name === 'Friends') {
            iconName = 'people-outline';
          } else if (route.name === 'Profile') {
            iconName = 'person-outline';
          }
          return <Ionicons name={iconName} size={size ?? 20} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeStackScreen} />
      <Tab.Screen name="Friends" component={FriendsStackScreen} />
      <Tab.Screen name="Profile" component={ProfileStackScreen} />
    </Tab.Navigator>
  );
};

export default AppNavigator;
