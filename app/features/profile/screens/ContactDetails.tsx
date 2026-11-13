import { EmailChangeForm, PendingEmail } from '../components/EmailChangeForm';
import { ContactValue } from '../components/SettingsPage';
import { useEffect, useRef, useState } from 'react';
import { AppState, Button, Text, View } from 'react-native';
import { supabase } from '../../../services/supabase/client';
import { PhoneChangeForm } from '../components/PhoneChangeForm';

type Props = { userId: string; settings?: boolean; onReady?: (ready: boolean) => void };

export default function ContactDetails({ userId, onReady, settings = false }: Props) {
  const [editingPhone, setEditingPhone] = useState(false);
  const [email, setEmail] = useState('');
  const [editingEmail, setEditingEmail] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const submitting = useRef(false);
  const [verifiedPhone, setVerifiedPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [reload, setReload] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const ready = loaded && !editingEmail && !pendingEmail && !!verifiedEmail && !editingPhone && !!verifiedPhone;

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
        setVerifiedPhone(confirmed);
        setEmail(user.email ?? '');
        setPendingEmail(user.new_email ?? '');
        setEditingEmail(false);
        setEditingPhone(!settings && !confirmed);
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
  }, [userId, reload, settings]);

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

  async function submit(action: 'email' | 'send' | 'verify', phone = '', token = '') {
    if (submitting.current) return false;
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
      } else if (action === 'send') {
        const response = await supabase.auth.updateUser({ phone });
        if (response.error) throw response.error;
      } else {
        const response = await supabase.auth.verifyOtp({ type: 'phone_change', phone, token });
        if (response.error) throw response.error;
        if (response.data.user?.id !== userId) throw new Error('Account changed. Reopen setup.');
        setReload((value) => value + 1);
      }
      return true;
    } catch (err) {
      const code = err && typeof err === 'object' && 'code' in err ? err.code : null;
      setMessage(code === 'email_address_not_authorized'
        ? 'Email delivery is unavailable for this address right now. Your current email is unchanged.'
        : err instanceof Error ? err.message : 'Could not verify details. Try again.');
      return false;
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
      {editingPhone ? (
        <PhoneChangeForm currentPhone={verifiedPhone} busy={busy}
          onEdit={() => setMessage('')} onSend={phone => submit('send', phone)}
          onVerify={(phone, code) => void submit('verify', phone, code)}
          onCancel={() => { setEditingPhone(false); setMessage(''); }} />
      ) : (
        <ContactValue label="Phone number" value={verifiedPhone}
          onChange={() => { setEditingPhone(true); setMessage(''); }} />
      )}
      {message ? <Text accessibilityLiveRegion="polite">{message}</Text> : null}
    </View>
  );
}
