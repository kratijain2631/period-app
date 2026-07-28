import { Component, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

type Props = {
  children: ReactNode;
};

type State = {
  error: Error | null;
};

/**
 * Catches render/lifecycle errors anywhere in the tree so a JS exception shows
 * a readable screen instead of hard-crashing the app to a blank white screen
 * (which is what happens in a release/TestFlight build with no dev red-box).
 *
 * The error text is shown on purpose: during the beta it lets a tester
 * screenshot the actual message, which is otherwise invisible in a release
 * build. Note: this only catches JS errors — a *native* crash (e.g. a native
 * module) will still terminate the app and must be read from the device/Xcode
 * crash log.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    // Surfaced in the JS logs (Xcode console / `eas` device logs) for diagnosis.
    console.error('[ErrorBoundary] Uncaught error', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) {
      return this.props.children;
    }

    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.body}>
            The app hit an unexpected error and couldn&apos;t continue. Please
            close and reopen it. If it keeps happening, screenshot this and send
            it to us — it helps us fix it fast.
          </Text>
          <Text style={styles.errorLabel}>Details</Text>
          <Text style={styles.errorText}>{error.message || String(error)}</Text>
          {error.stack ? <Text style={styles.stack}>{error.stack}</Text> : null}
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: '#4A4A4A',
  },
  errorLabel: {
    marginTop: 16,
    fontSize: 12,
    fontWeight: '700',
    color: '#9A9A9A',
    textTransform: 'uppercase',
  },
  errorText: {
    fontSize: 14,
    color: '#B00020',
  },
  stack: {
    marginTop: 8,
    fontSize: 11,
    color: '#8A8A8A',
    fontFamily: 'Courier',
  },
});

export default ErrorBoundary;
