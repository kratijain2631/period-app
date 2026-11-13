import { useState } from 'react';
import { Linking, SafeAreaView, ScrollView } from 'react-native';
import { AppText, ActionButton } from '../../../components/ui/WidgetPrimitives';
import { requestCyclePermissions } from '../../../services/healthkit/permissions';
import { useSessionStore } from '../../../state/sessionStore';
import { useWidgetTheme } from '../../../theme/widgetTheme';
import { InitialSharingSettings } from './InitialSharingSettings';

export default function CompanionIntroScreen() {
  const session = useSessionStore(state => state.session);
  const permissions = useSessionStore(state => state.permissions);
  const finish = useSessionStore(state => state.markCompanionIntroSeen);
  const [chooseHealth, setChooseHealth] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const theme = useWidgetTheme();
  const complete = () => {
    if (session && useSessionStore.getState().session?.userId === session.userId) finish();
  };
  async function connect() {
    setBusy(true);
    setError('');
    try {
      const result = await requestCyclePermissions();
      if (result.granted) complete();
      else setError(result.error || 'Health access was not granted.');
    } catch {
      setError('Couldn’t request Health access. Try again.');
    } finally {
      setBusy(false);
    }
  }
  if (!session) return null;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.canvas }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
        {chooseHealth ? (
          <>
            <AppText role="heading" accessibilityRole="header">Connect Apple Health</AppText>
            <AppText>Use read-only cycle data from Apple Health to see your cycle and sync with friends.</AppText>
            {error && <AppText accessibilityRole="alert">{error}</AppText>}
            <ActionButton label={busy ? 'Requesting…' : 'Connect Apple Health'} onPress={connect} disabled={busy} />
            <ActionButton label="Not now" outline onPress={complete} disabled={busy} />
            {permissions.lastPromptedAt && (
              <ActionButton label="Open Health settings" outline
                onPress={() => Linking.openURL('x-apple-health://sources').catch(() => Linking.openSettings()).catch(() => setError('Open the Health app to manage access.'))} />
            )}
            <ActionButton label="Learn more" outline onPress={() => Linking.openURL('https://www.apple.com/healthcare/apple-health-app/').catch(() => setError('Couldn’t open the Apple Health page.'))} />
          </>
        ) : (
          <InitialSharingSettings key={session.userId} userId={session.userId}
            onSaved={() => permissions.granted ? complete() : setChooseHealth(true)} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
