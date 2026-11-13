import { Pressable, View } from 'react-native';
import { AppText, Surface } from '../../../components/ui/WidgetPrimitives';
import { SeedArt } from '../../../components/brand/WidgetArt';
import type { CycleOverview } from '../models/cycleOverview';
import { phaseLabels } from '../models/phaseLabels';
import { useWidgetTheme } from '../../../theme/widgetTheme';
export const UpcomingTransition = ({
  transition,
  onOpenDetails,
}: {
  transition: NonNullable<CycleOverview['upcoming']>;
  onOpenDetails?: () => void;
}) => {
  const t = useWidgetTheme();
  const card = (
    <Surface tone="upcoming">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {t.illustrated ? <SeedArt /> : null}
        <View style={{ flex: 1, gap: 3 }}>
          <AppText role="caption" style={{ color: t.colors.accent }}>
            COMING UP
          </AppText>
          <AppText role="heading" style={{ fontSize: 19 }}>
            {phaseLabels[transition.phase]}{' '}
            {transition.daysAway === 0
              ? 'may start today'
              : `in ${transition.daysAway} ${transition.daysAway === 1 ? 'day' : 'days'}`}
          </AppText>
          <AppText role="caption" style={{ color: t.colors.secondary }}>
            Estimated from your cycle history
          </AppText>
        </View>
      </View>
    </Surface>
  );
  return onOpenDetails ? (
    <Pressable
      accessibilityRole="button"
      accessibilityHint="Opens your cycle wheel on You"
      onPress={onOpenDetails}
    >
      {card}
    </Pressable>
  ) : (
    card
  );
};
