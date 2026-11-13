import { useRef } from 'react';
import { Image, Pressable, View } from 'react-native';
import { AppText, Surface } from '../../../components/ui/WidgetPrimitives';
import { useWidgetTheme } from '../../../theme/widgetTheme';
import type { ActivityItemModel } from '../models/activity';
import { getDoubleTapResult } from '../../home/utils/reactionDoubleTap';
import { ReactionBar, BoopAction } from './ReactionBar';

export const ActivityItem = ({
  model,
  pending,
  offline,
  onReact,
  onChooseReaction,
  onDoubleTap,
  onBoop,
  onDelete,
  onOpenProfile,
  comments,
}: {
  comments?: import('react').ReactNode;
  model: ActivityItemModel;
  pending: boolean;
  offline: boolean;
  onReact: (emoji: string) => void;
  onChooseReaction: () => void;
  onDoubleTap: () => void;
  onBoop: () => void;
  onDelete: () => void;
  onOpenProfile?: () => void;
}) => {
  const t = useWidgetTheme();
  const lastTap = useRef<{ postId: string | null; timestamp: number | null }>({ postId: null, timestamp: null });
  const date = new Date(model.createdAt);
  const identity = (
    <>
      <View
        style={{
          width: 42,
          height: 42,
          borderRadius: 21,
          backgroundColor: t.phase[model.phase].surface,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {model.avatarUrl ? (
          <Image source={{ uri: model.avatarUrl }} style={{ width: 42, height: 42 }} />
        ) : (
          <AppText role="heading" style={{ color: t.phase[model.phase].text }}>
            {model.actorName.slice(0, 1).toUpperCase()}
          </AppText>
        )}
      </View>
      <View style={{ flex: 1 }}>
        <AppText style={{ fontFamily: t.type.heading }}>{model.actorName}</AppText>
        <AppText role="caption" style={{ color: t.colors.secondary }}>
          {Number.isFinite(date.getTime())
            ? date.toLocaleDateString([], { month: 'short', day: 'numeric' })
            : 'Recent update'}
        </AppText>
      </View>
    </>
  );
  return (
    <Surface style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {onOpenProfile ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`View ${model.actorName}'s profile`}
            onPress={onOpenProfile}
            style={{ flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10 }}
          >
            {identity}
          </Pressable>
        ) : (
          identity
        )}
        {model.isSelf && model.target.type === 'post' ? (
          <Pressable
            onPress={onDelete}
            disabled={pending || offline}
            accessibilityRole="button"
            accessibilityLabel="Delete your post"
            style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
          >
            <AppText style={{ color: t.colors.secondary }}>···</AppText>
          </Pressable>
        ) : null}
      </View>
      <Pressable
        onLongPress={onChooseReaction}
        onPress={() => {
          const result = getDoubleTapResult(
            lastTap.current,
            `${model.target.type}:${model.target.id}`,
            Date.now(),
          );
          lastTap.current = result.nextState;
          if (result.isDoubleTap) onDoubleTap();
        }}
        style={{ paddingVertical: 15, gap: 8 }}
      >
        <View
          style={{
            alignSelf: 'flex-start',
            backgroundColor: t.phase[model.phase].surface,
            borderRadius: 10,
            paddingHorizontal: 10,
            paddingVertical: 5,
          }}
        >
          <AppText style={{ color: t.phase[model.phase].text, fontSize: 12 }}>{model.label}</AppText>
        </View>
        {model.body ? <AppText>{model.body}</AppText> : null}
      </Pressable>
      <View style={{ borderTopWidth: 1, borderColor: t.colors.border, paddingTop: 9, gap: 4 }}>
        <ReactionBar
          reactions={model.reactions}
          disabled={pending || offline || !model.reactionsAvailable}
          onReact={onReact}
          onChoose={onChooseReaction}
        />
        {!model.isSelf ? (
          <View style={{ alignSelf: 'flex-start' }}>
            <BoopAction
              count={model.boopCount}
              status={model.boopStatus}
              disabled={pending || !model.boopsAvailable}
              onBoop={onBoop}
            />
          </View>
        ) : model.boopCount > 0 ? (
          <AppText role="caption" style={{ color: t.colors.secondary }}>
            {model.boopCount} {model.boopCount === 1 ? 'boop' : 'boops'} from your circle
          </AppText>
        ) : null}
        {comments}
      </View>
    </Surface>
  );
};
