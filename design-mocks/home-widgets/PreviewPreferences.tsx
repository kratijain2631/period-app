import { SettingsPage, ContactValue } from '../../app/features/profile/components/SettingsPage';
import { useState } from 'react';
import { Switch, TextInput, View } from 'react-native';
import { normalizeContactPhone } from '../../app/services/contacts/phone';
import { AppText, Surface, ActionButton } from '../../app/components/ui/WidgetPrimitives';
import { useWidgetTheme } from '../../app/theme/widgetTheme';
import { RankingVisibilityRow } from '../../app/features/profile/components/RankingVisibilityRow';

export type Preferences = { period: boolean; first: boolean; phase: boolean };
export type Details = { email: string; phone: string };

export function SettingsMenu({
  details,
  save,
  ranked,
  onRanked,
  onOpen,
}: {
  details: Details;
  save: (next: Details) => void;
  ranked: boolean;
  onRanked: (next: boolean) => void;
  onOpen: (page: 'posting' | 'sign-out' | 'delete-account') => void;
}) {
  return (
    <SettingsPage
      contacts={<SampleContactDetails details={details} save={save} />}
      visibility={<RankingVisibilityRow enabled={ranked} busy={false} onChange={onRanked} />}
      onPosting={() => onOpen('posting')}
      onSignOut={() => onOpen('sign-out')}
      onDelete={() => onOpen('delete-account')}
    />
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

function SampleContactDetails({ details, save }: { details: Details; save: (next: Details) => void }) {
  const t = useWidgetTheme();
  const [email, setEmail] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);
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
      <View style={{ gap: 8 }}>
        {email === null ? (
          <ContactValue
            label="Email"
            value={details.email}
            onChange={() => {
              setEmail('');
              report('');
            }}
          />
        ) : (
          <>
            <AppText>New email address</AppText>
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
        {email !== null && (
          <ActionButton
            outline
            label="Cancel email change"
            onPress={() => {
              setEmail(null);
              setConfirm(false);
              report('');
            }}
          />
        )}
      </View>
      <View style={{ gap: 8, borderTopWidth: 1, borderColor: t.colors.border }}>
        {!editingPhone ? (
          <ContactValue
            label="Phone number"
            value={details.phone}
            onChange={() => {
              setEditingPhone(true);
              setPhone('');
              report('');
            }}
          />
        ) : (
          <>
            <AppText>Phone number with country code</AppText>
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
                    setEditingPhone(false);
                    setSent(false);
                    report('Sample phone verified.');
                  }}
                />
              </>
            )}
            <ActionButton
              outline
              label="Cancel phone change"
              onPress={() => {
                setEditingPhone(false);
                setSent(false);
                setCode('');
                report('');
              }}
            />
          </>
        )}
      </View>
      {message && <AppText accessibilityLiveRegion="polite">{message}</AppText>}
    </>
  );
}
