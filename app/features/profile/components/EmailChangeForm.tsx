import { useState } from 'react';
import { View } from 'react-native';
import { ContactCancel, ContactField } from './ContactFormControls';
import { Ionicons } from '@expo/vector-icons';
import { ActionButton, AppText } from '../../../components/ui/WidgetPrimitives';
import { useWidgetTheme } from '../../../theme/widgetTheme';

export function AccountEmailSummary({ address, apple, onEdit }: {
  address: string;
  apple: boolean;
  onEdit?: () => void;
}) {
  const t = useWidgetTheme();
  const relay = address.toLowerCase().endsWith('@privaterelay.appleid.com');
  return (
    <View style={{ gap: 12 }}>
      <View style={{ backgroundColor: t.colors.surface, borderColor: t.colors.border, borderWidth: 1,
        borderRadius: t.radius.control, padding: 16, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="mail-outline" size={17} color={t.colors.accent} accessible={false} />
          <AppText style={{ color: t.colors.secondary, fontFamily: t.type.semibold }}>
            {apple ? 'Email from Apple' : 'Account email'}
          </AppText>
        </View>
        <AppText selectable style={{ fontFamily: t.type.semibold, fontSize: 17, lineHeight: 25 }}>
          {address || 'No email on this account'}
        </AppText>
      </View>
      {relay && (
        <AppText style={{ color: t.colors.secondary, fontSize: 14, lineHeight: 21 }}>
          Apple forwards messages to your inbox. Friends can’t find you by your personal email while you use this address.
        </AppText>
      )}
      {onEdit && <ActionButton outline label="Use a different email" onPress={onEdit} />}
    </View>
  );
}

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
      <ContactField label={label} icon="mail-outline" placeholder="name@example.com" value={email}
        autoCapitalize="none" autoCorrect={false} autoComplete="email" keyboardType="email-address"
        editable={!busy} onChangeText={onChange} returnKeyType="done" onSubmitEditing={() => { if (canSend) onSend(); }} />
      <ActionButton label={busy ? 'Sending…' : 'Send verification code'} disabled={!canSend} onPress={onSend} />
      {onCancel && <ContactCancel busy={busy} onPress={onCancel} />}
    </View>
  );
}

export function PendingEmail({ address, busy, onVerify, onEdit, onKeep }: {
  address: string; busy: boolean; onVerify: (inbox: string, token: string) => void;
  onEdit: () => void; onKeep?: () => void;
}) {
  const t = useWidgetTheme();
  const [code, setCode] = useState('');
  return (
    <View style={{ gap: 12 }}>
      <AppText role="heading" accessibilityRole="header">Check your email</AppText>
      <AppText style={{ color: t.colors.secondary }}>We sent a confirmation code to</AppText>
      <AppText selectable style={{ fontFamily: t.type.semibold }}>{address}</AppText>
      <ContactField label="Confirmation code" placeholder="Enter code" keyboardType="number-pad" autoFocus
        textContentType="oneTimeCode" editable={!busy} value={code} onChangeText={value => setCode(value.replace(/\D/g, ''))} />
      <ActionButton label="Verify email" disabled={busy || !code} onPress={() => onVerify(address, code)} />
      <ActionButton outline disabled={busy} label="Use a different address" onPress={onEdit} />
      {onKeep && <ActionButton outline disabled={busy} label="Keep my current email" onPress={onKeep} />}
    </View>
  );
}
