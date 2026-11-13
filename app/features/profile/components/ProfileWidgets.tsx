import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GardenArt } from '../../../components/brand/GardenArt';
import { AppText, Surface } from '../../../components/ui/WidgetPrimitives';
import { useWidgetTheme } from '../../../theme/widgetTheme';

export type ProfileIdentityModel = { name: string; alias: string; bio: string };
export function ProfileIdentity({
  profile,
  onEdit,
  onOpen,
}: {
  profile: ProfileIdentityModel;
  onEdit?: () => void;
  onOpen?: () => void;
}) {
  const t = useWidgetTheme();
  const identity = (
    <View style={{ width: t.illustrated ? '66%' : '100%', gap: 2 }}>
      <AppText role="heading" style={{ fontFamily: t.type.display, fontSize: 25, lineHeight: 31 }}>
        {profile.name}
      </AppText>
      <AppText role="caption" style={{ color: t.colors.secondary }}>
        @{profile.alias}
      </AppText>
    </View>
  );
  return (
    <Surface style={{ padding: 0, overflow: 'hidden' }}>
      <View
        style={{ padding: 17, minHeight: 112, justifyContent: 'center', backgroundColor: t.colors.profileCover }}
      >
        {t.illustrated && <GardenArt />}
        {onOpen ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`View ${profile.name}'s profile`}
            onPress={onOpen}
          >
            {identity}
          </Pressable>
        ) : (
          identity
        )}
      </View>
      <View
        style={{
          paddingLeft: 16,
          paddingRight: 6,
          paddingVertical: 5,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <AppText style={{ flex: 1, fontSize: 13, color: t.colors.secondary }}>
          {profile.bio || (onEdit ? 'Add a bio' : '')}
        </AppText>
        {onEdit && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit profile"
            onPress={onEdit}
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="pencil-outline" size={17} color={t.colors.accent} />
          </Pressable>
        )}
      </View>
    </Surface>
  );
}

export function CycleMetrics({ month, metrics }: { month: string; metrics: { label: string; value: string }[] }) {
  const t = useWidgetTheme();
  return (
    <View style={{ gap: 8 }}>
      <AppText role="heading" accessibilityRole="header">
        {month} recap
      </AppText>
      <Surface style={{ flexDirection: 'row', paddingHorizontal: 4, paddingVertical: 16 }}>
        {metrics.map((m, i) => (
          <View
            key={m.label}
            style={{
              flex: 1,
              alignItems: 'center',
              gap: 3,
              borderLeftWidth: i ? 1 : 0,
              borderColor: t.colors.border,
              paddingHorizontal: 3,
            }}
          >
            <AppText role="heading" style={{ fontFamily: t.type.display, fontSize: 23, lineHeight: 30 }}>
              {m.value}
            </AppText>
            <AppText role="caption" style={{ color: t.colors.secondary, textAlign: 'center' }}>
              {m.label}
            </AppText>
          </View>
        ))}
      </Surface>
    </View>
  );
}
