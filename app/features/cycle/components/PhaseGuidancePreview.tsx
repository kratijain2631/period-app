import { Pressable, View, useWindowDimensions } from 'react-native';
import { AppText, Surface } from '../../../components/ui/WidgetPrimitives';
import { MountainArt } from '../../../components/brand/WidgetArt';
import { useWidgetTheme } from '../../../theme/widgetTheme';

export const PhaseGuidancePreview = ({
  title,
  body,
  onOpenGuide,
}: {
  title: string;
  body: string | null;
  onOpenGuide: () => void;
}) => {
  const t = useWidgetTheme();
  const { fontScale } = useWindowDimensions();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. Explore your phase guide`}
      onPress={onOpenGuide}
    >
      <Surface tone="guidance" style={{ overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ flex: 1, gap: 6 }}>
            <AppText role="caption" style={{ color: t.colors.guidanceText, fontFamily: t.type.heading }}>
              A LITTLE SPACE FOR YOU
            </AppText>
            <AppText role="heading" accessibilityRole="header">
              {title}
            </AppText>
            {body ? <AppText style={{ color: t.colors.secondary }}>{body}</AppText> : null}
          </View>
          {t.illustrated && fontScale <= 1.2 ? (
            <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <MountainArt />
            </View>
          ) : null}
        </View>
        <View style={{ alignSelf: 'flex-start', marginTop: 14 }}>
          <AppText style={{ color: t.colors.guidanceText, fontFamily: t.type.semibold, fontSize: 13 }}>
            Explore your phase guide →
          </AppText>
        </View>
      </Surface>
    </Pressable>
  );
};
