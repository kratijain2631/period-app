import { memo } from 'react';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

type DottieMood = 'happy' | 'sleepy' | 'waving' | 'meditating' | 'cheering';

type DottieTheme =
  | 'hydrate'
  | 'movement'
  | 'nourish'
  | 'caffeine'
  | 'overcommit'
  | 'workouts';

const darken = (hex: string, amount: number) => {
  const num = Number.parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, ((num >> 16) & 0xff) * (1 - amount));
  const g = Math.max(0, ((num >> 8) & 0xff) * (1 - amount));
  const b = Math.max(0, (num & 0xff) * (1 - amount));
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
};

export const DottieMascot = memo(
  ({
    size = 120,
    mood = 'happy',
    color = '#C4654A',
  }: {
    size?: number;
    mood?: DottieMood;
    color?: string;
  }) => {
    const eyesClosed = mood === 'sleepy';
    return (
      <Svg width={size} height={size} viewBox="0 0 120 120" fill="none">
        <Ellipse cx="60" cy="112" rx="22" ry="5" fill="#E8E4DE" opacity={0.5} />
        <Path
          d="M60 12 C60 12 30 52 30 72 C30 88.568 43.432 102 60 102 C76.568 102 90 88.568 90 72 C90 52 60 12 60 12Z"
          fill={color}
        />
        <Circle cx="44" cy="78" r="4.5" fill="#FFD4C4" opacity={0.45} />
        <Circle cx="76" cy="78" r="4.5" fill="#FFD4C4" opacity={0.45} />

        {eyesClosed ? (
          <>
            <Path d="M49 71 Q53 74 57 71" stroke="#3D2920" strokeWidth={2.5} strokeLinecap="round" />
            <Path d="M63 71 Q67 74 71 71" stroke="#3D2920" strokeWidth={2.5} strokeLinecap="round" />
            <SvgText x="82" y="54" fill="#3D2920" opacity={0.35} fontSize={10} fontWeight="700">
              z
            </SvgText>
            <SvgText x="88" y="46" fill="#3D2920" opacity={0.25} fontSize={8} fontWeight="700">
              z
            </SvgText>
          </>
        ) : (
          <>
            <Circle cx="52" cy="70" r="4.5" fill="#3D2920" />
            <Circle cx="68" cy="70" r="4.5" fill="#3D2920" />
            <Circle cx="54" cy="68" r="1.5" fill="#FFF" />
            <Circle cx="70" cy="68" r="1.5" fill="#FFF" />
          </>
        )}

        {mood === 'happy' || mood === 'waving' ? (
          <Path d="M56 81 Q60 85 64 81" stroke="#3D2920" strokeWidth={2} strokeLinecap="round" />
        ) : mood === 'cheering' ? (
          <Path d="M55 80 Q60 87 65 80" stroke="#3D2920" strokeWidth={2} strokeLinecap="round" />
        ) : (
          <Path d="M57 82 Q60 84 63 82" stroke="#3D2920" strokeWidth={1.5} strokeLinecap="round" />
        )}

        {mood === 'waving' ? (
          <>
            <Path d="M34 78 Q28 84 27 90" stroke={color} strokeWidth={4} strokeLinecap="round" />
            <Path d="M86 74 Q92 64 96 58" stroke={color} strokeWidth={4} strokeLinecap="round" />
            <Circle cx="96" cy="56" r="4" fill={color} />
          </>
        ) : null}
        {mood === 'cheering' ? (
          <>
            <Path d="M34 74 Q26 62 22 54" stroke={color} strokeWidth={4} strokeLinecap="round" />
            <Path d="M86 74 Q94 62 98 54" stroke={color} strokeWidth={4} strokeLinecap="round" />
            <Circle cx="21" cy="52" r="4" fill={color} />
            <Circle cx="99" cy="52" r="4" fill={color} />
          </>
        ) : null}
        {mood === 'meditating' ? (
          <>
            <Path d="M34 82 Q28 88 32 94" stroke={color} strokeWidth={4} strokeLinecap="round" />
            <Path d="M86 82 Q92 88 88 94" stroke={color} strokeWidth={4} strokeLinecap="round" />
          </>
        ) : null}
        {mood === 'happy' ? (
          <>
            <Path d="M34 78 Q28 86 30 94" stroke={color} strokeWidth={4} strokeLinecap="round" />
            <Path d="M86 78 Q92 86 90 94" stroke={color} strokeWidth={4} strokeLinecap="round" />
          </>
        ) : null}

        <Ellipse cx="52" cy="102" rx="6" ry="3" fill={darken(color, 0.15)} />
        <Ellipse cx="68" cy="102" rx="6" ry="3" fill={darken(color, 0.15)} />
      </Svg>
    );
  },
);

export const DottieThemed = memo(
  ({ theme, size = 60, color }: { theme: DottieTheme; size?: number; color: string }) => {
    const dk = darken(color, 0.15);
    return (
      <Svg width={size} height={size * 1.15} viewBox="0 0 60 69" fill="none">
        <Ellipse cx="30" cy="64" rx="14" ry="3" fill="#E8E4DE" opacity={0.4} />
        <Path
          d="M30 5 C30 5 12 28 12 38 C12 48.493 19.507 56 30 56 C40.493 56 48 48.493 48 38 C48 28 30 5 30 5Z"
          fill={color}
        />
        <Ellipse cx="25" cy="56" rx="4" ry="1.8" fill={dk} />
        <Ellipse cx="35" cy="56" rx="4" ry="1.8" fill={dk} />
        <Circle cx="21" cy="43" r="2.5" fill="#FFD4C4" opacity={0.35} />
        <Circle cx="39" cy="43" r="2.5" fill="#FFD4C4" opacity={0.35} />

        {theme === 'hydrate' || theme === 'movement' || theme === 'nourish' ? (
          <>
            <Circle cx="26" cy="37" r="2" fill="#3D2920" />
            <Circle cx="34" cy="37" r="2" fill="#3D2920" />
            <Circle cx="27" cy="35.8" r="0.7" fill="#FFF" />
            <Circle cx="35" cy="35.8" r="0.7" fill="#FFF" />
          </>
        ) : null}

        {theme === 'hydrate' ? (
          <>
            <Path d="M27 44 Q30 47 33 44" stroke="#3D2920" strokeWidth={1.2} strokeLinecap="round" />
            <Path d="M14 40 Q9 46 10 52" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
            <Path d="M46 40 Q51 46 50 52" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
          </>
        ) : null}

        {theme === 'movement' ? (
          <>
            <Path d="M27 44 Q30 47 33 44" stroke="#3D2920" strokeWidth={1.2} strokeLinecap="round" />
            <Path d="M14 38 Q8 30 6 24" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
            <Path d="M46 38 Q52 30 54 24" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
            <Circle cx="6" cy="23" r="2.5" fill={color} />
            <Circle cx="54" cy="23" r="2.5" fill={color} />
            <Circle cx="9" cy="29" r="2" fill={color} opacity={0.5} />
            <Circle cx="51" cy="29" r="2" fill={color} opacity={0.5} />
          </>
        ) : null}

        {theme === 'nourish' ? (
          <>
            <Path d="M26 43 Q30 48 34 43" stroke="#3D2920" strokeWidth={1.3} strokeLinecap="round" />
            <Path d="M14 36 Q7 26 5 20" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
            <Path d="M46 36 Q53 26 55 20" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
            <Circle cx="5" cy="19" r="2.5" fill={color} />
            <Circle cx="55" cy="19" r="2.5" fill={color} />
          </>
        ) : null}

        {theme === 'caffeine' ? (
          <>
            <Path d="M24 37 Q26.5 39.5 29 37" stroke="#3D2920" strokeWidth={1.8} strokeLinecap="round" />
            <Path d="M31 37 Q33.5 39.5 36 37" stroke="#3D2920" strokeWidth={1.8} strokeLinecap="round" />
            <Path d="M28 45 Q30 43.5 32 45" stroke="#3D2920" strokeWidth={1.2} strokeLinecap="round" />
            <Path d="M14 40 Q10 44 14 48" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
            <Path d="M46 40 Q50 44 46 48" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
            <SvgText x="42" y="22" fill="#3D2920" opacity={0.35} fontSize={7} fontWeight="700">
              z
            </SvgText>
            <SvgText x="47" y="16" fill="#3D2920" opacity={0.25} fontSize={5.5} fontWeight="700">
              z
            </SvgText>
            <G x={42} y={48}>
              <Rect x="0" y="2" width="7" height="7" rx="1" fill="#8B7355" opacity={0.7} />
              <Path d="M7 4 Q10 4 10 6.5 Q10 9 7 9" stroke="#8B7355" strokeWidth={1} />
              <Path d="M2 1 Q2 -1 3 -2" stroke="#B5AFA7" strokeWidth={0.6} strokeLinecap="round" opacity={0.5} />
              <Path d="M5 0.5 Q5 -1.5 6 -2.5" stroke="#B5AFA7" strokeWidth={0.6} strokeLinecap="round" opacity={0.4} />
            </G>
          </>
        ) : null}

        {theme === 'overcommit' ? (
          <>
            <Circle cx="26" cy="36" r="2.5" fill="#3D2920" />
            <Circle cx="34" cy="36" r="2.5" fill="#3D2920" />
            <Circle cx="27" cy="34.5" r="1" fill="#FFF" />
            <Circle cx="35" cy="34.5" r="1" fill="#FFF" />
            <Path d="M23 32 Q26 30 28 31.5" stroke="#3D2920" strokeWidth={1} strokeLinecap="round" />
            <Path d="M32 31.5 Q34 30 37 32" stroke="#3D2920" strokeWidth={1} strokeLinecap="round" />
            <Path d="M27 44 Q28.5 42 30 44 Q31.5 42 33 44" stroke="#3D2920" strokeWidth={1.1} strokeLinecap="round" />
            <Path d="M14 36 Q6 28 4 22" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
            <Path d="M46 36 Q54 28 56 22" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
            <Circle cx="4" cy="21" r="2.5" fill={color} />
            <Circle cx="56" cy="21" r="2.5" fill={color} />
            <Path d="M19 30 Q18.5 27 19 25" stroke="#6B8DB5" strokeWidth={1} strokeLinecap="round" opacity={0.6} />
            <Circle cx="19" cy="25" r="1" fill="#6B8DB5" opacity={0.5} />
          </>
        ) : null}

        {theme === 'workouts' ? (
          <>
            <Path d="M24 37 Q26 35 28 37" stroke="#3D2920" strokeWidth={1.8} strokeLinecap="round" />
            <Path d="M32 37 Q34 35 36 37" stroke="#3D2920" strokeWidth={1.8} strokeLinecap="round" />
            <Path d="M27 45 Q30 43 33 45" stroke="#3D2920" strokeWidth={1.2} strokeLinecap="round" />
            <Path d="M14 38 Q6 34 3 32" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
            <Path d="M46 38 Q54 34 57 32" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
            <G x={-2} y={28}>
              <Rect x="0" y="0" width="3" height="7" rx="1" fill="#8A857E" opacity={0.7} />
              <Rect x="3" y="2" width="4" height="3" rx="0.5" fill="#B5AFA7" opacity={0.6} />
              <Rect x="7" y="0" width="3" height="7" rx="1" fill="#8A857E" opacity={0.7} />
            </G>
            <G x={50} y={28}>
              <Rect x="0" y="0" width="3" height="7" rx="1" fill="#8A857E" opacity={0.7} />
              <Rect x="3" y="2" width="4" height="3" rx="0.5" fill="#B5AFA7" opacity={0.6} />
              <Rect x="7" y="0" width="3" height="7" rx="1" fill="#8A857E" opacity={0.7} />
            </G>
            <Path d="M19 29 L18 25" stroke="#6B8DB5" strokeWidth={0.8} strokeLinecap="round" opacity={0.6} />
            <Circle cx="18" cy="24.5" r="0.8" fill="#6B8DB5" opacity={0.5} />
            <Path d="M41 29 L42 25" stroke="#6B8DB5" strokeWidth={0.8} strokeLinecap="round" opacity={0.6} />
            <Circle cx="42" cy="24.5" r="0.8" fill="#6B8DB5" opacity={0.5} />
          </>
        ) : null}
      </Svg>
    );
  },
);

export const DottieAndFriend = memo(
  ({
    size = 160,
    color1 = '#C4654A',
    color2 = '#7BA68F',
  }: {
    size?: number;
    color1?: string;
    color2?: string;
  }) => (
    <Svg width={size} height={size * 0.75} viewBox="0 0 160 120" fill="none">
      <Ellipse cx="80" cy="112" rx="50" ry="6" fill="#E8E4DE" opacity={0.5} />
      <G x={30} y={8}>
        <Path
          d="M35 8 C35 8 12 40 12 56 C12 68.703 22.297 79 35 79 C47.703 79 58 68.703 58 56 C58 40 35 8 35 8Z"
          fill={color1}
        />
        <Circle cx="29" cy="55" r="3" fill="#3D2920" />
        <Circle cx="41" cy="55" r="3" fill="#3D2920" />
        <Circle cx="30.5" cy="53.5" r="1" fill="#FFF" />
        <Circle cx="42.5" cy="53.5" r="1" fill="#FFF" />
        <Path d="M32 62 Q35 65 38 62" stroke="#3D2920" strokeWidth={1.5} strokeLinecap="round" />
        <Circle cx="24" cy="59" r="3.5" fill="#FFD4C4" opacity={0.4} />
        <Circle cx="46" cy="59" r="3.5" fill="#FFD4C4" opacity={0.4} />
        <Path d="M54 58 Q62 54 66 50" stroke={color1} strokeWidth={3} strokeLinecap="round" />
        <Ellipse cx="30" cy="79" rx="4.5" ry="2.5" fill={darken(color1, 0.15)} />
        <Ellipse cx="40" cy="79" rx="4.5" ry="2.5" fill={darken(color1, 0.15)} />
      </G>
      <G x={90} y={22}>
        <Path
          d="M25 6 C25 6 8 30 8 42 C8 51.389 15.611 59 25 59 C34.389 59 42 51.389 42 42 C42 30 25 6 25 6Z"
          fill={color2}
        />
        <Circle cx="21" cy="41" r="2.5" fill="#3D2920" />
        <Circle cx="30" cy="41" r="2.5" fill="#3D2920" />
        <Circle cx="22" cy="39.5" r="0.8" fill="#FFF" />
        <Circle cx="31" cy="39.5" r="0.8" fill="#FFF" />
        <Path d="M23 46 Q25.5 49 28 46" stroke="#3D2920" strokeWidth={1.2} strokeLinecap="round" />
        <Circle cx="17" cy="44" r="2.5" fill="#FFD4C4" opacity={0.4} />
        <Circle cx="34" cy="44" r="2.5" fill="#FFD4C4" opacity={0.4} />
        <Path d="M10 44 Q4 42 0 38" stroke={color2} strokeWidth={2.5} strokeLinecap="round" />
        <Ellipse cx="21" cy="59" rx="3.5" ry="2" fill={darken(color2, 0.15)} />
        <Ellipse cx="29" cy="59" rx="3.5" ry="2" fill={darken(color2, 0.15)} />
      </G>
      <G x={72} y={42}>
        <Path
          d="M8 4 C8 0 4 -1 2 1 C0 3 0 6 4 9 L8 12 L12 9 C16 6 16 3 14 1 C12 -1 8 0 8 4Z"
          fill="#C4654A"
          opacity={0.6}
        />
      </G>
    </Svg>
  ),
);

export const DottieSyncScene = memo(
  ({ color1 = '#C4654A', color2 = '#7BA68F', width = 380, height = 280 }: {
    color1?: string;
    color2?: string;
    width?: number;
    height?: number;
  }) => (
    <Svg width={width} height={height} viewBox="0 0 380 280" fill="none" preserveAspectRatio="xMidYMid slice">
      <Defs>
        <LinearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#F0F4F8" />
          <Stop offset="30%" stopColor="#F0F4F8" />
          <Stop offset="55%" stopColor="#F5F3F0" />
          <Stop offset="80%" stopColor="#FAFAF9" />
          <Stop offset="100%" stopColor="#FFFFFF" />
        </LinearGradient>
        <LinearGradient id="bottomFade" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0} />
          <Stop offset="60%" stopColor="#FFFFFF" stopOpacity={0.6} />
          <Stop offset="90%" stopColor="#FFFFFF" stopOpacity={0.95} />
          <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={1} />
        </LinearGradient>
      </Defs>

      <Rect width="380" height="280" fill="url(#skyGrad)" />
      <Circle cx="320" cy="108" r="16" fill="#F5D680" opacity={0.45} />
      <Circle cx="320" cy="108" r="10" fill="#EDBE4C" opacity={0.3} />

      <G opacity={0.35}>
        <Ellipse cx="70" cy="100" rx="22" ry="7" fill="#FFF" />
        <Ellipse cx="55" cy="97" rx="12" ry="5.5" fill="#FFF" />
        <Ellipse cx="86" cy="98" rx="10" ry="5" fill="#FFF" />
      </G>
      <G opacity={0.2}>
        <Ellipse cx="280" cy="118" rx="18" ry="6" fill="#FFF" />
        <Ellipse cx="268" cy="115" rx="10" ry="5" fill="#FFF" />
        <Ellipse cx="294" cy="116" rx="8" ry="4.5" fill="#FFF" />
      </G>
      <G opacity={0.15}>
        <Ellipse cx="190" cy="78" rx="16" ry="5" fill="#FFF" />
        <Ellipse cx="178" cy="76" rx="8" ry="4" fill="#FFF" />
      </G>

      <Path
        d="M0 250 Q80 238 160 245 Q240 252 320 242 Q350 240 380 245 L380 280 L0 280 Z"
        fill="#EDE9E3"
        opacity={0.3}
      />
      <Path
        d="M0 260 Q90 252 180 258 Q270 264 380 256 L380 280 L0 280 Z"
        fill="#F0EDE8"
        opacity={0.25}
      />

      <Circle cx="120" cy="262" r="1.5" fill="#D4A252" opacity={0.25} />
      <Circle cx="200" cy="258" r="1" fill="#7BA68F" opacity={0.25} />
      <Circle cx="270" cy="257" r="1.5" fill="#C4654A" opacity={0.2} />

      <G x={125} y={175}>
        <Ellipse cx="28" cy="78" rx="16" ry="3.5" fill="#D5D0C9" opacity={0.3} />
        <Path
          d="M28 5 C28 5 10 35 10 48 C10 58.493 18.507 67 28 67 C37.493 67 46 58.493 46 48 C46 35 28 5 28 5Z"
          fill={color1}
        />
        <Circle cx="23" cy="46" r="2.5" fill="#3D2920" />
        <Circle cx="33" cy="46" r="2.5" fill="#3D2920" />
        <Circle cx="24.2" cy="44.8" r="0.9" fill="#FFF" />
        <Circle cx="34.2" cy="44.8" r="0.9" fill="#FFF" />
        <Path d="M25 53 Q28 56 31 53" stroke="#3D2920" strokeWidth={1.3} strokeLinecap="round" />
        <Circle cx="19" cy="50" r="2.5" fill="#FFD4C4" opacity={0.35} />
        <Circle cx="37" cy="50" r="2.5" fill="#FFD4C4" opacity={0.35} />
        <Path d="M42 48 Q50 40 53 34" stroke={color1} strokeWidth={3} strokeLinecap="round" />
        <Circle cx="53" cy="33" r="3" fill={color1} />
        <Path d="M14 50 Q8 56 9 62" stroke={color1} strokeWidth={3} strokeLinecap="round" />
        <Ellipse cx="23" cy="67" rx="4.5" ry="2" fill={darken(color1, 0.15)} />
        <Ellipse cx="33" cy="67" rx="4.5" ry="2" fill={darken(color1, 0.15)} />
      </G>

      <G x={225} y={190}>
        <Ellipse cx="22" cy="60" rx="12" ry="3" fill="#D5D0C9" opacity={0.3} />
        <Path
          d="M22 4 C22 4 8 28 8 38 C8 45.732 14.268 52 22 52 C29.732 52 36 45.732 36 38 C36 28 22 4 22 4Z"
          fill={color2}
        />
        <Path d="M17 37 Q19.5 40 22 37" stroke="#3D2920" strokeWidth={1.5} strokeLinecap="round" />
        <Path d="M24 37 Q26.5 40 29 37" stroke="#3D2920" strokeWidth={1.5} strokeLinecap="round" />
        <Path d="M19 44 Q22 47 25 44" stroke="#3D2920" strokeWidth={1.2} strokeLinecap="round" />
        <Circle cx="14" cy="41" r="2" fill="#FFD4C4" opacity={0.35} />
        <Circle cx="30" cy="41" r="2" fill="#FFD4C4" opacity={0.35} />
        <Path d="M8 40 Q3 33 1 27" stroke={color2} strokeWidth={2.5} strokeLinecap="round" />
        <Path d="M36 40 Q41 33 43 27" stroke={color2} strokeWidth={2.5} strokeLinecap="round" />
        <Circle cx="1" cy="26" r="2.5" fill={color2} />
        <Circle cx="43" cy="26" r="2.5" fill={color2} />
        <Ellipse cx="18" cy="52" rx="3.5" ry="1.8" fill={darken(color2, 0.15)} />
        <Ellipse cx="26" cy="52" rx="3.5" ry="1.8" fill={darken(color2, 0.15)} />
      </G>

      <G x={215} y={208} opacity={0.45}>
        <Path
          d="M5 2.5 C5 0 3 -0.6 1.5 0.6 C0 1.8 0 3.5 2.5 5.5 L5 7.5 L7.5 5.5 C10 3.5 10 1.8 8.5 0.6 C7 -0.6 5 0 5 2.5Z"
          fill="#C4654A"
        />
      </G>
      <G x={205} y={200} opacity={0.25}>
        <Path
          d="M3 1.5 C3 0 1.5 -0.4 0.8 0.4 C0 1 0 2 1.5 3.2 L3 4.5 L4.5 3.2 C6 2 6 1 5.2 0.4 C4.5 -0.4 3 0 3 1.5Z"
          fill="#D4A252"
        />
      </G>

      <Rect y="235" width="380" height="45" fill="url(#bottomFade)" />
      <Rect y="274" width="380" height="6" fill="#FFFFFF" />
    </Svg>
  ),
);

export type { DottieTheme };
