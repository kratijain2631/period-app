import { useState } from 'react';
import { SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { updateUserAlias } from '../../../services/supabase/users';
import { useSessionStore } from '../../../state/sessionStore';

const AliasScreen = () => {
  const [alias, setAlias] = useState('');
  const [isSaving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setAliasInStore = useSessionStore((state) => state.setAlias);

  const handleSave = async () => {
    const trimmed = alias.trim();
    if (!trimmed) {
      setError('Please enter an alias.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateUserAlias(trimmed);
      setAliasInStore(trimmed);
    } catch (err) {
      console.warn('[alias] Failed to save alias', err);
      setError('Unable to save alias. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Choose your alias</Text>
        <Text style={styles.subtitle}>This is how friends will see you in the feed.</Text>
        <TextInput
          style={styles.input}
          value={alias}
          onChangeText={setAlias}
          placeholder="Your alias"
          autoCapitalize="words"
          autoCorrect={false}
        />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <TouchableOpacity
          style={[styles.primaryButton, isSaving ? styles.primaryButtonDisabled : null]}
          onPress={handleSave}
          disabled={isSaving}
        >
          <Text style={styles.primaryButtonText}>{isSaving ? 'Saving...' : 'Continue'}</Text>
        </TouchableOpacity>
      </View>
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
