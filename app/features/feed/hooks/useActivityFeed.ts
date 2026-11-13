import { memberName, memberInitial, type MemberIdentity } from '../../social/memberIdentity';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { createPost, deletePost } from '../../../services/supabase/posts';
import { addPostReaction, removePostReaction } from '../../../services/supabase/postReactions';
import { addEventReaction, removeEventReaction } from '../../../services/supabase/eventReactions';
import { sendBoop } from '../../../services/supabase/boops';
import { useSessionStore } from '../../../state/sessionStore';
import { useConnectionStore, selectIsOnline } from '../../../state/connectionStore';
import { loadActivityFeed, projectPost } from '../services/loadActivityFeed';
import {
  activityKey,
  quickEmojis,
  sortActivity,
  updateReaction,
  type ActivityItemModel,
  type ActivityTarget,
} from '../models/activity';

// One owner per signed-in account. Feed, Home, You and profiles receive the same models and mutations.
export const useActivityFeed = (userId: string, alias: string | null) => {
  const [rankingsRevision, invalidateRankings] = useState(0);
  const [items, setItems] = useState<ActivityItemModel[]>([]);
  const [selfIdentity, setSelfIdentity] = useState<MemberIdentity | null>(null);
  const selfName = memberName(selfIdentity?.full_name, selfIdentity?.alias || alias);
  const visibleItems = useMemo(() => items.map(item => item.isSelf ? {
    ...item,
    actorInitial: selfName ? memberInitial(selfName) : item.actorInitial,
    avatarUrl: selfIdentity?.avatar_url ?? item.avatarUrl,
  } : item), [items, selfName, selfIdentity]);
  const itemRef = useRef(items);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [mood, setMood] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [quickReactions, setQuickReactions] = useState(quickEmojis);
  const [pending, setPending] = useState<string[]>([]);
  const mounted = useRef(true);
  const locks = useRef(new Set<string>());
  const revision = useRef(0);
  const inFlight = useRef<Promise<void> | null>(null);
  const active = useCallback(
    () => mounted.current && useSessionStore.getState().session?.userId === userId,
    [userId],
  );
  useEffect(() => {
    mounted.current = true;
    AsyncStorage.getItem(`quick-reactions:${userId}`)
      .then((raw) => {
        if (!raw || !active()) return;
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed))
          setQuickReactions(
            [
              ...new Set([...parsed.filter((v): v is string => typeof v === 'string' && !!v), ...quickEmojis]),
            ].slice(0, 7),
          );
      })
      .catch(() => {});
    return () => {
      mounted.current = false;
    };
  }, [active, userId]);
  const update = useCallback(
    (fn: (previous: ActivityItemModel[]) => ActivityItemModel[]) => {
      if (!active()) return;
      itemRef.current = fn(itemRef.current);
      setItems(itemRef.current);
    },
    [active],
  );
  const reload = useCallback((): Promise<void> => {
    if (!active() || locks.current.size) return Promise.resolve();
    if (inFlight.current) return inFlight.current;
    const startedAt = revision.current;
    const request = (async () => {
      try {
        const result = await loadActivityFeed(userId);
        if (!active() || revision.current !== startedAt) return;
        if (result.selfIdentity) setSelfIdentity(result.selfIdentity);
        // Retain stale rows for a failed branch, but prevent actions on unknown state.
        update((previous) =>
          sortActivity([
            ...result.items,
            ...previous
              .filter((i) => result.failedKinds.includes(i.target.type))
              .map((i) => ({ ...i, reactionsAvailable: false, boopsAvailable: false })),
          ]),
        );
        setError(result.partial ? 'Some updates couldn’t refresh. Pull down to try again.' : null);
      } catch {
        if (active()) setError('Updates couldn’t refresh. Pull down to try again.');
      } finally {
        if (active()) setLoading(false);
        inFlight.current = null;
      }
    })();
    inFlight.current = request;
    return request;
  }, [active, update, userId]);
  const begin = (key: string) => {
    if (!active() || locks.current.has(key)) return false;
    locks.current.add(key);
    revision.current++;
    setPending([...locks.current]);
    return true;
  };
  const end = (key: string) => {
    locks.current.delete(key);
    revision.current++;
    if (active()) setPending([...locks.current]);
  };
  const find = (target: ActivityTarget) =>
    itemRef.current.find((i) => activityKey(i.target) === activityKey(target));
  const react = async (target: ActivityTarget, emoji: string, addOnly = false) => {
    const item = find(target);
    const selected = !!item?.reactions.find((r) => r.emoji === emoji)?.selected;
    const key = activityKey(target);
    if (
      !item?.reactionsAvailable ||
      !selectIsOnline(useConnectionStore.getState()) ||
      (addOnly && selected) ||
      !begin(key)
    )
      return;
    let reconcile = false;
    try {
      const result =
        target.type === 'post'
          ? await (selected ? removePostReaction(target.id, emoji) : addPostReaction(target.id, emoji))
          : await (selected ? removeEventReaction(target.id, emoji) : addEventReaction(target.id, emoji));
      if (!result) {
        reconcile = true;
        return;
      }
      update((previous) =>
        previous.map((i) => (activityKey(i.target) === key ? updateReaction(i, emoji, !selected) : i)),
      );
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {
      if (active()) setError('Your reaction couldn’t save. Please try again.');
    } finally {
      end(key);
      if (reconcile) void reload();
    }
  };
  const boop = async (target: ActivityTarget) => {
    const item = find(target);
    const key = activityKey(target);
    if (!item || item.isSelf || !item.boopsAvailable || item.boopStatus !== 'idle' || !begin(key)) return;
    update((previous) =>
      previous.map((i) => (activityKey(i.target) === key ? { ...i, boopStatus: 'sending' } : i)),
    );
    try {
      const result = await sendBoop({
        toUserId: item.actorId,
        ...(target.type === 'post' ? { postId: target.id } : { eventId: target.id }),
      });
      update((previous) =>
        previous.map((i) =>
          activityKey(i.target) === key
            ? { ...i, boopStatus: result.status, boopCount: i.boopCount + (result.status === 'sent' ? 1 : 0) }
            : i,
        ),
      );
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    } catch {
      update((previous) =>
        previous.map((i) => (activityKey(i.target) === key ? { ...i, boopStatus: 'idle' } : i)),
      );
      if (active()) setError('Your boop couldn’t send. Please try again.');
    } finally {
      end(key);
    }
  };
  const submit = async () => {
    if ((!text.trim() && !mood) || !selectIsOnline(useConnectionStore.getState()) || !begin('composer')) return false;
    setPosting(true);
    setPostError(null);
    try {
      const created = await createPost({ body: text.trim(), moodTag: mood ?? undefined, alias });
      if (!created) throw new Error('Post unavailable');
      if (!active()) return false;
      invalidateRankings((v) => v + 1);
      update((previous) => sortActivity([projectPost(created, userId), ...previous]));
      setText('');
      setMood(null);
      return true;
    } catch {
      if (active()) setPostError('Your post couldn’t send. Your draft is still here.');
      return false;
    } finally {
      end('composer');
      if (active()) setPosting(false);
    }
  };
  const remove = async (target: ActivityTarget) => {
    const item = find(target);
    const key = activityKey(target);
    if (!item?.isSelf || target.type !== 'post' || !selectIsOnline(useConnectionStore.getState()) || !begin(key))
      return;
    try {
      await deletePost(target.id);
      if (active()) invalidateRankings((v) => v + 1);
      update((previous) => previous.filter((i) => activityKey(i.target) !== key));
    } catch {
      if (active()) setError('Your post couldn’t be deleted. Please try again.');
    } finally {
      end(key);
    }
  };
  return {
    rankingsRevision,
    selfName,
    selfAvatar: selfIdentity?.avatar_url ?? null,
    items: visibleItems,
    loading,
    error,
    reload,
    react,
    boop,
    remove,
    pending,
    quickReactions,
    composer: { text, mood, posting, error: postError, setText, setMood, submit },
  };
};
