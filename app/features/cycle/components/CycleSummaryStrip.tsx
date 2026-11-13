import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Surface } from '../../../components/ui/WidgetPrimitives';
import { useWidgetTheme } from '../../../theme/widgetTheme';
import { lateLabel, type CycleOverview } from '../models/cycleOverview';
import { phaseLabels } from '../models/phaseLabels';
import { CycleStatus } from './CycleStatus';

export function CycleSummaryStrip({ model, onOpen }: { model: CycleOverview; onOpen: () => void }) {
  const t = useWidgetTheme();
  if (model.state !== 'ready' || model.currentDay === null || model.cycleLength === null)
    return (
      <Pressable accessibilityRole="button" onPress={onOpen} accessibilityHint="Opens your cycle details">
        <CycleStatus variant="compact" model={model} />
      </Pressable>
    );
  const tone = t.phase[model.phase];
  const position = (100 * (Math.min(model.currentDay, model.cycleLength) - 0.5)) / model.cycleLength;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onOpen}
      accessibilityLabel={`Cycle details. ${phaseLabels[model.phase]}, day ${model.currentDay} of ${model.cycleLength}. ${model.source} phase.`}
    >
      <Surface style={{ backgroundColor: t.illustrated ? tone.surface : t.colors.surface, gap: 7 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <AppText role="caption" style={{ color: tone.text, fontFamily: t.type.semibold, letterSpacing: 1 }}>
            YOUR CYCLE
          </AppText>
          <Ionicons name="arrow-forward" size={18} color={tone.text} />
        </View>
        <AppText role="heading" style={{ fontFamily: t.type.display, fontSize: 28, lineHeight: 33 }}>
          {phaseLabels[model.phase]}
        </AppText>
        <AppText style={{ color: t.colors.secondary, fontSize: 13 }}>
          Day {model.currentDay} of {model.cycleLength} ·{' '}
          {model.source === 'observed' ? 'Logged signals' : 'Estimated phase'}
          {model.daysLate !== null ? ` · ${lateLabel(model.daysLate)}` : ''}
        </AppText>
        <View aria-hidden style={{ marginTop: 9, height: 10, flexDirection: 'row', alignItems: 'center' }}>
          {model.ranges.map((range) => (
            <View
              key={range.phase}
              style={{
                height: 7,
                borderWidth: 1,
                borderColor: t.illustrated ? tone.surface : t.colors.surface,
                borderRadius: 5,
                flexGrow: range.endDay - range.startDay + 1,
                flexBasis: 0,
                backgroundColor: t.phase[range.phase].chart,
              }}
            />
          ))}
          <View
            style={{
              position: 'absolute',
              left: `${position}%`,
              width: 12,
              height: 12,
              marginLeft: -6,
              borderRadius: 6,
              backgroundColor: t.colors.text,
              borderWidth: 2,
              borderColor: t.colors.surface,
            }}
          />
        </View>
        {model.stale && (
          <AppText role="caption">Last synced {model.syncedLabel ?? 'previously'} · needs a sync</AppText>
        )}
        {!model.markerMatchesPhase && (
          <AppText role="caption">Your logged phase differs from the estimated timeline.</AppText>
        )}
      </Surface>
    </Pressable>
  );
}
