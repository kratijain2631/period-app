import type { ComponentProps } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ActionButton, AppText } from './WidgetPrimitives';
import { useWidgetTheme } from '../../theme/widgetTheme';

type IconName = ComponentProps<typeof Ionicons>['name'];

export function IconButton({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const t = useWidgetTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed ? t.colors.subtle : t.colors.surface,
        borderWidth: 1,
        borderColor: t.colors.border,
        borderRadius: t.radius.control,
      })}
    >
      <Ionicons name={icon} size={20} color={t.colors.text} />
    </Pressable>
  );
}

export function PageHeading({
  title,
  compact = false,
  icon,
  action,
  onPress,
}: {
  title: string;
  compact?: boolean;
  icon?: IconName;
  action: string;
  onPress: () => void;
}) {
  const t = useWidgetTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 8,
      }}
    >
      <AppText
        role="heading"
        accessibilityRole="header"
        style={{
          fontFamily: t.type.display,
          fontSize: compact ? 22 : 36,
          lineHeight: compact ? 29 : 46,
          letterSpacing: -1.4,
        }}
      >
        {title}
      </AppText>
      {icon ? (
        <IconButton icon={icon} label={action} onPress={onPress} />
      ) : (
        <ActionButton label={action} onPress={onPress} />
      )}
    </View>
  );
}

export function TextAction({ label, onPress }: { label: string; onPress: () => void }) {
  const t = useWidgetTheme();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={{ minHeight: 44, justifyContent: 'center' }}>
      <AppText style={{ fontFamily: t.type.semibold, color: t.colors.accent, fontSize: 13 }}>{label}</AppText>
    </Pressable>
  );
}
