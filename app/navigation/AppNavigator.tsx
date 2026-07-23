import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Easing, StyleSheet, View } from 'react-native';
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
import { brand } from '../theme/brand';

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
  const sceneOpacity = useRef(new Animated.Value(1)).current;
  const sceneScale = useRef(new Animated.Value(1)).current;
  const sceneTranslateY = useRef(new Animated.Value(0)).current;
  const lastTransitionMsRef = useRef(0);

  const runPageTransition = useCallback(() => {
    const now = Date.now();
    if (now - lastTransitionMsRef.current < 120) {
      return;
    }
    lastTransitionMsRef.current = now;

    sceneOpacity.stopAnimation();
    sceneScale.stopAnimation();
    sceneTranslateY.stopAnimation();

    sceneOpacity.setValue(0.84);
    sceneScale.setValue(0.976);
    sceneTranslateY.setValue(16);

    Animated.parallel([
      Animated.timing(sceneOpacity, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(sceneScale, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(sceneTranslateY, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [sceneOpacity, sceneScale, sceneTranslateY]);

  return (
    <View style={styles.tabsRoot}>
      <Animated.View
        style={[
          styles.tabsScene,
          { opacity: sceneOpacity, transform: [{ scale: sceneScale }, { translateY: sceneTranslateY }] },
        ]}
      >
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarActiveTintColor: brand.colors.accent,
            tabBarInactiveTintColor: '#C5BFB8',
            tabBarStyle: styles.tabBar,
            tabBarItemStyle: styles.tabBarItem,
            tabBarLabelStyle: styles.tabBarLabel,
            tabBarBackground: () => <View style={styles.tabBarBackground} />,
            tabBarIconStyle: styles.tabIcon,
            tabBarIcon: ({ color, size, focused }) => {
              let iconName: keyof typeof Ionicons.glyphMap = 'home-outline';
              if (route.name === 'Home') {
                iconName = 'home-outline';
              } else if (route.name === 'Friends') {
                iconName = 'people-outline';
              } else if (route.name === 'Profile') {
                iconName = 'person-outline';
              }
              return (
                <View style={styles.tabIconWrap}>
                  <View
                    style={[
                      styles.tabIndicator,
                      focused ? styles.tabIndicatorActive : styles.tabIndicatorInactive,
                    ]}
                  />
                  <Ionicons name={iconName} size={size ?? 22} color={color} />
                </View>
              );
            },
          })}
        >
          <Tab.Screen
            name="Home"
            component={HomeStackScreen}
            options={{ tabBarLabel: 'Home' }}
            listeners={{ focus: runPageTransition, tabPress: runPageTransition }}
          />
          <Tab.Screen
            name="Friends"
            component={FriendsStackScreen}
            options={{ tabBarLabel: 'Circle' }}
            listeners={{ focus: runPageTransition, tabPress: runPageTransition }}
          />
          <Tab.Screen
            name="Profile"
            component={ProfileStackScreen}
            options={{ tabBarLabel: 'You' }}
            listeners={{ focus: runPageTransition, tabPress: runPageTransition }}
          />
        </Tab.Navigator>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  tabsRoot: {
    flex: 1,
    backgroundColor: brand.colors.background,
  },
  tabsScene: {
    flex: 1,
  },
  tabBar: {
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    elevation: 0,
    height: 74,
    paddingTop: 8,
    paddingBottom: 8,
    position: 'absolute',
  },
  tabBarBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EDE9E3',
  },
  tabBarItem: {
    paddingVertical: 2,
  },
  tabIcon: {
    marginBottom: 0,
  },
  tabIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    minHeight: 30,
  },
  tabIndicator: {
    width: 24,
    height: 3,
    borderRadius: 999,
    marginBottom: 1,
  },
  tabIndicatorActive: {
    backgroundColor: brand.colors.accent,
  },
  tabIndicatorInactive: {
    backgroundColor: 'transparent',
  },
  tabBarLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 0,
    fontFamily: brand.typography.semibold,
  },
});

export default AppNavigator;
