import { useRef, useState } from 'react';
import { View } from 'react-native';
import { ActionButton, AppText } from '../../../components/ui/WidgetPrimitives';
import { useWidgetTheme } from '../../../theme/widgetTheme';

export class CyclePermissionError extends Error {}

type Props = {
  enabled: boolean | null;
  error?: string;
  onRetry: () => void;
  onChange: (enabled: boolean) => Promise<void>;
};

export function CyclePrivacyControl({ enabled, error, onRetry, onChange }: Props) {
  const theme = useWidgetTheme();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const lock = useRef(false);
  const change = async () => {
    if (lock.current || enabled === null) return;
    lock.current = true;
    setBusy(true);
    setMessage('');
    try {
      await onChange(!enabled);
      setConfirming(false);
      setMessage(enabled ? 'Synced cycle data erased. Cycle sharing is off.' : 'Cycle sync enabled.');
    } catch (failure) {
      setMessage(failure instanceof CyclePermissionError ? failure.message : 'Couldn’t complete this change. Check your connection and try again.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <View style={{ gap: 8, paddingVertical: 10, borderTopWidth: 1, borderColor: theme.colors.border }}>
      <AppText style={{ fontFamily: theme.type.heading }}>Cycle data and sharing</AppText>
      {enabled === null ? (
        error ? <ActionButton outline label="Retry loading cycle sharing" onPress={onRetry} /> : <AppText>Loading…</AppText>
      ) : confirming ? (
        <>
          <AppText>{enabled
            ? 'Erase saved cycle history, automatic updates and cycle guidance from this app? Friends will lose access to your cycle. Your account, friendships, written posts and Apple Health records stay.'
            : 'Import your available Apple Health history again and share cycle information with your friends?'}</AppText>
          <ActionButton disabled={busy} label={busy ? 'Saving…' : enabled ? 'Erase and stop sharing' : 'Reconnect and share'} onPress={change} />
          <ActionButton outline disabled={busy} label="Cancel" onPress={() => setConfirming(false)} />
        </>
      ) : (
        <ActionButton outline label={enabled ? 'Erase synced cycle data' : 'Reconnect Apple Health'} onPress={() => { setMessage(''); setConfirming(true); }} />
      )}
      {(message || error) ? <AppText accessibilityLiveRegion="polite">{message || error}</AppText> : null}
    </View>
  );
}
