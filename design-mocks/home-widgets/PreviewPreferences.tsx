import { CyclePrivacyControl } from '../../app/features/profile/components/CyclePrivacyControl';
import { EmailChangeForm, PendingEmail } from '../../app/features/profile/components/EmailChangeForm';
import { SettingsPage, ContactValue } from '../../app/features/profile/components/SettingsPage';
import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { normalizeContactPhone } from '../../app/services/contacts/phone';
import { AppText, ActionButton } from '../../app/components/ui/WidgetPrimitives';
import { useWidgetTheme } from '../../app/theme/widgetTheme';
import { RankingVisibilityRow } from '../../app/features/profile/components/RankingVisibilityRow';

export type Details = { email: string; phone: string };

export function SettingsMenu({
  details,
  save,
  ranked,
  onRanked,
  onOpen,
  cycleSharing, onCycleSharing,
}: {
  cycleSharing: boolean; onCycleSharing: (enabled: boolean) => void;
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
      cyclePrivacy={<CyclePrivacyControl enabled={cycleSharing} onRetry={() => {}} onChange={async value => onCycleSharing(value)} />}
      onPosting={() => onOpen('posting')}
      onSignOut={() => onOpen('sign-out')}
      onDelete={() => onOpen('delete-account')}
    />
  );
}

export function SampleContactDetails({ details, save }: { details: Details; save: (next: Details) => void }) {
  const t = useWidgetTheme();
  const [email, setEmail] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState('');
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
        {pendingEmail && email === null ? (
          <>
            <PendingEmail address={pendingEmail} currentEmail={details.email} onEdit={() => { setEmail(''); report(''); }} />
            <ActionButton outline label="Simulate opening the email link" onPress={() => {
              save({ ...details, email: pendingEmail });
              setPendingEmail('');
              report('Sample email verified.');
            }} />
          </>
        ) : email === null ? (
          <ContactValue
            label="Email"
            value={details.email}
            onChange={() => {
              setEmail('');
              report('');
            }}
          />
        ) : (
          <EmailChangeForm email={email} currentEmail={details.email} busy={false}
            onChange={setEmail} onSend={() => { setPendingEmail(email.trim()); setEmail(null); report(''); }}
            onCancel={() => { setEmail(null); report(''); }} />
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
