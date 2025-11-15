import { useCallback } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSessionStore } from '../../../state/sessionStore';

const AuthScreen = () => {
  const setSession = useSessionStore((state) => state.setSession);

  const handleSignIn = useCallback(() => {
    setSession({
      userId: 'demo-user',
      accessToken: 'demo-token',
    });
  }, [setSession]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Welcome to Cycle Companion</Text>
        <Text style={styles.description}>
          Sign in with Apple to sync your menstrual health data. This placeholder button simulates SIWA
          until the real flow is wired.
        </Text>
        <TouchableOpacity style={styles.button} onPress={handleSignIn}>
          <Text style={styles.buttonLabel}>Sign in with Apple</Text>
        </TouchableOpacity>
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
});

export default AuthScreen;
