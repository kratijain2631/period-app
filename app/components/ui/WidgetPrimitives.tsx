import type { ReactNode } from 'react';
import { Pressable, Text, View, type StyleProp, type ViewStyle, type TextProps } from 'react-native';
import { useWidgetTheme } from '../../theme/widgetTheme';

export const AppText = ({ role = 'body', style, ...props }: Omit<TextProps, 'role'> & { role?: 'body' | 'heading' | 'caption' }) => {
  const t = useWidgetTheme();
  return <Text {...props} style={[{ color: t.colors.text, fontFamily: role === 'heading' ? t.type.heading : t.type.body,
    fontSize: role === 'heading' ? 22 : role === 'caption' ? 12 : 15, lineHeight: role === 'heading' ? 29 : role === 'caption' ? 18 : 23 }, style]} />;
};
export const Surface = ({ children, style, tone = 'surface' }: { children: ReactNode; style?: StyleProp<ViewStyle>; tone?: 'surface' | 'guidance' | 'upcoming' }) => {
  const t = useWidgetTheme();
  return <View style={[{ backgroundColor: t.colors[tone], borderColor: t.colors.border, borderWidth: 1,
    borderRadius: t.radius.card, padding: 18 }, style]}>{children}</View>;
};
export const ActionButton = ({ label, accessibilityLabel, onPress, disabled, outline = false }: {
  label: string; accessibilityLabel?: string; onPress: () => void; disabled?: boolean; outline?: boolean;
}) => {
  const t = useWidgetTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => ({ minHeight: 44, paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center',
      borderRadius: 99, borderWidth: 1, borderColor: t.colors.accent, backgroundColor: outline ? 'transparent' : t.colors.accent,
      opacity: disabled ? 0.5 : pressed ? 0.75 : 1 })}>
    <AppText style={{ color: outline ? t.colors.accent : t.colors.onAccent, fontFamily: t.type.semibold, fontSize: 12 }}>{label}</AppText>
  </Pressable>;
};
