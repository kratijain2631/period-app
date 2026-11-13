import { View } from 'react-native';
import { ContactCancel, ContactField } from './ContactFormControls';
import { ActionButton, AppText } from '../../../components/ui/WidgetPrimitives';
import { useWidgetTheme } from '../../../theme/widgetTheme';

type Props = {
  email: string;
  currentEmail: string;
  busy: boolean;
  onChange: (email: string) => void;
  onSend: () => void;
  onCancel?: () => void;
};

export function EmailChangeForm({ email, currentEmail, busy, onChange, onSend, onCancel }: Props) {
  const address = email.trim();
  const canSend = !busy && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)
    && address.toLowerCase() !== currentEmail.trim().toLowerCase();
  const label = currentEmail ? 'New email address' : 'Email address';
  return (
    <View style={{ gap: 8 }}>
      <ContactField label={label} icon="mail-outline" placeholder="name@example.com"
        autoCapitalize="none" autoCorrect={false} autoComplete="email" keyboardType="email-address"
        editable={!busy} value={email} onChangeText={onChange} returnKeyType="done"
        onSubmitEditing={() => { if (canSend) onSend(); }} />
      <ActionButton label={busy ? 'Sending…' : 'Send confirmation email'} disabled={!canSend} onPress={onSend} />
      {onCancel && <ContactCancel busy={busy} onPress={onCancel} />}
    </View>
  );
}

export function PendingEmail({ address, currentEmail, onEdit }: { address: string; currentEmail: string; onEdit: () => void }) {
  const t = useWidgetTheme();
  return (
    <View accessibilityLiveRegion="polite" style={{ gap: 5, padding: 12, borderRadius: t.radius.control, backgroundColor: t.colors.subtle }}>
      <AppText style={{ fontFamily: t.type.semibold }}>Awaiting email confirmation</AppText>
      <AppText>{currentEmail ? `Open the confirmation links sent to ${currentEmail} and ${address}.` : `Check ${address} for the confirmation link.`} Your address will update here once confirmed.</AppText>
      <ActionButton outline label="Use a different address" onPress={onEdit} />
    </View>
  );
}
