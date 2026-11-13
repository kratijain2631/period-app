import { ScrollView, View } from 'react-native';
import { TextAction } from '../../../components/ui/ScreenControls';
import { ActionButton, AppText, Surface } from '../../../components/ui/WidgetPrimitives';
import { useWidgetTheme } from '../../../theme/widgetTheme';

type Request = { id: string; memberId: string; alias: string; createdAt?: string };
export function FriendRequestsCard({ incoming, outgoing, busy, status, onRetry, onProfile, onRespond, onCancel }: {
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
  return (
    <Surface style={{ gap: 8 }}>
      <AppText role="heading" accessibilityRole="header">Friend requests</AppText>
      {status === 'error' && <>
        <AppText>Couldn’t refresh friend requests.</AppText>
        <ActionButton outline label="Try again" onPress={onRetry} />
      </>}
      {(['Received', 'Sent'] as const).map(group => {
        const sent = group === 'Sent';
        const list = sent ? outgoing : incoming;
        if (!list.length) return null;
        return (
          <View key={group}>
            <AppText role="caption" accessibilityRole="header">{group}</AppText>
            <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={{ maxHeight: 232 }}>
              {list.map(request => {
                const label = request.alias ? '@' + request.alias.replace(/^@/, '') : 'Circle member';
                return (
                  <View key={request.id} style={{ paddingVertical: 6, gap: 4, borderBottomWidth: 1, borderColor: t.colors.border }}>
                    <TextAction label={label} onPress={() => onProfile(request.memberId, request.alias)} />
                    {request.createdAt && <AppText role="caption">{new Date(request.createdAt).toLocaleDateString()}</AppText>}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                      {sent ? <>
                        <AppText role="caption">Request pending</AppText>
                        <ActionButton outline label="Cancel request" accessibilityLabel={'Cancel request to ' + label} disabled={busy} onPress={() => onCancel(request.id)} />
                      </> : <>
                        <ActionButton label="Accept" accessibilityLabel={'Accept request from ' + label} disabled={busy} onPress={() => onRespond(request.id, true)} />
                        <ActionButton outline label="Decline" accessibilityLabel={'Decline request from ' + label} disabled={busy} onPress={() => onRespond(request.id, false)} />
                      </>}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        );
      })}
      {!incoming.length && !outgoing.length && status !== 'error' && (
        <AppText>{status === 'loading' ? 'Loading requests…' : 'No pending requests.'}</AppText>
      )}
    </Surface>
  );
}
