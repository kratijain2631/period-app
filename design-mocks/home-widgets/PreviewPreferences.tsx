import { useState } from 'react';
import { Switch, TextInput, View } from 'react-native';
import { normalizeContactPhone } from '../../app/services/contacts/phone';
import { AppText, Surface, ActionButton } from '../../app/components/ui/WidgetPrimitives';
import { useWidgetTheme } from '../../app/theme/widgetTheme';
import { RankingVisibilityRow } from '../../app/features/profile/components/RankingVisibilityRow';

export type Preferences = { period: boolean; first: boolean; phase: boolean };
export type Details = { email: string; phone: string };

export function SettingsMenu({
  email,
  ranked,
  onRanked,
  onOpen,
}: {
  email: string;
  ranked: boolean;
  onRanked: (next: boolean) => void;
  onOpen: (page: 'contacts' | 'posting' | 'sign-out' | 'delete-account') => void;
}) {
  return (
    <>
      <AppText role="heading">Settings</AppText>
      <Surface style={{ gap: 12 }}>
        <AppText>{email}</AppText>
        <ActionButton outline label="Manage contact details" onPress={() => onOpen('contacts')} />
        <ActionButton outline label="Post settings" onPress={() => onOpen('posting')} />
      </Surface>
      <Surface>
        <RankingVisibilityRow enabled={ranked} busy={false} onChange={onRanked} />
      </Surface>
      <ActionButton outline label="Sign out" onPress={() => onOpen('sign-out')} />
      <ActionButton outline label="Delete account" onPress={() => onOpen('delete-account')} />
    </>
  );
}

export function PostingSettings({ value, change }: { value: Preferences; change: (v: Preferences) => void }) {
  const rows = [
    ['period', 'Post period updates'],
    ['first', 'First day only'],
    ['phase', 'Post phase transitions'],
  ] as const;
  return (
    <>
      <AppText role="heading">Post settings</AppText>
      <Surface style={{ gap: 12 }}>
        {rows.map(([key, label]) => (
          <View key={key} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 }}>
            <AppText style={{ flex: 1 }}>{label}</AppText>
            <Switch
              accessibilityLabel={label}
              value={value[key]}
              disabled={key === 'first' && !value.period}
              onValueChange={(next) => change({ ...value, [key]: next })}
            />
          </View>
        ))}
      </Surface>
    </>
  );
}

export function SampleContactDetails({ details, save }: { details: Details; save: (next: Details) => void }) {
  const t = useWidgetTheme();
  const [email, setEmail] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [phone, setPhone] = useState(details.phone);
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [message, report] = useState('');
  const normalized = normalizeContactPhone(phone);
  const input = {
    minHeight: 46,
    borderWidth: 1,
    borderColor: t.colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    color: t.colors.text,
  };
  return (
    <>
      <AppText role="heading">Manage contact details</AppText>
      <Surface style={{ gap: 10 }}>
        <AppText role="heading">Account email</AppText>
        {email === null ? (
          <>
            <AppText>{details.email}</AppText>
            <ActionButton outline label="Use a different email" onPress={() => setEmail('')} />
          </>
        ) : (
          <>
            <TextInput
              accessibilityLabel="Account email"
              placeholder="Email address"
              style={input}
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                setConfirm(false);
              }}
            />
            <ActionButton
              label="Verify email"
              disabled={!/^\S+@\S+\.\S+$/.test(email)}
              onPress={() => {
                setConfirm(true);
                report('Sample confirmation link ready.');
              }}
            />
            {confirm && (
              <ActionButton
                outline
                label="Check confirmation"
                onPress={() => {
                  save({ ...details, email: email.trim() });
                  setEmail(null);
                  setConfirm(false);
                  report('Sample email verified.');
                }}
              />
            )}
          </>
        )}
      </Surface>
      <Surface style={{ gap: 10 }}>
        <AppText role="heading">Phone number</AppText>
        <TextInput
          accessibilityLabel="Phone number with country code"
          style={input}
          value={phone}
          onChangeText={(v) => {
            setPhone(v);
            setSent(false);
            setCode('');
            report('');
          }}
        />
        {normalized === details.phone ? (
          <AppText role="caption">Phone verified</AppText>
        ) : (
          <ActionButton
            outline
            label={sent ? 'Resend text' : 'Text me a code'}
            disabled={!normalized}
            onPress={() => {
              setSent(true);
              report('Preview code: 123456');
            }}
          />
        )}
        {sent && (
          <>
            <TextInput
              accessibilityLabel="Verification code"
              style={input}
              value={code}
              placeholder="6-digit code"
              onChangeText={setCode}
            />
            <ActionButton
              label="Verify code"
              disabled={code.length !== 6}
              onPress={() => {
                if (code !== '123456' || !normalized) return report('Try the sample code 123456.');
                save({ ...details, phone: normalized });
                setSent(false);
                report('Sample phone verified.');
              }}
            />
          </>
        )}
      </Surface>
      {message && <AppText accessibilityLiveRegion="polite">{message}</AppText>}
    </>
  );
}
