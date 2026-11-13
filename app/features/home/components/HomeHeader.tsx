import { Platform, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '../../../components/ui/WidgetPrimitives';
import { DottieMascot } from '../../../components/brand/DottieMascot';
import { APP_NAME, APP_TAGLINE, TAGLINE_LINES } from '../../../config/branding';
import { useWidgetTheme } from '../../../theme/widgetTheme';
import NotificationsBell from '../../notifications/components/NotificationsBell';

export const HomeHeader = ({
  unreadCount,
  onOpenCircle,
  onOpenNotifications,
  name,
}: {
  unreadCount: number;
  onOpenCircle: () => void;
  onOpenNotifications: () => void;
  name: string;
}) => {
  const t = useWidgetTheme();
  return (
    <View style={{ gap: 14 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <View style={{ flex: 1, minWidth: 160 }}>
          <AppText
            style={{
              fontFamily: t.type.display,
              fontSize: 34,
              lineHeight: 43,
              letterSpacing: -1,
              color: t.colors.accent,
            }}
          >
            {APP_NAME.toLowerCase()}
          </AppText>
          <AppText
            accessibilityLabel={APP_TAGLINE}
            style={{ color: t.colors.secondary, fontSize: 14, lineHeight: 19 }}
          >
            {TAGLINE_LINES.map(([lead, phrase], i) => (
              <Text key={lead}>
                {i > 0 ? '\n' : ''}
                {lead}{' '}
                <Text
                  style={{
                    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia, serif' }),
                    fontStyle: 'italic',
                    fontSize: 15,
                  }}
                >
                  {phrase}
                </Text>
              </Text>
            ))}
          </AppText>
        </View>
        <View style={{ flexDirection: 'row', gap: 9 }}>
          <Pressable
            onPress={onOpenCircle}
            accessibilityRole="button"
            accessibilityLabel="Open your circle"
            style={{
              width: 46,
              height: 46,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: t.colors.border,
              borderRadius: t.radius.control,
            }}
          >
            <Ionicons name="people" size={23} color={t.colors.text} />
          </Pressable>
          <NotificationsBell count={unreadCount} onPress={onOpenNotifications} appearance="widget" />
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {t.illustrated ? (
          <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <DottieMascot size={82} mood="waving" color={t.colors.accent} />
          </View>
        ) : null}
        <View style={{ flex: 1, padding: 13, borderRadius: 18, borderWidth: 1, borderColor: t.colors.border }}>
          <AppText style={{ fontFamily: t.type.heading }}>Good to see you, {name}.</AppText>
        </View>
      </View>
    </View>
  );
};
