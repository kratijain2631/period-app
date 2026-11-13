import { CyclePrivacyControl } from '../../app/features/profile/components/CyclePrivacyControl';
import { EmailChangeForm, PendingEmail } from '../../app/features/profile/components/EmailChangeForm';
import { SettingsPage, ContactValue } from '../../app/features/profile/components/SettingsPage';
import { useState } from 'react';
import { View } from 'react-native';
import { PhoneChangeForm } from '../../app/features/profile/components/PhoneChangeForm';
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
  const [editingPhone, setEditingPhone] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('screen') === 'settings' && params.get('edit') === 'phone';
  });
  const [message, report] = useState('');
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
              report('');
            }}
          />
        ) : (
          <PhoneChangeForm currentPhone={details.phone} busy={false}
            onEdit={() => report('')}
            onSend={async () => { report('Preview code: 123456'); return true; }}
            onVerify={(phone, code) => {
              if (code !== '123456') return report('Try the sample code 123456.');
              save({ ...details, phone });
              setEditingPhone(false);
              report('Sample phone verified.');
            }}
            onCancel={() => { setEditingPhone(false); report(''); }} />
        )}
      </View>
      {message && <AppText accessibilityLiveRegion="polite">{message}</AppText>}
    </>
  );
}
