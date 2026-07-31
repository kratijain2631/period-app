import { memo, useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useIsFocused } from '@react-navigation/native';

export const PHASES = [
  { name: 'menstruation', label: 'Menstruation', color: '#C4654A', lightBg: '#FFF0EB', days: 5 },
  { name: 'follicular', label: 'Follicular', color: '#7BA68F', lightBg: '#EDF5F0', days: 9 },
  { name: 'ovulation', label: 'Ovulation', color: '#D4A252', lightBg: '#FFF8ED', days: 3 },
  { name: 'luteal', label: 'Luteal', color: '#6B8DB5', lightBg: '#EEF3F8', days: 11 },
] as const;

const TOTAL_DAYS = 28;
const AnimatedPath = Animated.createAnimatedComponent(Path);

const normalizePhase = (value?: string | null) => (value ?? 'unknown').toLowerCase();

export const getPhaseColor = (phase?: string | null) =>
  PHASES.find((item) => item.name === normalizePhase(phase))?.color ?? '#6B8DB5';

export const getPhaseBg = (phase?: string | null) =>
  PHASES.find((item) => item.name === normalizePhase(phase))?.lightBg ?? '#EEF3F8';

const polarToCartesian = (cx: number, cy: number, radius: number, angleDeg: number) => {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
};

type RingPhase = { name: string; label: string; color: string; lightBg: string; days: number };

const clampInt = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, Math.round(value)));

// Build the ring's four phase segments. When a real cycle length is known, size
// menstruation = period length, ovulation ≈ a short fertile window, luteal =
// luteal length, and follicular = the remainder — so the ring reflects your
// actual cycle instead of a fixed 28-day split. Falls back to the idealized
// default ring (matching PHASES) when cycle data is absent.
const buildPhases = (
  cycleLengthDays?: number | null,
  periodLengthDays?: number | null,
  lutealLengthDays?: number | null,
): { phases: RingPhase[]; totalDays: number } => {
  if (cycleLengthDays == null || !Number.isFinite(cycleLengthDays)) {
    return { phases: PHASES.map((phase) => ({ ...phase })), totalDays: TOTAL_DAYS };
  }
  const cycle = clampInt(cycleLengthDays, 16, 60);
  const menstruation = clampInt(periodLengthDays ?? 5, 2, Math.max(2, Math.floor(cycle / 2)));
  const ovulation = 3;
  const luteal = clampInt(
    lutealLengthDays ?? 14,
    7,
    Math.max(7, cycle - menstruation - ovulation - 1),
  );
  const follicular = Math.max(1, cycle - menstruation - ovulation - luteal);
  const meta = (name: string) => PHASES.find((phase) => phase.name === name) ?? PHASES[0];
  const phases: RingPhase[] = [
    { ...meta('menstruation'), days: menstruation },
    { ...meta('follicular'), days: follicular },
    { ...meta('ovulation'), days: ovulation },
    { ...meta('luteal'), days: luteal },
  ];
  return { phases, totalDays: menstruation + follicular + ovulation + luteal };
};

// Angle for the "you are here" dot: the center of the segment matching the
// phase, so the dot's color always sits on the same-colored arc. Falls back to
// day-fraction when the phase is unknown. (Positioning purely by day-fraction let
// a real, longer cycle put the dot on the wrong-colored segment — see BUGS.md.)
const phaseAngleForDot = (
  phases: readonly RingPhase[],
  totalDays: number,
  phase: string | null | undefined,
  fallbackDay: number,
): number => {
  const index = phases.findIndex((item) => item.name === normalizePhase(phase));
  if (index >= 0) {
    let arcStart = 0;
    for (let i = 0; i < index; i += 1) {
      arcStart += (phases[i].days / totalDays) * 360;
    }
    const phaseSweep = (phases[index].days / totalDays) * 360;
    return arcStart + phaseSweep / 2;
  }
  return ((fallbackDay - 1) / totalDays) * 360;
};

const describeArc = (
  cx: number,
  cy: number,
  radius: number,
  startDeg: number,
  sweepDeg: number,
) => {
  if (sweepDeg <= 0) {
    return '';
  }
  const endDeg = startDeg + sweepDeg;
  const start = polarToCartesian(cx, cy, radius, startDeg);
  const end = polarToCartesian(cx, cy, radius, endDeg);
  const largeArc = sweepDeg > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`;
};

type CycleRingProps = {
  currentDay?: number | null;
  currentPhase?: string | null;
  cycleLengthDays?: number | null;
  lutealLengthDays?: number | null;
  periodLengthDays?: number | null;
  size?: number;
  strokeWidth?: number;
  showCenter?: boolean;
};

export const CycleRing = memo(
  ({
    currentDay = 1,
    currentPhase,
    cycleLengthDays,
    lutealLengthDays,
    periodLengthDays,
    size = 180,
    strokeWidth,
    showCenter = true,
  }: CycleRingProps) => {
    const isFocused = useIsFocused();
    const center = size / 2;
    const sw = strokeWidth ?? Math.max(8, size * 0.08);
    const radius = center - sw - 2;
    const gapDeg = 4;
    const segmentProgress = useRef(PHASES.map(() => new Animated.Value(0))).current;
    const dotScale = useRef(new Animated.Value(0)).current;
    const centerOpacity = useRef(new Animated.Value(0)).current;
    const centerScale = useRef(new Animated.Value(0.85)).current;

    // Segments sized to the real cycle when we have it (falls back to 28-day).
    const { phases, totalDays } = useMemo(
      () => buildPhases(cycleLengthDays, periodLengthDays, lutealLengthDays),
      [cycleLengthDays, lutealLengthDays, periodLengthDays],
    );

    const segments = useMemo(() => {
      let startAngle = 0;
      return phases.map((phase) => {
        const fullSweep = (phase.days / totalDays) * 360;
        const sweep = fullSweep - gapDeg;
        const segment = { ...phase, start: startAngle + gapDeg / 2, sweep };
        startAngle += fullSweep;
        return segment;
      });
    }, [gapDeg, phases, totalDays]);

    const normalizedDay = Number.isFinite(currentDay)
      ? Math.max(1, Math.min(totalDays, Math.round(currentDay ?? 1)))
      : 1;
    const dayAngle = phaseAngleForDot(phases, totalDays, currentPhase, normalizedDay);
    const dot = polarToCartesian(center, center, radius, dayAngle);
    const dotRadius = Math.max(4, sw * 0.55);
    const currentColor = getPhaseColor(currentPhase);

    useEffect(() => {
      if (!isFocused) {
        return;
      }
      segmentProgress.forEach((value) => value.setValue(0));
      dotScale.setValue(0);
      centerOpacity.setValue(0);
      centerScale.setValue(0.85);

      const segmentAnimations = segmentProgress.map((value, index) =>
        Animated.timing(value, {
          toValue: 1,
          duration: 700,
          delay: 80 + index * 120,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          useNativeDriver: false,
        }),
      );

      Animated.parallel([
        ...segmentAnimations,
        Animated.sequence([
          Animated.delay(550),
          Animated.spring(dotScale, {
            toValue: 1,
            speed: 18,
            bounciness: 8,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.delay(250),
          Animated.parallel([
            Animated.timing(centerOpacity, {
              toValue: 1,
              duration: 280,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(centerScale, {
              toValue: 1,
              duration: 280,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
          ]),
        ]),
      ]).start();
    }, [
      centerOpacity,
      centerScale,
      currentDay,
      currentPhase,
      dotScale,
      isFocused,
      segmentProgress,
      size,
      strokeWidth,
    ]);

    return (
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#EEEAE4"
            strokeWidth={sw}
            opacity={0.6}
          />

          {segments.map((segment, index) => {
            const segmentLength = (2 * Math.PI * radius * segment.sweep) / 360;
            const strokeDashoffset = segmentProgress[index].interpolate({
              inputRange: [0, 1],
              outputRange: [segmentLength, 0],
            });
            return (
            <AnimatedPath
              key={segment.name}
              d={describeArc(center, center, radius, segment.start, segment.sweep)}
              fill="none"
              stroke={segment.color}
              strokeWidth={sw}
              strokeLinecap="butt"
              strokeDasharray={`${segmentLength} ${segmentLength}`}
              strokeDashoffset={strokeDashoffset as unknown as number}
            />
            );
          })}
        </Svg>

        <Animated.View
          style={[
            styles.ringDotOuter,
            {
              width: (dotRadius + 3) * 2,
              height: (dotRadius + 3) * 2,
              borderRadius: dotRadius + 3,
              left: dot.x - (dotRadius + 3),
              top: dot.y - (dotRadius + 3),
              transform: [{ scale: dotScale }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.ringDotInner,
            {
              width: dotRadius * 2,
              height: dotRadius * 2,
              borderRadius: dotRadius,
              left: dot.x - dotRadius,
              top: dot.y - dotRadius,
              backgroundColor: currentColor,
              transform: [{ scale: dotScale }],
            },
          ]}
        />

        {showCenter ? (
          <Animated.View
            style={[
              styles.centerLabel,
              {
                opacity: centerOpacity,
                transform: [{ scale: centerScale }],
              },
            ]}
          >
            <Text style={[styles.dayNumber, { fontSize: size * 0.22 }]}>{normalizedDay}</Text>
            <Text style={styles.dayMeta}>of {totalDays} days</Text>
          </Animated.View>
        ) : null}
      </View>
    );
  },
);

type SyncRingsProps = {
  yourDay?: number | null;
  yourPhase?: string | null;
  theirDay?: number | null;
  theirPhase?: string | null;
  syncPercent: number;
  yourInitial?: string;
  friendInitial?: string;
  yourAvatarUrl?: string | null;
  friendAvatarUrl?: string | null;
  size?: number;
};

export const SyncRings = memo(
  ({
    yourDay = 1,
    yourPhase,
    theirDay = 1,
    theirPhase,
    syncPercent,
    yourInitial = 'Y',
    friendInitial = 'F',
    yourAvatarUrl = null,
    friendAvatarUrl = null,
    size = 180,
  }: SyncRingsProps) => {
    const isFocused = useIsFocused();
    const center = size / 2;
    const outerStroke = Math.max(7, size * 0.055);
    const innerStroke = Math.max(6, size * 0.045);
    const ringGap = outerStroke + 6;
    const outerRadius = center - outerStroke - 2;
    const innerRadius = outerRadius - ringGap;
    const gapDeg = 4;
    const outerSegmentProgress = useRef(PHASES.map(() => new Animated.Value(0))).current;
    const innerSegmentProgress = useRef(PHASES.map(() => new Animated.Value(0))).current;
    const yourAvatarScale = useRef(new Animated.Value(0)).current;
    const friendAvatarScale = useRef(new Animated.Value(0)).current;
    const centerOpacity = useRef(new Animated.Value(0)).current;
    const centerScale = useRef(new Animated.Value(0.85)).current;

    const buildSegments = () => {
      let startAngle = 0;
      return PHASES.map((phase) => {
        const fullSweep = (phase.days / TOTAL_DAYS) * 360;
        const sweep = fullSweep - gapDeg;
        const segment = { ...phase, start: startAngle + gapDeg / 2, sweep };
        startAngle += fullSweep;
        return segment;
      });
    };

    const outerSegments = useMemo(() => buildSegments(), [gapDeg]);
    const innerSegments = useMemo(() => buildSegments(), [gapDeg]);

    const safeYourDay = Math.max(1, Math.min(TOTAL_DAYS, Math.round(yourDay ?? 1)));
    const safeTheirDay = Math.max(1, Math.min(TOTAL_DAYS, Math.round(theirDay ?? 1)));

    const yourDot = polarToCartesian(
      center,
      center,
      outerRadius,
      phaseAngleForDot(PHASES, TOTAL_DAYS, yourPhase, safeYourDay),
    );
    const friendDot = polarToCartesian(
      center,
      center,
      innerRadius,
      phaseAngleForDot(PHASES, TOTAL_DAYS, theirPhase, safeTheirDay),
    );
    const yourColor = getPhaseColor(yourPhase);
    const friendColor = getPhaseColor(theirPhase);
    const yourBg = getPhaseBg(yourPhase);
    const friendBg = getPhaseBg(theirPhase);

    const yourPicRadius = Math.max(9, outerStroke * 1.2);
    const friendPicRadius = Math.max(8, innerStroke * 1.1);

    useEffect(() => {
      if (!isFocused) {
        return;
      }
      outerSegmentProgress.forEach((value) => value.setValue(0));
      innerSegmentProgress.forEach((value) => value.setValue(0));
      yourAvatarScale.setValue(0);
      friendAvatarScale.setValue(0);
      centerOpacity.setValue(0);
      centerScale.setValue(0.85);

      const outerAnimations = outerSegmentProgress.map((value, index) =>
        Animated.timing(value, {
          toValue: 1,
          duration: 700,
          delay: 80 + index * 120,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          useNativeDriver: false,
        }),
      );
      const innerAnimations = innerSegmentProgress.map((value, index) =>
        Animated.timing(value, {
          toValue: 1,
          duration: 700,
          delay: 150 + index * 120,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          useNativeDriver: false,
        }),
      );

      Animated.parallel([
        ...outerAnimations,
        ...innerAnimations,
        Animated.sequence([
          Animated.delay(600),
          Animated.spring(yourAvatarScale, {
            toValue: 1,
            speed: 18,
            bounciness: 8,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.delay(650),
          Animated.spring(friendAvatarScale, {
            toValue: 1,
            speed: 18,
            bounciness: 8,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.delay(300),
          Animated.parallel([
            Animated.timing(centerOpacity, {
              toValue: 1,
              duration: 300,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(centerScale, {
              toValue: 1,
              duration: 300,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
          ]),
        ]),
      ]).start();
    }, [
      innerRadius,
      isFocused,
      outerRadius,
      size,
      syncPercent,
      theirDay,
      theirPhase,
      yourDay,
      yourPhase,
    ]);

    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Circle cx={center} cy={center} r={outerRadius} fill="none" stroke="#EEEAE4" strokeWidth={outerStroke} opacity={0.5} />
          <Circle cx={center} cy={center} r={innerRadius} fill="none" stroke="#EEEAE4" strokeWidth={innerStroke} opacity={0.4} />

          {outerSegments.map((segment, index) => {
            const segmentLength = (2 * Math.PI * outerRadius * segment.sweep) / 360;
            const strokeDashoffset = outerSegmentProgress[index].interpolate({
              inputRange: [0, 1],
              outputRange: [segmentLength, 0],
            });
            return (
            <AnimatedPath
              key={`o-${segment.name}`}
              d={describeArc(center, center, outerRadius, segment.start, segment.sweep)}
              fill="none"
              stroke={segment.color}
              strokeWidth={outerStroke}
              strokeLinecap="butt"
              strokeDasharray={`${segmentLength} ${segmentLength}`}
              strokeDashoffset={strokeDashoffset as unknown as number}
            />
            );
          })}

          {innerSegments.map((segment, index) => {
            const segmentLength = (2 * Math.PI * innerRadius * segment.sweep) / 360;
            const strokeDashoffset = innerSegmentProgress[index].interpolate({
              inputRange: [0, 1],
              outputRange: [segmentLength, 0],
            });
            return (
            <AnimatedPath
              key={`i-${segment.name}`}
              d={describeArc(center, center, innerRadius, segment.start, segment.sweep)}
              fill="none"
              stroke={segment.color}
              strokeWidth={innerStroke}
              strokeLinecap="butt"
              opacity={0.65}
              strokeDasharray={`${segmentLength} ${segmentLength}`}
              strokeDashoffset={strokeDashoffset as unknown as number}
            />
            );
          })}

        </Svg>

        <Animated.View
          style={[
            styles.syncAvatar,
            {
              left: yourDot.x - yourPicRadius,
              top: yourDot.y - yourPicRadius,
              width: yourPicRadius * 2,
              height: yourPicRadius * 2,
              borderRadius: yourPicRadius,
              backgroundColor: yourBg,
              opacity: yourAvatarScale,
              transform: [{ scale: yourAvatarScale }],
            },
          ]}
        >
          {yourAvatarUrl ? (
            <Image source={{ uri: yourAvatarUrl }} style={styles.syncAvatarImage} />
          ) : (
            <Text style={[styles.syncAvatarText, { color: yourColor, fontSize: yourPicRadius * 0.95 }]}>
              {yourInitial}
            </Text>
          )}
        </Animated.View>

        <Animated.View
          style={[
            styles.syncAvatar,
            {
              left: friendDot.x - friendPicRadius,
              top: friendDot.y - friendPicRadius,
              width: friendPicRadius * 2,
              height: friendPicRadius * 2,
              borderRadius: friendPicRadius,
              backgroundColor: friendBg,
              opacity: friendAvatarScale,
              transform: [{ scale: friendAvatarScale }],
            },
          ]}
        >
          {friendAvatarUrl ? (
            <Image source={{ uri: friendAvatarUrl }} style={styles.syncAvatarImage} />
          ) : (
            <Text style={[styles.syncAvatarText, { color: friendColor, fontSize: friendPicRadius * 0.95 }]}>
              {friendInitial}
            </Text>
          )}
        </Animated.View>

        <Animated.View
          style={[
            styles.syncCenter,
            {
              opacity: centerOpacity,
              transform: [{ scale: centerScale }],
            },
          ]}
        >
          <Text style={[styles.syncPercent, { fontSize: size * 0.2 }]}>{Math.round(syncPercent)}%</Text>
        </Animated.View>
      </View>
    );
  },
);

export const PhaseIndicator = memo(({ phase }: { phase?: string | null }) => {
  const color = getPhaseColor(phase);
  const label = PHASES.find((item) => item.name === normalizePhase(phase))?.label ?? 'Unknown';

  return (
    <View style={[styles.phasePill, { backgroundColor: `${color}12` }]}> 
      <View style={[styles.phasePillDot, { backgroundColor: color }]} />
      <Text style={[styles.phasePillText, { color }]}>{label} Phase</Text>
    </View>
  );
});

export const PhaseAvatar = memo(
  ({ initial, phase, size = 44 }: { initial: string; phase?: string | null; size?: number }) => {
    const bg = getPhaseBg(phase);
    const color = getPhaseColor(phase);

    return (
      <View
        style={[
          styles.avatar,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: bg,
          },
        ]}
      >
        <Text style={[styles.avatarText, { color, fontSize: size * 0.36 }]}>{initial}</Text>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  centerLabel: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringDotOuter: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
  },
  ringDotInner: {
    position: 'absolute',
  },
  dayNumber: {
    color: '#2D2A26',
    fontWeight: '800',
    lineHeight: 42,
  },
  dayMeta: {
    marginTop: 2,
    color: '#B5AFA7',
    fontSize: 10,
    letterSpacing: 0.2,
  },
  syncCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncPercent: {
    color: '#2D2A26',
    fontWeight: '800',
  },
  syncAvatar: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  syncAvatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  syncAvatarText: {
    fontWeight: '700',
  },
  phasePill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  phasePillDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  phasePillText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  avatarText: {
    fontWeight: '700',
  },
});
