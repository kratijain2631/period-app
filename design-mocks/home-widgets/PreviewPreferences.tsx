import { CyclePrivacyControl } from '../../app/features/profile/components/CyclePrivacyControl';
import { SettingsPage, ContactValue } from '../../app/features/profile/components/SettingsPage';
import { useState } from 'react';
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

export function SampleContactDetails({ details, save, setup = false }: { details: Details; save: (next: Details) => void; setup?: boolean }) {
  const t = useWidgetTheme();
  const [editingPhone, setEditingPhone] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('screen') === 'settings' && params.get('edit') === 'phone';
  });
  const [message, report] = useState('');
  return (
    <>
      <View style={{ gap: 8 }}>
        <AppText>{setup ? 'Email from Apple' : 'Account email'}</AppText>
        <AppText>{details.email || 'No email on this account'}</AppText>
        {setup && !!details.email && <AppText>{details.email.toLowerCase().endsWith('@privaterelay.appleid.com')
          ? "You chose to Hide My Email. Friends can't find you by your personal email address while you use this private relay address."
          : 'Friends who have this email can find you when you turn on Let contacts find me.'}</AppText>}
      </View>
      <View style={{ gap: 8, borderTopWidth: 1, borderColor: t.colors.border, paddingTop: setup ? 16 : 0 }}>
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
