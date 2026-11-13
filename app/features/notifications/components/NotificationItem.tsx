import { Pressable, View } from 'react-native';
import { AppText, ActionButton } from '../../../components/ui/WidgetPrimitives';
import { useWidgetTheme } from '../../../theme/widgetTheme';
import type { InboxItem } from '../models/inbox';

export function NotificationItem({
  item,
  onProfile,
  onRespond,
  disabled,
}: {
  item: InboxItem;
  onProfile: (id: string) => void;
  onRespond: (id: string, accept: boolean) => void;
  disabled: boolean;
}) {
  const t = useWidgetTheme();
  const title = <AppText style={{ fontFamily: t.type.semibold }}>{item.title}</AppText>;
  return (
    <View style={{ borderBottomWidth: 1, borderColor: t.colors.border, paddingVertical: 12, gap: 5 }}>
      {item.actorId ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => onProfile(item.actorId!)}
          style={{ minHeight: 44, justifyContent: 'center' }}
        >
          {title}
        </Pressable>
      ) : (
        title
      )}
      <AppText role="caption">
        {new Date(item.timestamp).toLocaleString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        })}
      </AppText>
      {item.requestId && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 5 }}>
          <ActionButton
            label="Accept"
            accessibilityLabel={'Accept: ' + item.title}
            disabled={disabled}
            onPress={() => onRespond(item.requestId!, true)}
          />
          <ActionButton
            outline
            label="Decline"
            accessibilityLabel={'Decline: ' + item.title}
            disabled={disabled}
            onPress={() => onRespond(item.requestId!, false)}
          />
        </View>
      )}
    </View>
  );
}
