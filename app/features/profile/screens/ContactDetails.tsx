import { EmailChangeForm, PendingEmail } from '../components/EmailChangeForm';
import { ContactValue } from '../components/SettingsPage';
import { useEffect, useRef, useState } from 'react';
import { AppState, Button, Text, TextInput, View } from 'react-native';
import { supabase } from '../../../services/supabase/client';
import { normalizeContactPhone } from '../../../services/contacts/phone';

type Props = { userId: string; settings?: boolean; onReady?: (ready: boolean) => void };

export default function ContactDetails({ userId, onReady, settings = false }: Props) {
  const [editingPhone, setEditingPhone] = useState(false);
  const [email, setEmail] = useState('');
  const [editingEmail, setEditingEmail] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const submitting = useRef(false);
  const [phone, setPhone] = useState('');
  const [verifiedPhone, setVerifiedPhone] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [reload, setReload] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const normalized = normalizeContactPhone(phone);
  const ready = loaded && !editingEmail && !pendingEmail && !!verifiedEmail && !!normalized && normalized === verifiedPhone;

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
        setPendingEmail(user.new_email ?? '');
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

  useEffect(() => {
    if (!pendingEmail || editingEmail) return;
    let active = true;
    let reading = false;
    const check = async () => {
      if (!active || reading || AppState.currentState !== 'active') return;
      reading = true;
      try {
        const { data, error } = await supabase.auth.getUser();
        const user = data.user;
        if (!active || error || user?.id !== userId) return;
        if (!user.new_email && user.email_confirmed_at && user.email) {
          setVerifiedEmail(user.email);
          setEmail(user.email);
          setEditingEmail(false);
          setPendingEmail('');
          setMessage(user.email.toLowerCase() === pendingEmail.toLowerCase() ? 'Email address updated.' : '');
        }
      } catch {
        // The next active check retries a temporary connection failure.
      } finally {
        reading = false;
      }
    };
    const timer = setInterval(() => void check(), 12000);
    const listener = AppState.addEventListener('change', state => { if (state === 'active') void check(); });
    return () => { active = false; clearInterval(timer); listener.remove(); };
  }, [pendingEmail, editingEmail, userId]);

  async function submit(action: 'email' | 'send' | 'verify') {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setMessage('');
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error || data.user?.id !== userId) throw new Error('Account changed. Reopen setup.');
      if (action === 'email') {
        const response = await supabase.auth.updateUser({ email: email.trim() });
        if (response.error) throw response.error;
        const updated = response.data.user;
        if (updated?.id !== userId) throw new Error('Account changed. Reopen Settings.');
        if (updated.email_confirmed_at && updated.email?.toLowerCase() === email.trim().toLowerCase() && !updated.new_email) {
          setVerifiedEmail(updated.email);
          setPendingEmail('');
          setMessage('Email address updated.');
        } else if (updated.new_email?.toLowerCase() === email.trim().toLowerCase()) {
          setPendingEmail(updated.new_email);
        } else {
          throw new Error('Could not start the email change. Check the address and try again.');
        }
        setEditingEmail(false);
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
      const code = err && typeof err === 'object' && 'code' in err ? err.code : null;
      setMessage(code === 'email_address_not_authorized'
        ? 'Email delivery is unavailable for this address right now. Your current email is unchanged.'
        : err instanceof Error ? err.message : 'Could not verify details. Try again.');
    } finally {
      submitting.current = false;
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
      {pendingEmail && !editingEmail ? (
        <PendingEmail address={pendingEmail} currentEmail={verifiedEmail} onEdit={() => {
          setEmail(''); setMessage(''); setEditingEmail(true);
        }} />
      ) : settings && !editingEmail ? (
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
        <EmailChangeForm
          email={email} currentEmail={verifiedEmail} busy={busy}
          onChange={value => { setEmail(value); setMessage(''); }}
          onSend={() => void submit('email')}
          onCancel={settings || verifiedEmail || pendingEmail ? () => {
            setEmail(verifiedEmail); setEditingEmail(false); setMessage('');
          } : undefined}
        />
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
