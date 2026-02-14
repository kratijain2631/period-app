import { useCallback, useMemo, useState } from 'react';
import {
  Linking,
  Platform,
  PlatformColor,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { requestCyclePermissions } from '../../../services/healthkit/permissions';
import { syncHealthData } from '../../../services/healthkit/syncHealthData';
import {
  selectAutoPostSettings,
  useSessionStore,
} from '../../../state/sessionStore';
import {
  saveCurrentUserAutoPostSettings,
} from '../../../services/supabase/users';
import type { AutoPostSettings } from '../../../services/healthkit/autoPostSettings';

const iosColor = (name: string, fallback: string) =>
  Platform.OS === 'ios' ? PlatformColor(name) : fallback;

const palette = {
  background: iosColor('systemGroupedBackground', '#F2F2F7'),
  card: iosColor('secondarySystemGroupedBackground', '#FFFFFF'),
  border: iosColor('separator', '#E5E7EB'),
  primaryText: iosColor('label', '#111827'),
  secondaryText: iosColor('secondaryLabel', '#6B7280'),
  tertiaryText: iosColor('tertiaryLabel', '#9CA3AF'),
  accent: iosColor('systemBlue', '#007AFF'),
  accentSoft: '#E8F1FF',
  warning: iosColor('systemRed', '#B42318'),
};

const CompanionIntroScreen = () => {
  const permissions = useSessionStore((state) => state.permissions);
  const markIntroSeen = useSessionStore((state) => state.markCompanionIntroSeen);
  const autoPostSettings = useSessionStore(selectAutoPostSettings);
  const setAutoPostSettings = useSessionStore((state) => state.setAutoPostSettings);
  const [status, setStatus] = useState<string | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [autoPostStatus, setAutoPostStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>(
    'idle',
  );
  const showAutoPostStep = permissions.granted;

  const subtitle = useMemo(() => {
    if (showAutoPostStep) {
      return 'Health sync is connected. Pick what posts automatically.';
    }
    if (permissions.lastPromptedAt) {
      return 'Grant read access in Health to finish setup, or continue for now.';
    }
    return 'Connect read-only menstrual flow data from Apple Health.';
  }, [permissions, showAutoPostStep]);

  const handleGrant = useCallback(async () => {
    setIsRequesting(true);
    setStatus(null);
    try {
      const result = await requestCyclePermissions();
      if (!result.granted) {
        setStatus(result.error ?? 'Health access was not granted. Please try again.');
        return;
      }
      await syncHealthData({ trigger: 'manual' });
    } catch (error) {
      setStatus('Something went wrong while requesting permissions. Please try again.');
      console.error('requestCyclePermissions failed', error);
    } finally {
      setIsRequesting(false);
    }
  }, []);

  const handleSkip = useCallback(() => {
    console.log('[intro] User tapped Not now');
    markIntroSeen();
  }, [markIntroSeen]);

  const handleFinishSetup = useCallback(() => {
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
      'Read-only access to menstrual flow entries.',
      'No writes back to Apple Health.',
      'Background sync that respects battery life.',
    ],
    [],
  );

  const saveAutoPostSettings = useCallback(
    async (nextSettings: AutoPostSettings, rollbackSettings: AutoPostSettings) => {
      setAutoPostSettings(nextSettings);
      setAutoPostStatus('saving');
      try {
        await saveCurrentUserAutoPostSettings(nextSettings);
        setAutoPostStatus('saved');
        setTimeout(() => setAutoPostStatus('idle'), 1200);
      } catch (error) {
        console.warn('[onboarding] Failed to save auto-post settings', error);
        setAutoPostSettings(rollbackSettings);
        setAutoPostStatus('error');
      }
    },
    [setAutoPostSettings],
  );

  const handleTogglePeriodDays = useCallback(
    (enabled: boolean) => {
      const nextSettings: AutoPostSettings = enabled
        ? { ...autoPostSettings, postPeriodDays: true }
        : { ...autoPostSettings, postPeriodDays: false, postOnlyPeriodStart: false };
      void saveAutoPostSettings(nextSettings, autoPostSettings);
    },
    [autoPostSettings, saveAutoPostSettings],
  );

  const handleTogglePeriodStartOnly = useCallback(
    (enabled: boolean) => {
      const nextSettings: AutoPostSettings = {
        ...autoPostSettings,
        postPeriodDays: true,
        postOnlyPeriodStart: enabled,
      };
      void saveAutoPostSettings(nextSettings, autoPostSettings);
    },
    [autoPostSettings, saveAutoPostSettings],
  );

  const handleTogglePhaseTransitions = useCallback(
    (enabled: boolean) => {
      const nextSettings: AutoPostSettings = {
        ...autoPostSettings,
        postPhaseTransitions: enabled,
      };
      void saveAutoPostSettings(nextSettings, autoPostSettings);
    },
    [autoPostSettings, saveAutoPostSettings],
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.kicker}>{showAutoPostStep ? 'Step 2 of 2' : 'Step 1 of 2'}</Text>
        <Text style={styles.title}>
          {showAutoPostStep ? 'Auto-post preferences' : 'Connect Apple Health'}
        </Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

        {!showAutoPostStep ? (
          <View style={styles.infoCard}>
            {features.map((feature) => (
              <View key={feature} style={styles.featureItem}>
                <View style={styles.featureBullet} />
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {showAutoPostStep ? (
          <View style={styles.settingsCard}>
            <View style={styles.settingsHeader}>
              <Text style={styles.settingsTitle}>Choose what auto-posts</Text>
              <Text style={styles.settingsStatus}>
                {autoPostStatus === 'saving'
                  ? 'Saving...'
                  : autoPostStatus === 'saved'
                  ? 'Saved'
                  : autoPostStatus === 'error'
                  ? 'Could not save'
                  : 'You can change this anytime in Profile settings'}
              </Text>
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingTextWrap}>
                <Text style={styles.settingLabel}>Post period updates</Text>
                <Text style={styles.settingDescription}>
                  Share menstrual flow entries from Apple Health to your feed.
                </Text>
              </View>
              <Switch
                value={autoPostSettings.postPeriodDays}
                onValueChange={handleTogglePeriodDays}
                trackColor={{ false: '#D1D5DB', true: '#BFDBFE' }}
                thumbColor={autoPostSettings.postPeriodDays ? '#7d50ff' : '#FFFFFF'}
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingTextWrap}>
                <Text
                  style={[
                    styles.settingLabel,
                    !autoPostSettings.postPeriodDays ? styles.settingDisabledText : null,
                  ]}
                >
                  First day only
                </Text>
                <Text
                  style={[
                    styles.settingDescription,
                    !autoPostSettings.postPeriodDays ? styles.settingDisabledText : null,
                  ]}
                >
                  Only post the start of each period.
                </Text>
              </View>
              <Switch
                value={autoPostSettings.postOnlyPeriodStart}
                onValueChange={handleTogglePeriodStartOnly}
                disabled={!autoPostSettings.postPeriodDays}
                trackColor={{ false: '#D1D5DB', true: '#BFDBFE' }}
                thumbColor={autoPostSettings.postOnlyPeriodStart ? '#7d50ff' : '#FFFFFF'}
              />
            </View>

            <View style={[styles.settingRow, styles.settingRowLast]}>
              <View style={styles.settingTextWrap}>
                <Text style={styles.settingLabel}>Post phase transitions</Text>
                <Text style={styles.settingDescription}>
                  Share updates when your cycle phase changes.
                </Text>
              </View>
              <Switch
                value={autoPostSettings.postPhaseTransitions}
                onValueChange={handleTogglePhaseTransitions}
                trackColor={{ false: '#D1D5DB', true: '#BFDBFE' }}
                thumbColor={autoPostSettings.postPhaseTransitions ? '#7d50ff' : '#FFFFFF'}
              />
            </View>
          </View>
        ) : null}

        {permissions.lastPromptedAt && !showAutoPostStep ? (
          <Text style={styles.meta}>
            Last prompt: {new Date(permissions.lastPromptedAt).toLocaleString()}.
          </Text>
        ) : null}

        {status ? <Text style={styles.status}>{status}</Text> : null}
      </ScrollView>

      <View style={styles.footer}>
        {!showAutoPostStep ? (
          <>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleGrant}
              disabled={isRequesting}
            >
              <Text style={styles.primaryLabel}>
                {isRequesting ? 'Requesting…' : 'Connect Apple Health'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={handleSkip}>
              <Text style={styles.secondaryLabel}>Not now</Text>
            </TouchableOpacity>

            {permissions.lastPromptedAt ? (
              <TouchableOpacity style={styles.tertiaryButton} onPress={handleOpenHealthSettings}>
                <Text style={styles.tertiaryLabel}>Open Health settings</Text>
              </TouchableOpacity>
            ) : null}
          </>
        ) : (
          <>
            <TouchableOpacity style={styles.primaryButton} onPress={handleFinishSetup}>
              <Text style={styles.primaryLabel}>Finish setup</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={handleSkip}>
              <Text style={styles.secondaryLabel}>Skip for now</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity style={styles.learnMoreButton} onPress={handleLearnMore}>
          <Text style={styles.tertiaryLabel}>Learn more</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 24,
    gap: 14,
  },
  kicker: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: palette.secondaryText,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: palette.primaryText,
  },
  subtitle: {
    fontSize: 18,
    color: palette.secondaryText,
    lineHeight: 25,
  },
  infoCard: {
    marginTop: 8,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    backgroundColor: palette.card,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  featureItem: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  featureBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 7,
    backgroundColor: palette.accent,
  },
  featureText: {
    flex: 1,
    fontSize: 16,
    color: palette.secondaryText,
    lineHeight: 22,
  },
  settingsCard: {
    marginTop: 8,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    backgroundColor: palette.card,
    overflow: 'hidden',
  },
  settingsHeader: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 4,
  },
  settingsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: palette.primaryText,
  },
  settingsStatus: {
    fontSize: 12,
    color: palette.tertiaryText,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.border,
    backgroundColor: palette.accentSoft,
  },
  settingRowLast: {
    borderBottomWidth: 0,
  },
  settingTextWrap: {
    flex: 1,
    gap: 2,
    paddingRight: 8,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.primaryText,
  },
  settingDescription: {
    fontSize: 12,
    color: palette.secondaryText,
  },
  settingDisabledText: {
    color: palette.tertiaryText,
  },
  status: {
    color: palette.warning,
    fontSize: 14,
    lineHeight: 20,
  },
  meta: {
    color: palette.tertiaryText,
    fontSize: 13,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: palette.accent,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
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
    color: palette.accent,
    fontSize: 15,
    fontWeight: '600',
  },
  tertiaryButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  learnMoreButton: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  tertiaryLabel: {
    color: palette.secondaryText,
    fontSize: 14,
  },
});

export default CompanionIntroScreen;
