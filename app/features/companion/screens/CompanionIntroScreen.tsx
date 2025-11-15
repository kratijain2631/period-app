import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Linking,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { requestCyclePermissions } from '../../../services/healthkit/permissions';
import { useSessionStore } from '../../../state/sessionStore';

const CompanionIntroScreen = () => {
  const permissions = useSessionStore((state) => state.permissions);
  const markIntroSeen = useSessionStore((state) => state.markCompanionIntroSeen);
  const [status, setStatus] = useState<string | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    if (permissions.granted) {
      markIntroSeen();
    }
  }, [permissions.granted, markIntroSeen]);

  const subtitle = useMemo(() => {
    if (permissions.granted) {
      return 'You can now sync menstrual flow data securely in the background.';
    }
    if (permissions.lastPromptedAt) {
      return 'Permission is pending. Grant read access in Settings → Health to continue.';
    }
    return 'Cycle Companion needs read-only access to menstrual flow to personalize your feed.';
  }, [permissions]);

  const handleGrant = useCallback(async () => {
    setIsRequesting(true);
    setStatus(null);
    try {
      const granted = await requestCyclePermissions();
      if (!granted) {
        setStatus('We could not confirm Health access. Please try again or open the Health app.');
      }
    } catch (error) {
      setStatus('Something went wrong while requesting permissions. Please try again.');
      console.error('requestCyclePermissions failed', error);
    } finally {
      setIsRequesting(false);
    }
  }, []);

  const handleOpenSettings = useCallback(() => {
    Linking.openURL('x-apple-health://')
      .catch(() => Linking.openSettings())
      .catch(() => setStatus('Unable to open Settings. Please open the Health app manually.'));
  }, []);

  const features = useMemo(
    () => [
      'Read-only access to Apple Health menstrual flow entries.',
      'Surface PMS + menstruation insights just for you and approved friends.',
      'Sync in the background without draining battery life.',
    ],
    [],
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.kicker}>Meet Cycle Companion</Text>
        <Text style={styles.title}>Read-only Health sync</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

        <View style={styles.featureList}>
          {features.map((feature) => (
            <View key={feature} style={styles.featureItem}>
              <View style={styles.featureBullet} />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        {status ? <Text style={styles.status}>{status}</Text> : null}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.primaryButton, permissions.granted && styles.primaryButtonDisabled]}
          onPress={handleGrant}
          disabled={isRequesting || permissions.granted}
        >
          <Text style={styles.primaryLabel}>
            {permissions.granted ? 'Access Granted' : isRequesting ? 'Requesting…' : 'Grant Health Access'}
          </Text>
        </TouchableOpacity>

        {permissions.granted ? (
          <TouchableOpacity style={styles.secondaryButton} onPress={markIntroSeen}>
            <Text style={styles.secondaryLabel}>Continue to feed</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.secondaryButton} onPress={handleOpenSettings}>
            <Text style={styles.secondaryLabel}>Open Health Settings</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 24,
    gap: 16,
  },
  kicker: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    color: '#7d50ff',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111',
  },
  subtitle: {
    fontSize: 18,
    color: '#333',
    lineHeight: 24,
  },
  featureList: {
    marginTop: 16,
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  featureBullet: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#7d50ff',
  },
  featureText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  status: {
    color: '#b3261e',
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#7d50ff',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    backgroundColor: '#cdbafc',
  },
  primaryLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryLabel: {
    color: '#7d50ff',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default CompanionIntroScreen;
