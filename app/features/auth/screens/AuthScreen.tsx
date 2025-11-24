import * as AppleAuthentication from 'expo-apple-authentication';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { signInWithApple } from '../../../services/auth/appleAuth';
import { useSessionStore } from '../../../state/sessionStore';

const AuthScreen = () => {
  const setSession = useSessionStore((state) => state.setSession);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    AppleAuthentication.isAvailableAsync()
      .then(setIsAvailable)
      .catch(() => setIsAvailable(false));
  }, []);

  const handleSignIn = useCallback(() => {
    setIsLoading(true);
    setError(null);
    signInWithApple()
      .then((result) => {
        setSession(result.session);
      })
      .catch((err) => {
        const message =
          err instanceof Error ? err.message : 'Sign in with Apple failed. Please try again.';
        setError(message);
      })
      .finally(() => setIsLoading(false));
  }, [setSession]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Welcome to Cycle Companion</Text>
        <Text style={styles.description}>
          Sign in with Apple to sync your menstrual health data. We never write back to Apple Health.
        </Text>
        {isAvailable === false && (
          <Text style={styles.notice}>Sign in with Apple is not available on this device.</Text>
        )}

        {isAvailable ? (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={10}
            style={styles.appleButton}
            onPress={handleSignIn}
            disabled={isLoading}
          />
        ) : (
          <TouchableOpacity style={styles.button} onPress={handleSignIn} disabled={isLoading}>
            <Text style={styles.buttonLabel}>
              {isLoading ? 'Signing in…' : 'Sign in with Apple (fallback)'}
            </Text>
          </TouchableOpacity>
        )}

        {isLoading ? <ActivityIndicator /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#fafafa',
  },
  card: {
    borderRadius: 16,
    backgroundColor: '#fff',
    padding: 24,
    gap: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
  },
  description: {
    fontSize: 16,
    color: '#555',
    lineHeight: 22,
  },
  notice: {
    fontSize: 14,
    color: '#b3261e',
    lineHeight: 20,
  },
  button: {
    borderRadius: 12,
    backgroundColor: '#000',
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  appleButton: {
    height: 50,
    width: '100%',
    marginTop: 8,
  },
  error: {
    color: '#b3261e',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
});

export default AuthScreen;
