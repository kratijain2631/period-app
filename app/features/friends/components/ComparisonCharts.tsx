import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import type { SyncScoreSummary } from '../utils/syncScore';

const DAY_MS = 86_400_000;

export const FlowGapSparkline = ({
  data,
  color,
  width = 100,
  height = 32,
}: {
  data: number[];
  color: string;
  width?: number;
  height?: number;
}) => {
  if (data.length < 2) {
    return null;
  }
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const padding = 4;
  const usableW = width - padding * 2;
  const usableH = height - padding * 2;
  const points = data.map((value, index) => ({
    x: padding + (index / (data.length - 1)) * usableW,
    y: padding + usableH - ((value - min) / range) * usableH,
  }));

  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${height} L ${points[0].x.toFixed(1)} ${height} Z`;
  const gradientId = `sync-gap-${color.replace('#', '')}`;

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none">
      <Defs>
        <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={color} stopOpacity={0.22} />
          <Stop offset="100%" stopColor={color} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Path d={areaPath} fill={`url(#${gradientId})`} />
      <Path d={linePath} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r={2.8} fill={color} />
    </Svg>
  );
};

export const timelineSegments = (row: SyncScoreSummary['cycleTrend'][number]) => {
  const selfStart = new Date(row.selfStart).getTime();
  const selfEnd = new Date(row.selfEnd).getTime();
  const friendStart = new Date(row.friendStart).getTime();
  const friendEnd = new Date(row.friendEnd).getTime();

  if ([selfStart, selfEnd, friendStart, friendEnd].some((value) => Number.isNaN(value))) {
    return null;
  }

  const spanStart = Math.min(selfStart, friendStart);
  const spanEnd = Math.max(selfEnd, friendEnd);
  const spanDays = Math.max(1, Math.round((spanEnd - spanStart) / DAY_MS) + 1);

  const toSegment = (startValue: number, endValue: number) => {
    const safeStart = Math.min(startValue, endValue);
    const safeEnd = Math.max(startValue, endValue);
    const offsetDays = Math.max(0, Math.round((safeStart - spanStart) / DAY_MS));
    const durationDays = Math.max(1, Math.round((safeEnd - safeStart) / DAY_MS) + 1);
    return {
      left: (offsetDays / spanDays) * 100,
      width: (durationDays / spanDays) * 100,
    };
  };

  const overlapStart = Math.max(selfStart, friendStart);
  const overlapEnd = Math.min(selfEnd, friendEnd);
  const overlap =
    overlapEnd >= overlapStart ? toSegment(overlapStart, overlapEnd) : null;

  return {
    self: toSegment(selfStart, selfEnd),
    friend: toSegment(friendStart, friendEnd),
    overlap,
  };
};
