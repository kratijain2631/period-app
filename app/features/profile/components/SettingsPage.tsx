import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Surface } from '../../../components/ui/WidgetPrimitives';
import { useWidgetTheme } from '../../../theme/widgetTheme';

export function ContactValue({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: () => void;
}) {
  const t = useWidgetTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={'Change ' + label.toLowerCase()}
      onPress={onChange}
      style={{ minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 12 }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <AppText role="caption" style={{ color: t.colors.secondary }}>
          {label}
        </AppText>
        <AppText>{value || 'Not added'}</AppText>
      </View>
      <AppText style={{ fontFamily: t.type.semibold, fontSize: 13, color: t.colors.accent }}>Change</AppText>
    </Pressable>
  );
}

export function SettingsPage({
  contacts,
  visibility,
  onPosting,
  onSignOut,
  onDelete,
  busy,
  message,
}: {
  contacts: ReactNode;
  visibility: ReactNode;
  onPosting: () => void;
  onSignOut: () => void;
  onDelete: () => void;
  busy?: boolean;
  message?: string | null;
}) {
  const t = useWidgetTheme();
  return (
    <View style={{ gap: 16 }}>
      <AppText accessibilityRole="header" role="heading" style={{ fontSize: 34, lineHeight: 43 }}>
        Settings
      </AppText>
      <Surface style={{ gap: 8 }}>
        <AppText accessibilityRole="header" role="heading">
          Personal info
        </AppText>
        {contacts}
      </Surface>
      <Surface style={{ gap: 8 }}>
        <AppText accessibilityRole="header" role="heading">
          Privacy and permissions
        </AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Post settings"
          onPress={onPosting}
          style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <AppText>Post settings</AppText>
          <Ionicons name="chevron-forward" size={16} color={t.colors.secondary} />
        </Pressable>
        <View style={{ borderTopWidth: 1, borderColor: t.colors.border }}>{visibility}</View>
      </Surface>
      <Surface style={{ paddingVertical: 4 }}>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={onSignOut}
          style={{ minHeight: 48, justifyContent: 'center' }}
        >
          <AppText>Sign out</AppText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={onDelete}
          style={{ minHeight: 48, justifyContent: 'center', borderTopWidth: 1, borderColor: t.colors.border }}
        >
          <AppText style={{ color: t.colors.error }}>Delete account</AppText>
        </Pressable>
        {message && <AppText accessibilityLiveRegion="polite">{message}</AppText>}
      </Surface>
    </View>
  );
}
