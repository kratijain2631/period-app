import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { useEffect } from 'react';
import { registerDeviceToken, revokeDeviceToken } from '../supabase/deviceTokens';
import { useSessionStore } from '../../state/sessionStore';
import { navigationRef } from '../../navigation/navigationRef';

const TOKEN_STORAGE_KEY = 'device-push-token';
const NAV_RETRY_COUNT = 6;
const NAV_RETRY_DELAY_MS = 500;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    // `shouldShowAlert` is deprecated in newer expo-notifications; `shouldShowBanner`
    // + `shouldShowList` replace it. Keep all three so behavior is unchanged across
    // SDK versions (foreground notifications show as a banner and in the list).
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const getProjectId = () =>
  Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;

const registerForPushNotificationsAsync = async () => {
  if (!Device.isDevice) {
    console.warn('[push] Must use a physical device for push notifications');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    console.warn('[push] Notification permission not granted');
    return null;
  }

  const projectId = getProjectId();
  const tokenResponse = await Notifications.getExpoPushTokenAsync({
    projectId,
  });
  return tokenResponse.data;
};

const navigateFromNotification = (data: Record<string, unknown>) => {
  // The container ref is untyped (no RootParamList), so `navigate` resolves to a
  // never-typed signature. Cast the function, not the args, to pass name + params.
  const navigate = navigationRef.navigate as (name: string, params?: object) => void;
  if (navigationRef.isReady()) {
    navigate('MainTabs', { screen: 'Home', params: { notification: data } });
    return;
  }

  let attempts = 0;
  const interval = setInterval(() => {
    attempts += 1;
    if (navigationRef.isReady()) {
      navigate('MainTabs', { screen: 'Home', params: { notification: data } });
      clearInterval(interval);
    } else if (attempts >= NAV_RETRY_COUNT) {
      clearInterval(interval);
    }
  }, NAV_RETRY_DELAY_MS);
};

export const usePushNotifications = () => {
  const session = useSessionStore((state) => state.session);

  useEffect(() => {
    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data ?? {};
      navigateFromNotification(data as Record<string, unknown>);
    });

    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (!response) {
          return;
        }
        const data = response.notification.request.content.data ?? {};
        navigateFromNotification(data as Record<string, unknown>);
      })
      .catch((error) => {
        console.warn('[push] Failed to read last notification response', error);
      });

    return () => {
      responseSubscription.remove();
    };
  }, []);

  useEffect(() => {
    const run = async () => {
      if (!session) {
        const existing = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
        if (existing) {
          await revokeDeviceToken(existing).catch((error) =>
            console.warn('[push] Failed to revoke device token', error),
          );
          await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
        }
        return;
      }

      const token = await registerForPushNotificationsAsync();
      if (!token) {
        return;
      }
      const stored = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
      if (stored && stored !== token) {
        await revokeDeviceToken(stored).catch((error) =>
          console.warn('[push] Failed to revoke old device token', error),
        );
      }
      await AsyncStorage.setItem(TOKEN_STORAGE_KEY, token);
      await registerDeviceToken(token, Platform.OS).catch((error) =>
        console.warn('[push] Failed to register device token', error),
      );
    };

    run().catch((error) => console.warn('[push] Failed to manage device token', error));
  }, [session]);
};
