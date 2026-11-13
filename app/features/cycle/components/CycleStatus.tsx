import { useState } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg';
import type { CyclePhaseRange } from '../../../../packages/domain/cycles/models';
import { useWidgetTheme } from '../../../theme/widgetTheme';
import { AppText, Surface } from '../../../components/ui/WidgetPrimitives';
import { CloudArt } from '../../../components/brand/WidgetArt';
import type { CycleOverview } from '../models/cycleOverview';
import { phaseLabels } from '../models/phaseLabels';

const point = (angle: number, radius = 136) => {
  const radians = (angle - 90) * Math.PI / 180;
  return { x: 160 + radius * Math.cos(radians), y: 160 + radius * Math.sin(radians) };
};
export const CycleTimeline = ({ ranges, cycleLength, currentDay, size }: {
  ranges: CyclePhaseRange[]; cycleLength: number; currentDay: number; size: number;
}) => {
  const t = useWidgetTheme();
  const marker = point(((currentDay - 0.5) / cycleLength) * 360);
  return <Svg width={size} height={size} viewBox="0 0 320 320" accessible={false} aria-hidden>
    {ranges.map(range => {
      const sweep = (range.endDay - range.startDay + 1) / cycleLength * 360;
      const gap = Math.min(5.7, sweep * 0.25);
      const start = point((range.startDay - 1) / cycleLength * 360 + gap);
      const end = point(range.endDay / cycleLength * 360 - gap);
      return <Path key={range.phase} d={`M${start.x},${start.y} A136,136 0 ${sweep - gap * 2 > 180 ? 1 : 0} 1 ${end.x},${end.y}`}
        stroke={t.phase[range.phase].chart} strokeWidth={21} strokeLinecap="round" fill="none" />;
    })}
    {Array.from({ length: cycleLength }, (_, i) => i + 1).filter(d => d % 2 === 0 && d !== currentDay).map(day => {
      const p = point((day - 0.5) / cycleLength * 360);
      return <Circle key={day} cx={p.x} cy={p.y} r={2.5} fill={t.colors.surface} />;
    })}
    <Circle cx={marker.x} cy={marker.y} r={19} fill={t.colors.surface} stroke={t.colors.canvas} strokeWidth={4} />
    <Circle cx={marker.x} cy={marker.y} r={15} fill="none" stroke={t.colors.text} strokeWidth={1} />
    <SvgText x={marker.x} y={marker.y + 6} fontSize={17} fontWeight="700" textAnchor="middle" fill={t.colors.text}>{currentDay}</SvgText>
  </Svg>;
};

export const CycleStatus = ({ model, variant = 'hero' }: {
  model: CycleOverview; variant?: 'compact' | 'hero';
}) => {
  const t = useWidgetTheme();
  const { fontScale } = useWindowDimensions();
  const [width, setWidth] = useState(320);
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const reveal = hovered || pinned;
  const availableWidth = width / Math.max(1, fontScale);
  const showRing = variant === 'hero' && availableWidth >= 225;
  const smallRing = showRing && availableWidth < 290;
  const ready = model.state === 'ready';
  const supportingText = <AppText style={{ textAlign: 'center', color: t.colors.secondary, fontSize: 14, lineHeight: 21 }}>A little more in tune.{'\n'}Follow how you feel.</AppText>;
  const details = <View style={{ alignItems: 'center', gap: smallRing ? 4 : 6 }}>
    {t.illustrated && variant === 'hero' ? <CloudArt size={smallRing ? 44 : 62} /> : null}
    <AppText role="heading" style={{ color: t.phase[model.phase].text, fontFamily: t.type.display, fontSize: smallRing ? 23 : variant === 'hero' ? 29 : 22, lineHeight: smallRing ? 29 : 37, textAlign: 'center' }}>{phaseLabels[model.phase]}</AppText>
    <AppText style={{ fontFamily: t.type.heading, fontSize: smallRing ? 17 : 19, textAlign: 'center' }}>{model.stale && !smallRing ? 'Last synced: ' : ''}Day {model.currentDay} of {model.cycleLength}</AppText>
    <AppText role="caption" style={{ color: t.colors.secondary, textAlign: 'center' }}>{model.source === 'observed' ? 'From your logged signals' : 'Estimated phase'}{model.stale ? ' · needs a sync' : ''}</AppText>
    {!smallRing && supportingText}
  </View>;
  const legend = <View style={{alignSelf:'center', gap:4}}>
    {model.ranges.map(range => <View key={range.phase} style={{flexDirection:'row', alignItems:'center', gap:5}}>
      <View style={{width:7,height:7,borderRadius:4,backgroundColor:t.phase[range.phase].chart}}/>
      <AppText role="caption" style={{fontFamily:t.type.semibold}}>{phaseLabels[range.phase]}</AppText>
      <AppText role="caption" style={{color:t.colors.secondary}}>Days {range.startDay}–{range.endDay}</AppText>
    </View>)}
  </View>;
  return <Surface style={{ paddingHorizontal: 12 }}>
    <AppText role="heading" accessibilityRole="header" style={{ textAlign: 'center', marginBottom: 8 }}>Your cycle</AppText>
    {!ready ? <View style={{ padding: 22, gap: 12, alignItems: 'center' }}>
      {t.illustrated ? <CloudArt /> : null}
      <AppText role="heading">{model.state === 'loading' ? 'Getting in rhythm…' : model.state === 'error' ? 'Let’s reconnect' : 'Your rhythm starts here'}</AppText>
      <AppText style={{ textAlign: 'center', color: t.colors.secondary }}>{model.state === 'loading' ? 'Loading your latest cycle.' : model.state === 'error' ? 'Your cycle couldn’t load.' : 'Your cycle will appear when readable Apple Health data is available.'}</AppText>
    </View> : variant === 'compact' ? details : <>
      <View onLayout={e => setWidth(e.nativeEvent.layout.width)} style={{ width: '100%', maxWidth: 360, alignSelf: 'center' }}>
        {showRing ? <Pressable accessibilityRole="button" aria-expanded={reveal} accessibilityState={{expanded:reveal}}
          accessibilityLabel={reveal ? model.ranges.map(r=>phaseLabels[r.phase]+', days '+r.startDay+' to '+r.endDay).join('. ') : `Cycle day ${model.currentDay} of ${model.cycleLength}. ${phaseLabels[model.phase]}. ${model.source} phase. Show phase ranges`}
          onHoverIn={()=>setHovered(true)} onHoverOut={()=>setHovered(false)} onBlur={()=>{setPinned(false);setHovered(false);}}
          onPress={()=>{setPinned(!pinned);setHovered(false);}}>
          <CycleTimeline ranges={model.ranges} cycleLength={model.cycleLength!} currentDay={model.currentDay!} size={width}/>
          <View pointerEvents="none" style={{position:'absolute',top:0,bottom:0,left:'15%',right:'15%',justifyContent:'center'}}>{reveal ? legend : details}</View>
        </Pressable> : <>{details}{legend}</>}
      </View>
      {smallRing && supportingText}
      {showRing && <AppText role="caption" style={{textAlign:'center',color:t.colors.secondary,marginVertical:5}}>{reveal ? 'Phase ranges' : 'Tap or hover for phase ranges'}</AppText>}
    </>}
    {!model.markerMatchesPhase ? <AppText role="caption" style={{ textAlign: 'center', marginBottom: 8 }}>Your logged phase differs from the estimated timeline.</AppText> : null}
    {model.stale ? <AppText role="caption" style={{ textAlign: 'center', color: t.colors.secondary, marginBottom: 8 }}>Showing your last sync{model.syncedLabel ? ` from ${model.syncedLabel}` : ''}.</AppText> : null}
    {ready && !model.stale && model.syncedLabel ? <AppText role="caption" style={{ textAlign: 'center', color: t.colors.secondary }}>As of {model.syncedLabel}</AppText> : null}
  </Surface>;
};
