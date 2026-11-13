import { Switch, View } from 'react-native';
import { AppText, Surface } from '../../../components/ui/WidgetPrimitives';
import type { AutoPostSettings } from '../../../services/healthkit/autoPostSettings';

export function PostSettingsRows({ value, onChange, disabled = false }: {
  value: AutoPostSettings;
  onChange: (next: AutoPostSettings) => void;
  disabled?: boolean;
}) {
  const rows = [
    ['postPeriodDays', 'Post period updates', 'Share period days with your circle.'],
    ['postOnlyPeriodStart', 'First day only', 'Share just the start of each period.'],
    ['postPhaseTransitions', 'Post phase transitions', 'Share when your cycle phase changes.'],
  ] as const;
  return (
    <Surface style={{ gap: 10 }}>
      <AppText role="heading" accessibilityRole="header">Post settings</AppText>
      {rows.map(([key, label, description]) => (
        <View key={key} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 }}>
          <View style={{ flex: 1 }}>
            <AppText>{label}</AppText>
            <AppText role="caption">{description}</AppText>
          </View>
          <Switch accessibilityLabel={label} value={value[key]}
            disabled={disabled || (key === 'postOnlyPeriodStart' && !value.postPeriodDays)}
            onValueChange={next => onChange({
              ...value, [key]: next,
              ...(key === 'postPeriodDays' && !next ? { postOnlyPeriodStart: false } : {}),
            })}
          />
        </View>
      ))}
    </Surface>
  );
}
