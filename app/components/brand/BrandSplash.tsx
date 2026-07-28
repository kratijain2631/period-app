import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { APP_NAME, APP_TAGLINE } from '../../config/branding';
import { brand, brandType } from '../../theme/brand';

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
        <View style={styles.drop} />
        <Text style={styles.name}>{APP_NAME}</Text>
        <Text style={styles.tagline}>{APP_TAGLINE}</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: brand.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  // A simple red "drop" mark (rounded square, pointed bottom-left, rotated).
  drop: {
    width: 34,
    height: 34,
    backgroundColor: brand.colors.accent,
    borderTopLeftRadius: 17,
    borderTopRightRadius: 17,
    borderBottomRightRadius: 17,
    borderBottomLeftRadius: 4,
    transform: [{ rotate: '45deg' }],
    marginBottom: 22,
  },
  name: {
    ...brandType.display,
    fontSize: 40,
    color: brand.colors.primaryText,
    marginBottom: 10,
  },
  tagline: {
    ...brandType.body,
    fontSize: 15,
    color: brand.colors.secondaryText,
    textAlign: 'center',
  },
});

export default BrandSplash;
