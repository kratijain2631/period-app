import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { ActionButton, AppText, Surface } from '../../../components/ui/WidgetPrimitives';
import { useWidgetTheme } from '../../../theme/widgetTheme';

type Request = { id: string; memberId: string; alias: string; name?: string | null; createdAt?: string };
type Direction = 'Received' | 'Sent';

export function FriendRequestsCard({
  incoming, outgoing, busy, status, onRetry, onProfile, onRespond, onCancel,
}: {
  incoming: Request[];
  outgoing: Request[];
  busy: boolean;
  status: 'loading' | 'ready' | 'error';
  onRetry: () => void;
  onProfile: (id: string, alias: string) => void;
  onRespond: (id: string, accept: boolean) => void;
  onCancel: (id: string) => void;
}) {
  const t = useWidgetTheme();
  const { width, fontScale } = useWindowDimensions();
  const [choice, choose] = useState<Direction | null>(null);
  const tab = choice ?? (incoming.length || !outgoing.length ? 'Received' : 'Sent');
  const sent = tab === 'Sent';
  const requests = sent ? outgoing : incoming;
  const stackActions = width < 355 || fontScale > 1.2;
  const tone = sent ? t.phase.luteal : t.phase.menstruation;

  return (
    <Surface style={{ padding: 14, gap: 10 }}>
      <AppText role="heading" accessibilityRole="header">Friend requests</AppText>
      <View accessibilityRole="tablist" accessibilityLabel="Friend request direction"
        style={{ flexDirection: 'row', gap: 3, padding: 3, backgroundColor: t.colors.subtle, borderRadius: 15 }}>
        {(['Received', 'Sent'] as const).map(direction => {
          const selected = tab === direction;
          const count = direction === 'Sent' ? outgoing.length : incoming.length;
          return (
            <Pressable key={direction} accessibilityRole="tab" accessibilityLabel={direction + ', ' + count}
              accessibilityState={{ selected }} onPress={() => choose(direction)}
              style={{ flex: 1, minHeight: 44, borderRadius: 12, backgroundColor: selected ? t.colors.surface : 'transparent',
                alignItems: 'center', alignContent: 'center', justifyContent: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              <AppText style={{ fontFamily: t.type.heading, fontSize: 14, color: selected ? t.colors.text : t.colors.secondary }}>{direction}</AppText>
              <AppText role="caption" style={{ color: selected ? t.colors.accent : t.colors.secondary }}>{count}</AppText>
            </Pressable>
          );
        })}
      </View>
      {status === 'error' && <>
        <AppText>Couldn’t refresh friend requests.</AppText>
        <ActionButton outline label="Try again" onPress={onRetry} />
      </>}
      <ScrollView key={tab} nestedScrollEnabled keyboardShouldPersistTaps="handled" style={{ maxHeight: 276 }}>
        {requests.map((request, index) => {
          const alias = request.alias.replace(/^@/, '');
          const name = request.name?.trim() || (alias ? '@' + alias : 'Circle member');
          const who = alias ? '@' + alias : name;
          const date = request.createdAt && new Date(request.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
          const subtitle = sent ? 'Pending' : (request.name && alias ? who : date);
          return (
            <View key={request.id} style={{ paddingVertical: 7, gap: 4, flexDirection: stackActions ? 'column' : 'row',
              alignItems: stackActions ? 'stretch' : 'center', borderBottomWidth: index + 1 < requests.length ? 1 : 0, borderColor: t.colors.border }}>
              <Pressable accessibilityRole="button" accessibilityLabel={'View profile of ' + who}
                onPress={() => onProfile(request.memberId, alias)}
                style={{ flex: stackActions ? undefined : 1, minWidth: 0, minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: tone.surface }}>
                  <AppText accessible={false} style={{ fontFamily: t.type.display, color: tone.text }}>{(request.name?.trim() || alias || '•').slice(0,1).toUpperCase()}</AppText>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <AppText numberOfLines={2} style={{ fontFamily: t.type.heading, fontSize: 14, lineHeight: 18 }}>{name}</AppText>
                  {!!subtitle && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    {sent && <Ionicons name="time-outline" size={12} color={t.colors.secondary} />}
                    <AppText role="caption" numberOfLines={1} style={{ flexShrink: 1, color: t.colors.secondary }}>{subtitle}</AppText>
                  </View>}
                </View>
              </Pressable>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 3,
                marginLeft: stackActions ? 44 : 0, opacity: busy ? 0.5 : 1 }}>
                {!sent && <Pressable accessibilityRole="button" accessibilityLabel={'Accept request from ' + who}
                  disabled={busy} onPress={() => onRespond(request.id, true)} style={{ minHeight: 44, justifyContent: 'center' }}>
                  <View style={{ borderRadius: 12, paddingHorizontal: 12, paddingVertical: 5, backgroundColor: t.colors.accent }}>
                    <AppText style={{ color: t.colors.onAccent, fontFamily: t.type.semibold, fontSize: 13 }}>Accept</AppText>
                  </View>
                </Pressable>}
                <Pressable accessibilityRole="button" accessibilityLabel={(sent ? 'Cancel request to ' : 'Decline request from ') + who}
                  disabled={busy} onPress={() => sent ? onCancel(request.id) : onRespond(request.id, false)}
                  style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 6 }}>
                  <AppText style={{ color: t.colors.secondary, fontSize: 13, fontFamily: t.type.semibold }}>{sent ? 'Cancel request' : 'Decline'}</AppText>
                </Pressable>
              </View>
            </View>
          );
        })}
        {!requests.length && status !== 'error' && <AppText style={{ paddingVertical: 12, color: t.colors.secondary }}>
          {status === 'loading' ? 'Loading requests…' : sent ? 'No sent requests pending.' : 'No requests to respond to.'}
        </AppText>}
      </ScrollView>
    </Surface>
  );
}
