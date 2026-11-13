import ContactDetails from './ContactDetails';
import { useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity } from 'react-native';
import { PHONE_VERIFICATION_ENABLED } from '../../../config/features';
import { updateUserAlias } from '../../../services/supabase/users';
import { useSessionStore } from '../../../state/sessionStore';

const AliasScreen = () => {
  const userId = useSessionStore(state => state.session?.userId);
  // Without phone verification, contact details are optional and live in
  // You → Settings, so setup only needs an alias.
  const [detailsReady, setDetailsReady] = useState(!PHONE_VERIFICATION_ENABLED);
  const [alias, setAlias] = useState('');
  const [isSaving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setAliasInStore = useSessionStore((state) => state.setAlias);

  const handleSave = async () => {
    if (!detailsReady) return;
    const trimmed = alias.trim();
    if (!trimmed) {
      setError('Please enter an alias.');
      return;
    }
    const expectedUserId = useSessionStore.getState().session?.userId;
    if (!expectedUserId) return;
    setSaving(true);
    setError(null);
    try {
      await updateUserAlias(trimmed, expectedUserId);
      if (useSessionStore.getState().session?.userId === expectedUserId) setAliasInStore(trimmed);
    } catch (err) {
      console.warn('[alias] Failed to save alias', err);
      setError(
        (err as { code?: string } | null)?.code === '23505'
          ? 'That alias is taken. Try another.'
          : 'Unable to save alias. Try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Set up your account</Text>
        <Text style={styles.subtitle}>This is how friends will see you in the feed.</Text>
        <TextInput
          style={styles.input}
          value={alias}
          onChangeText={setAlias}
          placeholder="Your alias"
          autoCapitalize="words"
          autoCorrect={false}
        />
        {PHONE_VERIFICATION_ENABLED && userId ? (
          <ContactDetails key={userId} userId={userId} onReady={setDetailsReady} />
        ) : null}
        <Text style={styles.subtitle}>
          {PHONE_VERIFICATION_ENABLED
            ? 'You can let friends find you by phone or email in Circle.'
            : 'You can add contact details later in You → Settings.'}
        </Text>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <TouchableOpacity
          style={[styles.primaryButton, isSaving || !detailsReady ? styles.primaryButtonDisabled : null]}
          onPress={handleSave}
          disabled={isSaving || !detailsReady}
        >
          <Text style={styles.primaryButtonText}>{isSaving ? 'Saving...' : 'Continue'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f5ff',
  },
  content: {
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  errorText: {
    fontSize: 12,
    color: '#b00020',
  },
  primaryButton: {
    marginTop: 4,
    backgroundColor: '#111',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    backgroundColor: '#444',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default AliasScreen;
