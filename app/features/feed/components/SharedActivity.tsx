import { CommentThreads } from './CommentThreads';
import { PostComments } from './PostComments';
import { readPostComments, addPostComment, deletePostComment } from '../../../services/supabase/postComments';
import { useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { ActivityItem } from './ActivityItem';
import { ReactionPicker } from './ReactionPicker';
import { activityKey, type ActivityItemModel } from '../models/activity';
import { useSocial } from '../../social/SocialProvider';
import { useConnectionStore, selectIsOnline } from '../../../state/connectionStore';
import { AppText } from '../../../components/ui/WidgetPrimitives';

export function SharedActivity({ item, link = true }: { item: ActivityItemModel; link?: boolean }) {
  const { feed, id, commentsRevision, commentsChanged } = useSocial();
  const focused = useIsFocused();
  const postId = item.target.id;
  const commentActions = useMemo(
    () => ({
      read: (start: number, limit: number) => readPostComments(postId, start, limit),
      add: async (body: string) => {
        await addPostComment(postId, body);
        commentsChanged();
      },
      remove: async (commentId: string) => {
        await deletePostComment(commentId);
        commentsChanged();
      },
    }),
    [postId, commentsChanged],
  );
  const nav = useNavigation<any>();
  const offline = !useConnectionStore(selectIsOnline);
  const [picker, setPicker] = useState(false);
  const pending = feed.pending.includes(activityKey(item.target));
  return (
    <>
      <ActivityItem
        model={item}
        comments={
          item.target.type === 'post' && (
            <PostComments
              postId={postId}
              self={id}
              offline={offline}
              actions={commentActions}
              revision={commentsRevision}
              focused={focused}
              onProfile={(memberId) => nav.navigate('MemberProfile', { memberId })}
            />
          )
        }
        offline={offline}
        pending={pending}
        onOpenProfile={
          link
            ? () => nav.navigate('MemberProfile', { memberId: item.actorId, alias: item.actorName })
            : undefined
        }
        onReact={(emoji) => void feed.react(item.target, emoji)}
        onChooseReaction={() => {
          if (!pending && !offline && item.reactionsAvailable) setPicker(true);
        }}
        onDoubleTap={() => void feed.react(item.target, feed.quickReactions[0], true)}
        onBoop={() => void feed.boop(item.target)}
        onDelete={() =>
          Alert.alert('Delete post?', 'This permanently removes your update.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => void feed.remove(item.target) },
          ])
        }
      />
      {picker && (
        <ReactionPicker
          visible
          quickReactions={feed.quickReactions}
          onClose={() => setPicker(false)}
          onSelect={(emoji) => {
            void feed.react(item.target, emoji);
            setPicker(false);
          }}
        />
      )}
    </>
  );
}
export function MemberUpdates({
  memberId,
  link = true,
  postsOnly = false,
}: {
  memberId: string;
  link?: boolean;
  postsOnly?: boolean;
}) {
  const { feed } = useSocial();
  const items = feed.items.filter((i) => i.actorId === memberId && (!postsOnly || i.target.type === 'post'));
  return (
    <CommentThreads key={memberId}>
      {feed.error && <AppText accessibilityRole="alert">{feed.error}</AppText>}
      {items.map((i) => (
        <SharedActivity key={activityKey(i.target)} item={i} link={link} />
      ))}
      {!items.length && !feed.error && (
        <AppText>
          {feed.loading ? 'Loading updates…' : postsOnly ? 'No recent posts.' : 'No recent shared updates.'}
        </AppText>
      )}
    </CommentThreads>
  );
}
