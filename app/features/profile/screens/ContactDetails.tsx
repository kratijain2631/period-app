import { ContactValue } from '../components/SettingsPage';
import { useEffect, useState } from 'react';
import { Button, Text, TextInput, View } from 'react-native';
import { supabase } from '../../../services/supabase/client';
import { normalizeContactPhone } from '../../../services/contacts/phone';

type Props = { userId: string; settings?: boolean; onReady?: (ready: boolean) => void };

export default function ContactDetails({ userId, onReady, settings = false }: Props) {
  const [editingPhone, setEditingPhone] = useState(false);
  const [email, setEmail] = useState('');
  const [editingEmail, setEditingEmail] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [verifiedPhone, setVerifiedPhone] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [reload, setReload] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const normalized = normalizeContactPhone(phone);
  const ready = loaded && !editingEmail && !!verifiedEmail && !!normalized && normalized === verifiedPhone;

  useEffect(() => {
    onReady?.(ready);
  }, [ready, onReady]);
  useEffect(() => {
    let current = true;
    setLoaded(false);
    supabase.auth
      .getUser()
      .then(({ data, error }) => {
        if (!current) return;
        if (error || data.user?.id !== userId) throw new Error();
        const user = data.user;
        const confirmed = user.phone_confirmed_at && user.phone ? '+' + user.phone.replace(/^\+/, '') : '';
        setPhone(confirmed);
        setVerifiedPhone(confirmed);
        setEmail(user.email ?? '');
        setEditingEmail(false);
        setEditingPhone(false);
        setVerifiedEmail(user.email_confirmed_at ? (user.email ?? '') : '');
        setLoaded(true);
        setMessage('');
      })
      .catch(() => {
        if (current) setMessage('Could not load your contact details.');
      });
    return () => {
      current = false;
    };
  }, [userId, reload]);

  async function submit(action: 'email' | 'send' | 'verify') {
    if (busy) return;
    setBusy(true);
    setMessage('');
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error || data.user?.id !== userId) throw new Error('Account changed. Reopen setup.');
      if (action === 'email') {
        const response = await supabase.auth.updateUser({ email: email.trim() });
        if (response.error) throw response.error;
        setMessage('Follow the confirmation links sent to your email, then tap Check confirmation.');
      } else if (normalized && action === 'send') {
        const response = await supabase.auth.updateUser({ phone: normalized });
        if (response.error) throw response.error;
        setCode('');
        setSentTo(normalized);
        setMessage('Enter the code sent to your phone.');
      } else if (normalized && sentTo === normalized) {
        const response = await supabase.auth.verifyOtp({
          type: 'phone_change',
          phone: normalized,
          token: code.trim(),
        });
        if (response.error) throw response.error;
        if (response.data.user?.id !== userId) throw new Error('Account changed. Reopen setup.');
        setSentTo('');
        setReload((value) => value + 1);
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not verify details. Try again.');
    } finally {
      setBusy(false);
    }
  }

  if (!loaded)
    return (
      <View>
        <Text>{message || 'Loading contact details…'}</Text>
        {message ? <Button title="Retry" onPress={() => setReload((value) => value + 1)} /> : null}
      </View>
    );

  return (
    <View style={{ gap: 8 }}>
      {settings && !editingEmail ? (
        <ContactValue
          label="Email"
          value={verifiedEmail || email}
          onChange={() => {
            setEditingEmail(true);
            setMessage('');
            setEmail('');
          }}
        />
      ) : verifiedEmail && !editingEmail ? (
        <>
          <Text>Account email</Text>
          <Text selectable>{verifiedEmail}</Text>
          <Button
            title="Use a different email"
            onPress={() => {
              setEditingEmail(true);
              setEmail('');
            }}
          />
        </>
      ) : (
        <>
          <Text>Verify the email friends have saved. Changing it updates your account email.</Text>
          <TextInput
            accessibilityLabel="Account email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!busy}
          />
          <Button title="Verify email" disabled={busy || !email.trim()} onPress={() => submit('email')} />
          <Button title="Check confirmation" disabled={busy} onPress={() => setReload((value) => value + 1)} />
        </>
      )}
      {settings && editingEmail && (
        <Button disabled={busy} title="Cancel email change" onPress={() => setReload((v) => v + 1)} />
      )}
      {settings && !editingPhone ? (
        <ContactValue
          label="Phone number"
          value={verifiedPhone}
          onChange={() => {
            setEditingPhone(true);
            setPhone('');
            setSentTo('');
            setCode('');
            setMessage('');
          }}
        />
      ) : (
        <>
          <Text>Phone number with country code</Text>
          <TextInput
            accessibilityLabel="Phone number with country code"
            placeholder="+1 212 555 0123"
            keyboardType="phone-pad"
            value={phone}
            editable={!busy}
            onChangeText={(value) => {
              setPhone(value);
              setSentTo('');
              setMessage('');
            }}
          />
          {normalized && normalized === verifiedPhone ? (
            <Text>Phone verified</Text>
          ) : (
            <>
              <Button
                title={sentTo ? 'Resend text' : 'Text me a code'}
                disabled={busy || !normalized}
                onPress={() => submit('send')}
              />
              {sentTo ? (
                <>
                  <TextInput
                    accessibilityLabel="Verification code"
                    placeholder="Verification code"
                    keyboardType="number-pad"
                    textContentType="oneTimeCode"
                    value={code}
                    onChangeText={setCode}
                    editable={!busy}
                  />
                  <Button
                    title="Verify code"
                    disabled={busy || !code.trim()}
                    onPress={() => submit('verify')}
                  />
                </>
              ) : null}
            </>
          )}
          {settings && editingPhone && (
            <Button disabled={busy} title="Cancel phone change" onPress={() => setReload((v) => v + 1)} />
          )}
        </>
      )}
      {message ? <Text accessibilityLiveRegion="polite">{message}</Text> : null}
    </View>
  );
}
