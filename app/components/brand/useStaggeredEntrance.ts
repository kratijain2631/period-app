import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import { useIsFocused } from '@react-navigation/native';

type StaggeredOptions = {
  duration?: number;
  stagger?: number;
  initialDelay?: number;
  distance?: number;
};

export const useStaggeredEntrance = (
  count: number,
  {
    duration = 420,
    stagger = 70,
    initialDelay = 0,
    distance = 12,
  }: StaggeredOptions = {},
) => {
  const isFocused = useIsFocused();
  const valuesRef = useRef<Animated.Value[]>([]);

  if (valuesRef.current.length !== count) {
    valuesRef.current = Array.from(
      { length: count },
      (_, index) => valuesRef.current[index] ?? new Animated.Value(0),
    );
  }

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    valuesRef.current.forEach((value) => {
      value.stopAnimation();
      value.setValue(0);
    });

    const animation = Animated.stagger(
      stagger,
      valuesRef.current.map((value) =>
        Animated.timing(value, {
          toValue: 1,
          duration,
          delay: initialDelay,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ),
    );
    animation.start();

    return () => {
      animation.stop();
      valuesRef.current.forEach((value) => value.stopAnimation());
    };
  }, [duration, initialDelay, isFocused, stagger]);

  const styles = useMemo(
    () =>
      valuesRef.current.map((value) => ({
        opacity: value,
        transform: [
          {
            translateY: value.interpolate({
              inputRange: [0, 1],
              outputRange: [distance, 0],
            }),
          },
        ],
      })),
    [distance],
  );

  return styles;
};
