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
import { syncHealthData } from '../../../services/healthkit/syncHealthData';
import { useSessionStore } from '../../../state/sessionStore';
import { healthkitClient, MENSTRUAL_FLOW_IDENTIFIER } from '../../../services/healthkit/healthkitClient';
import { APP_NAME } from '../../../config/branding';

const CompanionIntroScreen = () => {
  const permissions = useSessionStore((state) => state.permissions);
  const markIntroSeen = useSessionStore((state) => state.markCompanionIntroSeen);
  const [status, setStatus] = useState<string | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [debugStatus, setDebugStatus] = useState<string | null>(null);
  const [hkStatus, setHkStatus] = useState<string | null>(null);

  useEffect(() => {
    if (permissions.granted) {
      markIntroSeen();
    }
  }, [permissions.granted, markIntroSeen]);

  useEffect(() => {
    (async () => {
      try {
        const statusValue = await healthkitClient.authorizationStatusFor(MENSTRUAL_FLOW_IDENTIFIER);
        setHkStatus(`HK status: ${statusValue}`);
      } catch {
        setHkStatus(null);
      }
    })();
  }, []);

  const subtitle = useMemo(() => {
    if (permissions.granted) {
      return 'You can now sync menstrual flow data securely in the background.';
    }
    if (permissions.lastPromptedAt) {
      return 'Permission is pending. Grant read access in Settings → Health to continue.';
    }
    return `${APP_NAME} needs read-only access to menstrual flow to personalize your feed.`;
  }, [permissions]);

  const handleGrant = useCallback(async () => {
    setIsRequesting(true);
    setStatus(null);
    setDebugStatus(null);
    try {
      const result = await requestCyclePermissions();
      if (!result.granted) {
        setStatus(result.error ?? 'Health access was not granted. Please try again.');
        setDebugStatus('Still not granted after request');
        return;
      }
      setDebugStatus('Health permissions granted');
      await syncHealthData({ trigger: 'manual' });
      markIntroSeen();
    } catch (error) {
      setStatus('Something went wrong while requesting permissions. Please try again.');
      console.error('requestCyclePermissions failed', error);
    } finally {
      setIsRequesting(false);
    }
  }, [markIntroSeen]);

  const handleSkip = useCallback(() => {
    console.log('[intro] User tapped Not now');
    markIntroSeen();
  }, [markIntroSeen]);

  const handleOpenHealthSettings = useCallback(() => {
    Linking.openURL('x-apple-health://sources')
      .catch(() => Linking.openSettings())
      .catch(() => setStatus('Unable to open Health settings. Please open Health > Apps manually.'));
  }, []);

  const handleLearnMore = useCallback(() => {
    Linking.openURL('https://www.apple.com/healthcare/apple-health-app/')
      .catch(() => setStatus('Unable to open Learn more link right now.'));
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
        <Text style={styles.kicker}>Meet {APP_NAME}</Text>
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

        {permissions.lastPromptedAt ? (
          <Text style={styles.meta}>
            Last prompted {new Date(permissions.lastPromptedAt).toLocaleString()}.
          </Text>
        ) : null}

        {debugStatus ? <Text style={styles.meta}>{debugStatus}</Text> : null}
        {hkStatus ? <Text style={styles.meta}>{hkStatus}</Text> : null}

        {status ? <Text style={styles.status}>{status}</Text> : null}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.primaryButton, permissions.granted && styles.primaryButtonDisabled]}
          onPress={handleGrant}
          disabled={isRequesting || permissions.granted}
        >
          <Text style={styles.primaryLabel}>
            {permissions.granted ? 'Access Granted' : isRequesting ? 'Requesting…' : 'Connect Apple Health'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={handleSkip}>
          <Text style={styles.secondaryLabel}>Not now</Text>
        </TouchableOpacity>

        {!permissions.granted ? (
          <TouchableOpacity style={styles.secondaryButton} onPress={handleOpenHealthSettings}>
            <Text style={styles.secondaryLabel}>Open Health settings</Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity style={styles.tertiaryButton} onPress={handleLearnMore}>
          <Text style={styles.tertiaryLabel}>Learn more</Text>
        </TouchableOpacity>
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
  meta: {
    color: '#666',
    fontSize: 13,
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
  tertiaryButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  tertiaryLabel: {
    color: '#333',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});

export default CompanionIntroScreen;
