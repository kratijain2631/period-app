import { Pressable, View } from 'react-native';
import { AppText } from './WidgetPrimitives';
import { useWidgetTheme } from '../../theme/widgetTheme';

export function RankingTabs<T extends string>({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: readonly T[];
  selected: T;
  onSelect: (option: T) => void;
}) {
  const t = useWidgetTheme();
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={label}
      style={{
        flexDirection: 'row',
        gap: 4,
        backgroundColor: t.colors.subtle,
        borderRadius: t.radius.control,
        padding: 3,
      }}
    >
      {options.map((key) => (
        <Pressable
          key={key}
          accessibilityRole="tab"
          aria-selected={key === selected}
          onPress={() => onSelect(key)}
          style={{
            flex: 1,
            minHeight: 44,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: t.radius.control,
            backgroundColor: key === selected ? t.colors.surface : 'transparent',
          }}
        >
          <AppText
            role="caption"
            style={{ fontFamily: t.type.heading, color: key === selected ? t.colors.accent : t.colors.secondary }}
          >
            {key}
          </AppText>
        </Pressable>
      ))}
    </View>
  );
}
