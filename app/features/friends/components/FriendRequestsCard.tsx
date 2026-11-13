import { ScrollView, View } from 'react-native';
import { TextAction } from '../../../components/ui/ScreenControls';
import { ActionButton, AppText, Surface } from '../../../components/ui/WidgetPrimitives';
import { useWidgetTheme } from '../../../theme/widgetTheme';

export function FriendRequestsCard({
  requests,
  names,
  busy,
  status,
  onRetry,
  onProfile,
  onRespond,
}: {
  requests: ReadonlyArray<{ id: string; from_user_id: string; created_at: string }>;
  names: Record<string, { alias?: string | null }>;
  busy: boolean;
  status: 'loading' | 'ready' | 'error';
  onRetry: () => void;
  onProfile: (id: string, alias: string) => void;
  onRespond: (requestId: string, accept: boolean) => void;
}) {
  const t = useWidgetTheme();
  return (
    <Surface style={{ gap: 8 }}>
      <AppText role="heading" accessibilityRole="header">
        Friend requests
      </AppText>
      {status === 'error' && (
        <>
          <AppText>Couldn’t refresh friend requests.</AppText>
          <ActionButton outline label="Try again" onPress={onRetry} />
        </>
      )}
      {requests.length ? (
        <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={{ maxHeight: 240 }}>
          {requests.map((request) => {
            const alias = names[request.from_user_id]?.alias?.replace(/^@/, '');
            const label = alias ? '@' + alias : 'Circle member';
            return (
              <View
                key={request.id}
                style={{ gap: 4, paddingVertical: 8, borderBottomWidth: 1, borderColor: t.colors.border }}
              >
                <TextAction label={label} onPress={() => onProfile(request.from_user_id, alias || '')} />
                <AppText role="caption">{new Date(request.created_at).toLocaleDateString()}</AppText>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  <ActionButton
                    label="Accept"
                    accessibilityLabel={'Accept request from ' + label}
                    disabled={busy}
                    onPress={() => onRespond(request.id, true)}
                  />
                  <ActionButton
                    outline
                    label="Decline"
                    accessibilityLabel={'Decline request from ' + label}
                    disabled={busy}
                    onPress={() => onRespond(request.id, false)}
                  />
                </View>
              </View>
            );
          })}
        </ScrollView>
      ) : (
        status !== 'error' && (
          <AppText>{status === 'loading' ? 'Loading requests…' : 'No pending requests.'}</AppText>
        )
      )}
    </Surface>
  );
}
