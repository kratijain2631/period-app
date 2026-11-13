import { CyclePrivacyControl } from '../../app/features/profile/components/CyclePrivacyControl';
import { SettingsPage, ContactValue } from '../../app/features/profile/components/SettingsPage';
import { useEffect, useState } from 'react';
import { AccountEmailSummary, EmailChangeForm, PendingEmail } from '../../app/features/profile/components/EmailChangeForm';
import { View } from 'react-native';
import { OptionalPhonePrompt, PhoneChangeForm } from '../../app/features/profile/components/PhoneChangeForm';
import { AppText } from '../../app/components/ui/WidgetPrimitives';
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

export function SampleContactDetails({ details, save, setup = false, onReady }: { details: Details; save: (next: Details) => void; setup?: boolean; onReady?: (ready: boolean) => void }) {
  const t = useWidgetTheme();
  const [editingPhone, setEditingPhone] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('screen') === 'settings' && params.get('edit') === 'phone';
  });
  const [message, report] = useState('');
  const [draft, setDraft] = useState<string | null>(null);
  const [pending, setPending] = useState('');
  useEffect(() => onReady?.(draft === null && !pending), [draft, pending, onReady]);
  function editEmail() { setDraft(''); report(''); }
  function verify(inbox: string, code: string) {
    if (inbox !== pending || code !== '654321') return report('Try sample code 654321.');
    save({ ...details, email: pending });
    setPending(''); report('Email address updated.');
  }
  return (
    <>
      {setup && draft !== null ? (
        <EmailChangeForm email={draft} currentEmail={details.email} busy={false} onChange={setDraft}
          onCancel={() => setDraft(null)} onSend={() => {
            setPending(draft.trim()); setDraft(null);
            report('Sample email code: 654321.');
          }} />
      ) : setup && pending ? (
        <PendingEmail address={pending} busy={false}
          onVerify={verify} onEdit={editEmail} onKeep={() => { setPending(''); report(''); }} />
      ) : (
        <AccountEmailSummary address={details.email} apple={details.email.endsWith('@privaterelay.appleid.com')}
          onEdit={setup ? editEmail : undefined} />
      )}
      <View style={{ gap: 8, borderTopWidth: 1, borderColor: t.colors.border }}>
        {setup && !editingPhone && !details.phone ? (
          <OptionalPhonePrompt onAdd={() => { setEditingPhone(true); report(''); }} />
        ) : !editingPhone ? (
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
