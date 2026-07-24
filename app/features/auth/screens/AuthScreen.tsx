import * as AppleAuthentication from 'expo-apple-authentication';
import Constants from 'expo-constants';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { signInWithApple } from '../../../services/auth/appleAuth';
import { signInWithPassword } from '../../../services/supabase/auth';
import { useSessionStore } from '../../../state/sessionStore';
import { APP_NAME } from '../../../config/branding';

const AuthScreen = () => {
  const setSession = useSessionStore((state) => state.setSession);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devEmail, setDevEmail] = useState('');
  const [devPassword, setDevPassword] = useState('');
  const [authMethod, setAuthMethod] = useState<'apple' | 'email'>('apple');
  const [menuOpen, setMenuOpen] = useState(false);

  const executionEnvironment =
    (Constants as { executionEnvironment?: string }).executionEnvironment ?? '';
  const isExpoGo = Constants.appOwnership === 'expo' || executionEnvironment === 'storeClient';
  const devAuthOverride = process.env.EXPO_PUBLIC_DEV_AUTH === 'true';
  const showDevAuth = __DEV__ && (devAuthOverride || isExpoGo || isAvailable === false);
  const canUseApple = isAvailable === true && !isExpoGo;
  const canUseEmail = showDevAuth;
  const showAppleButton = authMethod === 'apple' && canUseApple;
  const showEmailForm = authMethod === 'email' && canUseEmail;

  useEffect(() => {
    AppleAuthentication.isAvailableAsync()
      .then(setIsAvailable)
      .catch(() => setIsAvailable(false));
  }, []);

  useEffect(() => {
    if (authMethod === 'apple' && !canUseApple && canUseEmail) {
      setAuthMethod('email');
    } else if (authMethod === 'email' && !canUseEmail && canUseApple) {
      setAuthMethod('apple');
    }
  }, [authMethod, canUseApple, canUseEmail]);

  const handleSignIn = useCallback(() => {
    if (isExpoGo) {
      setError('Apple Sign-In requires a dev client or TestFlight build. Use the dev sign-in below.');
      return;
    }
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
  }, [isExpoGo, setSession]);

  const handleDevSignIn = useCallback(() => {
    const email = devEmail.trim();
    if (!email || !devPassword) {
      setError('Enter a dev email + password to sign in.');
      return;
    }
    setIsLoading(true);
    setError(null);
    signInWithPassword(email, devPassword)
      .then((session) => {
        setSession(session);
      })
      .catch((err) => {
        const message =
          err instanceof Error ? err.message : 'Dev sign-in failed. Please try again.';
        setError(message);
      })
      .finally(() => setIsLoading(false));
  }, [devEmail, devPassword, setSession]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Welcome to {APP_NAME}</Text>
        <Text style={styles.description}>
          Sign in to sync your menstrual health data. We never write back to Apple Health.
        </Text>
        {isAvailable === false && (
          <Text style={styles.notice}>Sign in with Apple is not available on this device.</Text>
        )}
        {showDevAuth && (
          <Text style={styles.notice}>
            Use the dev sign-in below if Apple isn’t available (Expo Go) or for local testing.
          </Text>
        )}

        <View style={styles.selector}>
          <Text style={styles.selectorLabel}>Sign-in method</Text>
          <TouchableOpacity
            style={styles.selectorButton}
            onPress={() => setMenuOpen((open) => !open)}
            disabled={isLoading}
          >
            <Text style={styles.selectorButtonText}>
              {authMethod === 'apple' ? 'Sign in with Apple' : 'Email (dev)'}
            </Text>
          </TouchableOpacity>
          {menuOpen ? (
            <View style={styles.selectorMenu}>
              <TouchableOpacity
                style={[
                  styles.selectorOption,
                  !canUseApple && styles.selectorOptionDisabled,
                ]}
                onPress={() => {
                  if (!canUseApple) {
                    return;
                  }
                  setAuthMethod('apple');
                  setMenuOpen(false);
                  setError(null);
                }}
                disabled={!canUseApple}
              >
                <Text style={styles.selectorOptionText}>Sign in with Apple</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.selectorOption,
                  !canUseEmail && styles.selectorOptionDisabled,
                ]}
                onPress={() => {
                  if (!canUseEmail) {
                    return;
                  }
                  setAuthMethod('email');
                  setMenuOpen(false);
                  setError(null);
                }}
                disabled={!canUseEmail}
              >
                <Text style={styles.selectorOptionText}>Email (dev)</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        {showAppleButton ? (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={10}
            style={styles.appleButton}
            onPress={handleSignIn}
            disabled={isLoading}
          />
        ) : null}

        {showEmailForm ? (
          <View style={styles.devAuth}>
            <Text style={styles.devTitle}>Dev sign-in (Supabase email/password)</Text>
            <TextInput
              style={styles.input}
              placeholder="Email"
              autoCapitalize="none"
              keyboardType="email-address"
              value={devEmail}
              onChangeText={setDevEmail}
              editable={!isLoading}
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              secureTextEntry
              value={devPassword}
              onChangeText={setDevPassword}
              editable={!isLoading}
            />
            <TouchableOpacity style={styles.button} onPress={handleDevSignIn} disabled={isLoading}>
              <Text style={styles.buttonLabel}>
                {isLoading ? 'Signing in…' : 'Sign in with email'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.devHint}>
              Requires Supabase Email auth enabled and a test user created.
            </Text>
          </View>
        ) : null}

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
  selector: {
    gap: 8,
  },
  selectorLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  selectorButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#f7f7f7',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  selectorButtonText: {
    fontSize: 16,
    color: '#222',
    fontWeight: '600',
  },
  selectorMenu: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  selectorOption: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  selectorOptionDisabled: {
    opacity: 0.45,
  },
  selectorOptionText: {
    fontSize: 15,
    color: '#222',
    fontWeight: '500',
  },
  devAuth: {
    marginTop: 8,
    gap: 12,
  },
  devTitle: {
    fontSize: 14,
    color: '#444',
    fontWeight: '600',
  },
  devHint: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
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
