import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, StyleSheet, Text } from 'react-native';
import { useSessionStore } from './app/state/sessionStore';

export default function App() {
  const session = useSessionStore((state) => state.session);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Cycle Companion</Text>
      <Text style={styles.subtitle}>
        {session ? `Signed in as ${session.userId}` : 'Sign in with Apple to continue'}
      </Text>
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#444',
  },
});
