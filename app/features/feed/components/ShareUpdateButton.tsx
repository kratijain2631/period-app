import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native';
import { AppText } from '../../../components/ui/WidgetPrimitives';
import { useWidgetTheme } from '../../../theme/widgetTheme';

export function ShareUpdateButton({ draft, onPress }: { draft: boolean; onPress: () => void }) {
  const t = useWidgetTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={draft ? 'Continue your draft' : 'Share an update'}
      onPress={onPress}
      style={{
        minHeight: 52,
        borderWidth: 1,
        borderColor: t.colors.border,
        borderRadius: 18,
        backgroundColor: t.colors.surface,
        paddingHorizontal: 15,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <Ionicons name="create-outline" size={21} color={t.colors.accent} />
      <AppText style={{ flex: 1, color: t.colors.secondary }}>
        {draft ? 'Continue your draft' : 'Share an update…'}
      </AppText>
      <Ionicons name="chevron-forward" size={15} color={t.colors.secondary} />
    </Pressable>
  );
}
