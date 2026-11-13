import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { OpeningIdentity } from './OpeningIdentity';
import { illustratedTheme } from '../../theme/widgetTheme';

type Props = {
  /** Called once the intro has fully faded out. */
  onDone: () => void;
};

const FADE_IN_MS = 480;
const HOLD_MS = 1500;
const FADE_OUT_MS = 460;

/**
 * A short branded intro shown on every app open — the name + tagline on the
 * brand background — that fades in, holds ~1.5s, then fades out and calls
 * onDone. Rendered as an overlay on top of the app so it never blocks work:
 * the real UI hydrates behind it while this plays.
 */
export const BrandSplash = ({ onDone }: Props) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    const enter = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: FADE_IN_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(lift, {
        toValue: 0,
        duration: FADE_IN_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);

    const exit = Animated.timing(opacity, {
      toValue: 0,
      duration: FADE_OUT_MS,
      delay: HOLD_MS,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    });

    const sequence = Animated.sequence([enter, exit]);
    sequence.start(({ finished }) => {
      if (finished) {
        onDone();
      }
    });

    return () => sequence.stop();
  }, [lift, onDone, opacity]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity, transform: [{ translateY: lift }] }]}>
        <OpeningIdentity />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: illustratedTheme.colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
});

export default BrandSplash;
