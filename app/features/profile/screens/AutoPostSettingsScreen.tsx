import { useCallback, useMemo, useState } from 'react';
import {
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
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
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
  primaryText: iosColor('label', '#111827'),
  secondaryText: iosColor('secondaryLabel', '#6B7280'),
  tertiaryText: iosColor('tertiaryLabel', '#9CA3AF'),
  separator: iosColor('separator', '#E5E7EB'),
  accent: iosColor('systemBlue', '#007AFF'),
  mutedFill: iosColor('systemGray6', '#F3F4F6'),
  warningText: iosColor('systemRed', '#B42318'),
};

const AutoPostSettingsScreen = () => {
  const navigation = useNavigation();
  const autoPostSettings = useSessionStore(selectAutoPostSettings);
  const setAutoPostSettings = useSessionStore((state) => state.setAutoPostSettings);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const saveSettings = useCallback(
    async (nextSettings: AutoPostSettings, rollbackSettings: AutoPostSettings) => {
      setAutoPostSettings(nextSettings);
      setStatus('saving');
      try {
        await saveCurrentUserAutoPostSettings(nextSettings);
        setStatus('saved');
        setTimeout(() => setStatus('idle'), 1200);
      } catch (error) {
        console.warn('[auto-post-settings] Failed to save', error);
        setAutoPostSettings(rollbackSettings);
        setStatus('error');
      }
    },
    [setAutoPostSettings],
  );

  const handleTogglePeriodDays = useCallback(
    (enabled: boolean) => {
      const nextSettings: AutoPostSettings = enabled
        ? { ...autoPostSettings, postPeriodDays: true }
        : { ...autoPostSettings, postPeriodDays: false, postOnlyPeriodStart: false };
      void saveSettings(nextSettings, autoPostSettings);
    },
    [autoPostSettings, saveSettings],
  );

  const handleTogglePeriodStartOnly = useCallback(
    (enabled: boolean) => {
      const nextSettings: AutoPostSettings = {
        ...autoPostSettings,
        postPeriodDays: true,
        postOnlyPeriodStart: enabled,
      };
      void saveSettings(nextSettings, autoPostSettings);
    },
    [autoPostSettings, saveSettings],
  );

  const handleTogglePhaseTransitions = useCallback(
    (enabled: boolean) => {
      const nextSettings: AutoPostSettings = {
        ...autoPostSettings,
        postPhaseTransitions: enabled,
      };
      void saveSettings(nextSettings, autoPostSettings);
    },
    [autoPostSettings, saveSettings],
  );

  const statusLabel = useMemo(() => {
    switch (status) {
      case 'saving':
        return 'Saving...';
      case 'saved':
        return 'Saved';
      case 'error':
        return 'Could not save';
      default:
        return 'Choose what to auto-post';
    }
  }, [status]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={18} color={palette.primaryText} />
            <Text style={styles.backLabel}>Profile</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Auto-post settings</Text>
          <Text style={[styles.subtitle, status === 'error' ? styles.statusError : null]}>
            {statusLabel}
          </Text>
        </View>

        <View style={styles.settingsCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingTextWrap}>
              <Text style={styles.settingTitle}>Post period updates</Text>
              <Text style={styles.settingDescription}>
                Share cycle updates from Apple Health to your feed.
              </Text>
            </View>
            <Switch
              value={autoPostSettings.postPeriodDays}
              onValueChange={handleTogglePeriodDays}
              trackColor={{ false: '#D1D5DB', true: '#BFDBFE' }}
              thumbColor={autoPostSettings.postPeriodDays ? palette.accent : '#FFFFFF'}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingTextWrap}>
              <Text
                style={[
                  styles.settingTitle,
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
                Only post the start of each period instead of every period day.
              </Text>
            </View>
            <Switch
              value={autoPostSettings.postOnlyPeriodStart}
              onValueChange={handleTogglePeriodStartOnly}
              disabled={!autoPostSettings.postPeriodDays}
              trackColor={{ false: '#D1D5DB', true: '#BFDBFE' }}
              thumbColor={autoPostSettings.postOnlyPeriodStart ? palette.accent : '#FFFFFF'}
            />
          </View>

          <View style={[styles.settingRow, styles.settingRowLast]}>
            <View style={styles.settingTextWrap}>
              <Text style={styles.settingTitle}>Post phase transitions</Text>
              <Text style={styles.settingDescription}>
                Share updates when your cycle phase changes.
              </Text>
            </View>
            <Switch
              value={autoPostSettings.postPhaseTransitions}
              onValueChange={handleTogglePhaseTransitions}
              trackColor={{ false: '#D1D5DB', true: '#BFDBFE' }}
              thumbColor={autoPostSettings.postPhaseTransitions ? palette.accent : '#FFFFFF'}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 16,
  },
  header: {
    gap: 8,
  },
  backButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
  },
  backLabel: {
    fontSize: 13,
    color: palette.secondaryText,
    fontWeight: '500',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: palette.primaryText,
  },
  subtitle: {
    fontSize: 14,
    color: palette.secondaryText,
  },
  statusError: {
    color: palette.warningText,
  },
  settingsCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.separator,
    backgroundColor: palette.card,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.separator,
    backgroundColor: palette.mutedFill,
  },
  settingRowLast: {
    borderBottomWidth: 0,
  },
  settingTextWrap: {
    flex: 1,
    gap: 3,
    paddingRight: 8,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.primaryText,
  },
  settingDescription: {
    fontSize: 12,
    color: palette.secondaryText,
    lineHeight: 18,
  },
  settingDisabledText: {
    color: palette.tertiaryText,
  },
});

export default AutoPostSettingsScreen;
