import { useState } from 'react';
import { View } from 'react-native';
import { parsePhoneNumberFromString } from 'libphonenumber-js/min';
import { ActionButton, AppText } from '../../../components/ui/WidgetPrimitives';
import { phoneFromFields } from '../../../services/contacts/phone';
import { ContactCancel, ContactField } from './ContactFormControls';

type Props = {
  currentPhone: string;
  busy: boolean;
  onSend: (phone: string) => Promise<boolean>;
  onVerify: (phone: string, code: string) => void;
  onCancel: () => void;
  onEdit: () => void;
};

export function PhoneChangeForm({ currentPhone, busy, onSend, onVerify, onCancel, onEdit }: Props) {
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

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end' }}>
        <View style={{ flexBasis: 100, flexGrow: 1 }}>
          <ContactField label="Country code" value={callingCode} placeholder="+1"
            keyboardType="phone-pad" editable={!busy}
            onChangeText={value => {
              clearCode();
              const digits = value.replace(/\D/g, '').slice(0, 3);
              setCallingCode('+' + digits);
            }} />
        </View>
        <View style={{ flexBasis: 132, flexGrow: 3 }}>
          <ContactField label={currentPhone ? 'New phone number' : 'Phone number'} icon="call-outline"
            value={number} placeholder="Number" keyboardType="phone-pad" autoComplete="tel-national"
            editable={!busy} onChangeText={changeNumber} />
        </View>
      </View>
      {sentTo ? (
        <>
          <AppText>Code sent to {sentTo}</AppText>
          <ContactField label="Confirmation code" placeholder="Enter code" keyboardType="number-pad"
            textContentType="oneTimeCode" value={code} editable={!busy} onChangeText={setCode} />
          <ActionButton label="Verify code" disabled={busy || !/^\d+$/.test(code.trim())}
            onPress={() => onVerify(sentTo, code.trim())} />
          <ActionButton outline label="Resend code" disabled={busy} onPress={send} />
        </>
      ) : (
        <ActionButton label="Send confirmation code" disabled={busy || !phone || phone === currentPhone} onPress={send} />
      )}
      <ContactCancel busy={busy} onPress={onCancel} />
    </View>
  );
}
