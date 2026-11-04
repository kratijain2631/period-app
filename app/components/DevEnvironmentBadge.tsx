import { StyleSheet, Text, View } from 'react-native';

/**
 * Dev-build-only pill showing which backend / data source the app is using, so a
 * staging or fake-Health session is never mistaken for the real thing. Renders
 * nothing in release builds.
 */
export const devEnvironmentLabel = (
  isDev: boolean,
  appEnv: string | undefined,
  fakeHealth: string | undefined,
): string | null => {
  if (!isDev) return null;
  const parts: string[] = [];
  if (appEnv && appEnv !== 'production') parts.push(appEnv.toUpperCase());
  if (fakeHealth === 'true') parts.push('FAKE HEALTH');
  return parts.length ? parts.join(' · ') : null;
};

export default function DevEnvironmentBadge() {
  const label = devEnvironmentLabel(
    typeof __DEV__ !== 'undefined' && __DEV__,
    process.env.EXPO_PUBLIC_APP_ENV,
    process.env.EXPO_PUBLIC_FAKE_HEALTH,
  );
  if (!label) return null;
  return (
    <View pointerEvents="none" style={styles.container}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 34,
    alignSelf: 'center',
    backgroundColor: 'rgba(124, 58, 237, 0.88)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    zIndex: 9999,
    elevation: 9999,
  },
  text: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
});
