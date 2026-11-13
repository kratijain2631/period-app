import { useState } from 'react';
import { Pressable, TextInput, View, type TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '../../../components/ui/WidgetPrimitives';
import { useWidgetTheme } from '../../../theme/widgetTheme';

type FieldProps = TextInputProps & {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
};

export function ContactField({ label, icon, ...props }: FieldProps) {
  const t = useWidgetTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <AppText style={{ fontFamily: t.type.semibold }}>{label}</AppText>
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5,
        borderColor: focused ? t.colors.accent : t.colors.secondary, backgroundColor: t.colors.surface,
        borderRadius: t.radius.control, paddingHorizontal: 12,
      }}>
        {icon && <Ionicons name={icon} size={20} color={t.colors.secondary} />}
        <TextInput {...props} accessibilityLabel={label} placeholderTextColor={t.colors.secondary}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{ flex: 1, minWidth: 0, minHeight: 49, color: t.colors.text, fontFamily: t.type.body, fontSize: 16 }} />
      </View>
    </View>
  );
}

export function ContactCancel({ busy, onPress }: { busy: boolean; onPress: () => void }) {
  const t = useWidgetTheme();
  return (
    <Pressable accessibilityRole="button" disabled={busy} onPress={onPress}
      style={({ pressed }) => ({ alignSelf: 'center', minHeight: 44, justifyContent: 'center',
        paddingHorizontal: 16, borderRadius: 22, backgroundColor: pressed ? t.colors.border : t.colors.subtle })}>
      <AppText style={{ color: t.colors.secondary, fontFamily: t.type.semibold }}>Cancel</AppText>
    </Pressable>
  );
}
