import { useState } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { parsePhoneNumberFromString } from 'libphonenumber-js/min';
import { ActionButton, AppText } from '../../../components/ui/WidgetPrimitives';
import { phoneFromFields } from '../../../services/contacts/phone';
import { useWidgetTheme } from '../../../theme/widgetTheme';
import { ContactCancel, ContactField } from './ContactFormControls';

type Props = {
  currentPhone: string;
  busy: boolean;
  onSend: (phone: string) => Promise<boolean>;
  onVerify: (phone: string, code: string) => void;
  onCancel: () => void;
  onEdit: () => void;
};

export function OptionalPhonePrompt({ onAdd }: { onAdd: () => void }) {
  return (
    <View style={{ gap: 6 }}>
      <AppText>Phone number (optional)</AppText>
      <ActionButton outline label="Add phone number" onPress={onAdd} />
    </View>
  );
}

export function PhoneChangeForm({ currentPhone, busy, onSend, onVerify, onCancel, onEdit }: Props) {
  const t = useWidgetTheme();
  const { fontScale } = useWindowDimensions();
  const [callingCode, setCallingCode] = useState('+1');
  const [number, setNumber] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [code, setCode] = useState('');
  const phone = phoneFromFields(callingCode, number);

  function clearCode() {
    setSentTo('');
    setCode('');
    onEdit();
  }

  function changeNumber(value: string) {
    clearCode();
    const pasted = value.trim().startsWith('+') && parsePhoneNumberFromString(value.trim(), { extract: false });
    if (pasted && pasted.isPossible() && !pasted.ext) {
      setCallingCode('+' + pasted.countryCallingCode);
      setNumber(pasted.nationalNumber);
    } else {
      setNumber(value);
    }
  }

  async function send() {
    if (!phone || phone === currentPhone || busy) return;
    if (await onSend(phone)) {
      setCode('');
      setSentTo(phone);
    }
  }

  if (sentTo) {
    const destination = parsePhoneNumberFromString(sentTo)?.formatInternational() ?? sentTo;
    return (
      <View style={{ gap: 12 }}>
        <View style={{ gap: 4 }}>
          <AppText role="heading" accessibilityRole="header">Check your texts</AppText>
          <AppText style={{ color: t.colors.secondary }}>Enter the code we sent to {destination}.</AppText>
        </View>
        <ContactField label="Verification code" placeholder="Enter code" autoFocus
          keyboardType="number-pad" textContentType="oneTimeCode" value={code}
          editable={!busy} onChangeText={value => setCode(value.replace(/\D/g, ''))}
          style={{ textAlign: 'center', fontSize: 22, letterSpacing: code ? 4 : 0, minHeight: 56 }} />
        <ActionButton label="Verify code" disabled={busy || !code} onPress={() => onVerify(sentTo, code)} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around' }}>
          {[{ label: 'Resend code', action: send }, { label: 'Edit number', action: clearCode }].map(({ label, action }) => (
            <Pressable key={label} accessibilityRole="button" disabled={busy} accessibilityState={{ disabled: busy }}
              onPress={action} style={({ pressed }) => ({ minHeight: 44, paddingHorizontal: 8,
                justifyContent: 'center', opacity: pressed || busy ? 0.5 : 1 })}>
              <AppText style={{ color: t.colors.accent, fontFamily: t.type.semibold }}>{label}</AppText>
            </Pressable>
          ))}
        </View>
        <ContactCancel busy={busy} onPress={onCancel} />
      </View>
    );
  }

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end' }}>
        <View style={{ width: 28 + 44 * Math.max(1, fontScale) }}>
          <ContactField label="Country code" value={callingCode} placeholder="+1" maxLength={4}
            keyboardType="phone-pad" editable={!busy}
            onChangeText={value => {
              clearCode();
              const digits = value.replace(/\D/g, '').slice(0, 3);
              setCallingCode('+' + digits);
            }} />
        </View>
        <View style={{ flexBasis: 132, flexGrow: 1 }}>
          <ContactField label={currentPhone ? 'New phone number' : 'Phone number'} icon="call-outline"
            value={number} placeholder="Number" keyboardType="phone-pad" autoComplete="tel-national"
            editable={!busy} onChangeText={changeNumber} />
        </View>
      </View>
      <ActionButton label="Send confirmation code" disabled={busy || !phone || phone === currentPhone} onPress={send} />
      <ContactCancel busy={busy} onPress={onCancel} />
    </View>
  );
}
