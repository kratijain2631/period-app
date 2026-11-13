import { View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';
import { DottieMascot } from './DottieMascot';
import { useWidgetTheme } from '../../theme/widgetTheme';

// A decorative backdrop for the existing mascot family. The score and labels live in the widget.
export function GardenArt({ pair = false }: { pair?: boolean }) {
  const t = useWidgetTheme();
  return (
    <View
      aria-hidden
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ position: 'absolute', right: 0, bottom: 0, width: '100%', height: '100%', overflow: 'hidden' }}
    >
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 360 160"
        preserveAspectRatio={pair ? 'xMaxYMax slice' : 'xMaxYMax meet'}
        aria-hidden
      >
        <Circle cx="307" cy="36" r="16" fill="#F3BE77" />
        <Circle cx="307" cy="36" r="21" stroke="#F3BE77" strokeDasharray="2 5" fill="none" opacity={0.65} />
        <Path
          d="M221 33q-1-6 5-7 2-9 10-5 5-8 13-1 7 0 7 7h-2q7 0 8 6z M324 69q1-6 7-6 3-8 10-4 4-5 10-1 7 0 8 11z"
          fill="#FFFAEC"
        />
        <Path
          d="M86 160q58-16 98-48 38-29 70-21 37 8 61-13 22-18 53-20v102Z"
          fill={pair ? '#D6DDC1' : '#F2CDB6'}
        />
        <Path d="M95 160q55-3 102-29 42-26 84-17 36 9 82-16v62Z" fill={pair ? '#AFBE9E' : '#E1AB95'} />
        <Path d="M166 160q43-16 81-12 71 9 117-22v34Z" fill={pair ? '#91A787' : '#CA8C79'} />
        {[
          { x: 209, y: 135 },
          { x: 333, y: 118 },
          { x: 346, y: 141 },
        ].map(({ x, y }) => (
          <G key={x} x={x} y={y}>
            <Path d="M0 10q1-6-1-10m1 8q3-6 5-5" fill="none" stroke="#71856B" strokeWidth={1.5} />
            <Ellipse rx="4" ry="1.6" fill="#FFFAE9" />
            <Ellipse rx="1.6" ry="4" fill="#FFFAE9" />
            <Circle r="1.2" fill="#D79E48" />
          </G>
        ))}
      </Svg>
      {pair && (
        <View style={{ position: 'absolute', right: 53, bottom: 10, transform: [{ rotate: '-8deg' }] }}>
          <DottieMascot size={76} color={t.phase.follicular.chart} mood="happy" />
        </View>
      )}
      <View
        style={{
          position: 'absolute',
          right: pair ? 11 : 12,
          bottom: pair ? 13 : 5,
          transform: [{ rotate: pair ? '8deg' : '-5deg' }],
        }}
      >
        <DottieMascot size={pair ? 64 : 87} color={t.phase.menstruation.chart} mood={pair ? 'waving' : 'happy'} />
      </View>
    </View>
  );
}
