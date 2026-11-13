import Svg, { Circle, Ellipse, Path, G } from 'react-native-svg';

/** Decorative assets only. Widgets remain meaningful when these are omitted. */
export const CloudArt = ({ size = 74 }: { size?: number }) => (
  <Svg width={size} height={size * 0.65} viewBox="0 0 90 58" aria-hidden>
    <Path d="M13 51a12 12 0 0 1-1-24 15 15 0 0 1 22-15A20 20 0 0 1 73 22a15 15 0 0 1 0 29Z" fill="#DCE6ED" />
  </Svg>
);
export const MountainArt = () => (
  <Svg width={110} height={118} viewBox="0 0 140 150" aria-hidden>
    <Path d="M12 57a8 8 0 0 1 0-16 16 16 0 0 1 31-3 10 10 0 0 1 19 6 7 7 0 0 1 0 13Z" fill="#FFFAF5" />
    <Path d="m4 150 65-103 66 103" fill="#B18AA2" />
    <Path d="m49 78 20-31 21 33-13-5-8-8-10 11Z" fill="#F1E7DD" />
    <Path d="M69 49V9" stroke="#BF694D" strokeWidth={3} strokeLinecap="round" />
    <Path d="m71 10 27 9-27 10Z" fill="#DC9275" />
    <Ellipse cx="57" cy="105" rx="3" ry="4" fill="#322E2A" /><Ellipse cx="77" cy="105" rx="3" ry="4" fill="#322E2A" />
    <Path d="M59 116q9 9 17-1" fill="none" stroke="#322E2A" strokeWidth={3} strokeLinecap="round" />
    <Path d="m29 146 12-16 14 20m40 0 10-16 14 16" fill="#A67B95" />
  </Svg>
);
export const SeedArt = () => (
  <Svg width={58} height={62} viewBox="0 0 70 74" aria-hidden>
    <Circle cx="35" cy="35" r="32" fill="#FFF8EA" stroke="#ECDBBA" />
    <Path d="M15 53q20-12 40 0l7 8-13 6-14-3-12 3-13-8Z" fill="#AA773D" />
    <Path d="M19 40c0-14 9-27 16-27s17 17 17 29c0 18-33 19-33-2Z" fill="#F2C65E" />
    <G fill="#DEA43A"><Ellipse cx="33" cy="23" rx="5" ry="6" /><Ellipse cx="25" cy="38" rx="4" ry="5" /><Ellipse cx="44" cy="37" rx="5" ry="6" /><Circle cx="34" cy="49" r="5" /></G>
  </Svg>
);
