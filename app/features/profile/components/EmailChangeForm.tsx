import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  const t = useWidgetTheme();
  const [focused, setFocused] = useState(false);
  const address = email.trim();
  const canSend = !busy && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)
    && address.toLowerCase() !== currentEmail.trim().toLowerCase();
  const label = currentEmail ? 'New email address' : 'Email address';
  return (
    <View style={{ gap: 8 }}>
      <AppText style={{ fontFamily: t.type.semibold }}>{label}</AppText>
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5,
        borderColor: focused ? t.colors.accent : t.colors.secondary, backgroundColor: t.colors.surface,
        borderRadius: t.radius.control, paddingHorizontal: 12,
      }}>
        <Ionicons name="mail-outline" size={20} color={t.colors.secondary} />
        <TextInput accessibilityLabel={label} placeholder="name@example.com" placeholderTextColor={t.colors.secondary}
          autoCapitalize="none" autoCorrect={false} autoComplete="email" keyboardType="email-address"
          editable={!busy} value={email} onChangeText={onChange} onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)} returnKeyType="done" onSubmitEditing={() => { if (canSend) onSend(); }}
          style={{ flex: 1, minWidth: 0, minHeight: 49, color: t.colors.text, fontFamily: t.type.body, fontSize: 16 }} />
      </View>
      <ActionButton label={busy ? 'Sending…' : 'Send confirmation email'} disabled={!canSend} onPress={onSend} />
      {onCancel && (
        <Pressable accessibilityRole="button" disabled={busy} onPress={onCancel}
          style={({ pressed }) => ({ alignSelf: 'center', minHeight: 44, justifyContent: 'center',
            paddingHorizontal: 16, borderRadius: 22, backgroundColor: pressed ? t.colors.border : t.colors.subtle })}>
          <AppText style={{ color: t.colors.secondary, fontFamily: t.type.semibold }}>Cancel</AppText>
        </Pressable>
      )}
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
