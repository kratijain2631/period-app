import { Switch, View } from 'react-native';
import { AppText } from '../../../components/ui/WidgetPrimitives';

export function RankingVisibilityRow({
  enabled,
  busy,
  onChange,
}: {
  enabled: boolean;
  busy: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <View style={{ gap: 3, paddingVertical: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <AppText style={{ flex: 1 }}>Show me in Community rankings</AppText>
        <Switch
          accessibilityLabel="Show me in Community rankings"
          value={enabled}
          disabled={busy}
          onValueChange={onChange}
        />
      </View>
      <AppText role="caption">Show your alias and counts on Largest Circle and Loudest Voices.</AppText>
    </View>
  );
}
