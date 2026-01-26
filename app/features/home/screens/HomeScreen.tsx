import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  GestureResponderEvent,
  Modal,
  Platform,
  PlatformColor,
  Pressable,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NotificationsBell from '../../notifications/components/NotificationsBell';
import NotificationsSheet from '../../notifications/components/NotificationsSheet';
import { useNotifications } from '../../notifications/hooks/useNotifications';
import FriendSyncButton from '../../friends/components/FriendSyncButton';
import { createPost, fetchPosts, type PostRow } from '../../../services/supabase/posts';
import { fetchCycleEvents, type CycleEventRow } from '../../../services/supabase/cycleEvents';
import {
  addPostReaction,
  fetchPostReactions,
  removePostReaction,
} from '../../../services/supabase/postReactions';
import {
  addEventReaction,
  fetchEventReactions,
  removeEventReaction,
} from '../../../services/supabase/eventReactions';
import {
  fetchEventBoops,
  fetchEventBoopsByUser,
  fetchPostBoops,
  fetchPostBoopsByUser,
  sendBoop,
} from '../../../services/supabase/boops';
import { fetchUserProfilesByIds } from '../../../services/supabase/users';
import { selectIsOnline, useConnectionStore } from '../../../state/connectionStore';
import { selectAlias, selectSession, useSessionStore } from '../../../state/sessionStore';
import { useCycleSnapshot } from '../../feed/hooks/useCycleSnapshot';
import { getDoubleTapResult } from '../utils/reactionDoubleTap';

const iosColor = (name: string, fallback: string) =>
  Platform.OS === 'ios' ? PlatformColor(name) : fallback;

const palette = {
  background: iosColor('systemGroupedBackground', '#F2F2F7'),
  card: iosColor('secondarySystemGroupedBackground', '#FFFFFF'),
  primaryText: iosColor('label', '#111827'),
  secondaryText: iosColor('secondaryLabel', '#6B7280'),
  tertiaryText: iosColor('tertiaryLabel', '#9CA3AF'),
  placeholder: iosColor('placeholderText', '#9CA3AF'),
  separator: iosColor('separator', '#E5E7EB'),
  accent: iosColor('systemBlue', '#007AFF'),
  accentSoft: '#E6F0FF',
  success: iosColor('systemGreen', '#16A34A'),
  successBackground: '#E7F7EC',
  fill: iosColor('systemGray5', '#E5E7EB'),
  mutedFill: iosColor('systemGray6', '#F3F4F6'),
  disabled: iosColor('systemGray3', '#D1D5DB'),
  pendingText: '#92400E',
  pendingBackground: '#FEF3C7',
  warningText: iosColor('systemRed', '#B42318'),
  warningBackground: '#FDECEC',
};

const MOOD_TAGS = [
  'Recovering',
  'Amazing',
  'Rock Hard',
  'Sad',
  'Bloated af',
  'One more day',
  'Boop me',
];

const MOOD_TONE_MAP: Record<string, 'positive' | 'warm' | 'negative'> = {
  Recovering: 'warm',
  Amazing: 'positive',
  'Rock Hard': 'positive',
  Sad: 'negative',
  'Bloated af': 'negative',
  'One more day': 'warm',
  'Boop me': 'warm',
};

const MOOD_TONE_COLORS = {
  positive: '#15803D',
  warm: '#B45309',
  negative: '#B42318',
};

const MOOD_TAG_MAP = MOOD_TAGS.reduce(
  (acc, label) => {
    const tone = MOOD_TONE_MAP[label] ?? 'warm';
    acc[label] = { tone, dot: MOOD_TONE_COLORS[tone] };
    return acc;
  },
  {} as Record<string, { tone: 'positive' | 'warm' | 'negative'; dot: string }>,
);

const parseMoodTags = (value: string | null) =>
  (value ?? '')
    .split(',')
    .map((label) => label.trim())
    .filter(Boolean);

const serializeMoodTags = (tags: string[]) =>
  tags
    .map((label) => label.trim())
    .filter(Boolean)
    .join(',');

const QUICK_REACTION_EMOJIS = ['❤️', '😂', '😮', '😭', '😡', '🔥', '👏'];
const EXTENDED_REACTION_EMOJIS = [
  ...QUICK_REACTION_EMOJIS,
  '😍',
  '🤔',
  '🙌',
  '✨',
  '🫶',
  '💯',
  '🙏',
  '🤝',
  '😴',
  '🤒',
  '🤯',
  '🥳',
  '😬',
  '😅',
  '😇',
  '😎',
  '💪',
];

type ReactionMap = Record<string, Record<string, number>>;
type ReactionSelectionMap = Record<string, Record<string, boolean>>;

type BoopStatus = 'idle' | 'sending' | 'sent' | 'queued';
type HomeFeedItem =
  | { type: 'post'; id: string; sortKey: number; post: PostRow }
  | { type: 'cycle'; id: string; sortKey: number; event: CycleEventRow };
type ReactionTarget = { type: 'post' | 'cycle'; id: string };

const REACTION_BUTTON_SIZE = 32;
const REACTION_BUTTON_GAP = 6;
const REACTION_BAR_PADDING = 10;
const EXPANDED_GRID_COLUMNS = 6;
const EXPANDED_GRID_GAP = 10;
const EXPANDED_PANEL_PADDING = 12;
const EXPANDED_HEADER_HEIGHT = 28;

const HomeScreen = () => {
  const navigation = useNavigation();
  const { notifications, unreadCount, friendRequests, requestProfileMap, respondToFriendRequest } =
    useNotifications();
  const session = useSessionStore(selectSession);
  const alias = useSessionStore(selectAlias);
  const isOnline = useConnectionStore(selectIsOnline);
  const isOffline = !isOnline;
  const { snapshot, lastSyncedAt, isStale: isSnapshotStale } = useCycleSnapshot();
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [cycleEvents, setCycleEvents] = useState<CycleEventRow[]>([]);
  const [cycleNameMap, setCycleNameMap] = useState<Record<string, string>>({});
  const [isLoading, setLoading] = useState(false);
  const [isSheetVisible, setSheetVisible] = useState(false);
  const [isComposerOpen, setComposerOpen] = useState(false);
  const [composerText, setComposerText] = useState('');
  const [isPosting, setPosting] = useState(false);
  const [composerMoods, setComposerMoods] = useState<string[]>([]);
  const [isMoodModalVisible, setMoodModalVisible] = useState(false);
  const [reactionTarget, setReactionTarget] = useState<ReactionTarget | null>(null);
  const [isReactionPickerExpanded, setReactionPickerExpanded] = useState(false);
  const [reactionAnchor, setReactionAnchor] = useState<{ x: number; y: number } | null>(null);
  const [reactionCounts, setReactionCounts] = useState<ReactionMap>({});
  const [reactionSelections, setReactionSelections] = useState<ReactionSelectionMap>({});
  const [eventReactionCounts, setEventReactionCounts] = useState<ReactionMap>({});
  const [eventReactionSelections, setEventReactionSelections] =
    useState<ReactionSelectionMap>({});
  const [quickReactions, setQuickReactions] = useState<string[]>(QUICK_REACTION_EMOJIS);
  const [boopCounts, setBoopCounts] = useState<Record<string, number>>({});
  const [boopCountsByEvent, setBoopCountsByEvent] = useState<Record<string, number>>({});
  const [boopStatusByPost, setBoopStatusByPost] = useState<Record<string, BoopStatus>>({});
  const [boopStatusByEvent, setBoopStatusByEvent] = useState<Record<string, BoopStatus>>({});
  const [boopLoadingByEvent, setBoopLoadingByEvent] = useState<Record<string, boolean>>({});
  const postPressRef = useRef(false);
  const lastTapRef = useRef<{ postId: string | null; timestamp: number | null }>({
    postId: null,
    timestamp: null,
  });
  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString([], {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      }),
    [],
  );

  const quickReactionsKey = session?.userId ? `quick-reactions:${session.userId}` : null;

  const toggleComposerMood = useCallback((label: string) => {
    setComposerMoods((prev) => {
      if (prev.includes(label)) {
        return prev.filter((item) => item !== label);
      }
      return [...prev, label];
    });
  }, []);

  const clearComposerMoods = useCallback(() => {
    setComposerMoods([]);
  }, []);

  const openMoodModal = useCallback(() => {
    if (!isComposerOpen) {
      setComposerOpen(true);
    }
    setMoodModalVisible(true);
  }, [isComposerOpen]);

  const closeMoodModal = useCallback(() => {
    setMoodModalVisible(false);
  }, []);

  const normalizeQuickReactions = useCallback((list: string[]) => {
    const seen = new Set<string>();
    const next: string[] = [];
    list.forEach((emoji) => {
      if (!emoji || seen.has(emoji)) {
        return;
      }
      seen.add(emoji);
      next.push(emoji);
    });
    QUICK_REACTION_EMOJIS.forEach((emoji) => {
      if (next.length >= QUICK_REACTION_EMOJIS.length) {
        return;
      }
      if (!seen.has(emoji)) {
        seen.add(emoji);
        next.push(emoji);
      }
    });
    return next.slice(0, QUICK_REACTION_EMOJIS.length);
  }, []);

  const navigateToProfile = () => {
    const state = navigation.getState();
    if (state?.routeNames?.includes('Profile')) {
      navigation.navigate('Profile' as never);
      return;
    }
    if (state?.routeNames?.includes('MainTabs')) {
      navigation.navigate('MainTabs' as never, { screen: 'Profile' } as never);
    }
  };

  const navigateToFriendSync = useCallback(
    (friendUserId: string) => {
      navigation.navigate('FriendSync' as never, { friendId: friendUserId } as never);
    },
    [navigation],
  );

  const loadFeed = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchPosts();
      setPosts(data);
      const ids = data.map((post) => post.id);
      try {
        const reactions = await fetchPostReactions(ids);
        const nextReactions: ReactionMap = {};
        const nextSelections: ReactionSelectionMap = {};
        reactions.forEach((reaction) => {
          if (!reaction.post_id) {
            return;
          }
          if (!nextReactions[reaction.post_id]) {
            nextReactions[reaction.post_id] = {};
          }
          const counts = nextReactions[reaction.post_id];
          counts[reaction.emoji] = (counts[reaction.emoji] ?? 0) + 1;
          if (reaction.user_id && reaction.user_id === session?.userId) {
            if (!nextSelections[reaction.post_id]) {
              nextSelections[reaction.post_id] = {};
            }
            nextSelections[reaction.post_id][reaction.emoji] = true;
          }
        });
        setReactionCounts(nextReactions);
        setReactionSelections(nextSelections);
      } catch (error) {
        console.warn('[home] Failed to load reactions', error);
        setReactionCounts({});
        setReactionSelections({});
      }

      try {
        const boops = await fetchPostBoops(ids);
        const nextBoopCounts: Record<string, number> = {};
        boops.forEach((row) => {
          if (!row.post_id) {
            return;
          }
          nextBoopCounts[row.post_id] = (nextBoopCounts[row.post_id] ?? 0) + 1;
        });
        setBoopCounts(nextBoopCounts);
        if (session?.userId) {
          try {
            const userBoops = await fetchPostBoopsByUser(ids, session.userId);
            setBoopStatusByPost((prev) => {
              const next = { ...prev };
              userBoops.forEach((row) => {
                if (!row.post_id) {
                  return;
                }
                if (next[row.post_id] === 'queued' || next[row.post_id] === 'sending') {
                  return;
                }
                next[row.post_id] = 'sent';
              });
              return next;
            });
          } catch (error) {
            console.warn('[home] Failed to load post boops by user', error);
          }
        }
      } catch (error) {
        console.warn('[home] Failed to load boops', error);
        setBoopCounts({});
      }
    } catch (error) {
      console.warn('[home] Failed to load posts', error);
      setPosts([]);
      setReactionCounts({});
      setReactionSelections({});
      setBoopCounts({});
    }
    try {
      const events = await fetchCycleEvents();
      setCycleEvents(events);
      const eventIds = events.map((event) => event.id);
      if (eventIds.length) {
        try {
          const reactions = await fetchEventReactions(eventIds);
          const nextReactions: ReactionMap = {};
          const nextSelections: ReactionSelectionMap = {};
          reactions.forEach((reaction) => {
            if (!reaction.event_id) {
              return;
            }
            if (!nextReactions[reaction.event_id]) {
              nextReactions[reaction.event_id] = {};
            }
            const counts = nextReactions[reaction.event_id];
            counts[reaction.emoji] = (counts[reaction.emoji] ?? 0) + 1;
            if (reaction.user_id && reaction.user_id === session?.userId) {
              if (!nextSelections[reaction.event_id]) {
                nextSelections[reaction.event_id] = {};
              }
              nextSelections[reaction.event_id][reaction.emoji] = true;
            }
          });
          setEventReactionCounts(nextReactions);
          setEventReactionSelections(nextSelections);
        } catch (error) {
          console.warn('[home] Failed to load event reactions', error);
          setEventReactionCounts({});
          setEventReactionSelections({});
        }
        try {
          const boops = await fetchEventBoops(eventIds);
          const nextCounts: Record<string, number> = {};
          boops.forEach((row) => {
            if (!row.event_id) {
              return;
            }
            nextCounts[row.event_id] = (nextCounts[row.event_id] ?? 0) + 1;
          });
          setBoopCountsByEvent(nextCounts);
          if (session?.userId) {
            try {
              const userBoops = await fetchEventBoopsByUser(eventIds, session.userId);
              setBoopStatusByEvent((prev) => {
                const next = { ...prev };
                userBoops.forEach((row) => {
                  if (!row.event_id) {
                    return;
                  }
                  if (next[row.event_id] === 'queued') {
                    return;
                  }
                  next[row.event_id] = 'sent';
                });
                return next;
              });
            } catch (error) {
              console.warn('[home] Failed to load event boops by user', error);
            }
          }
        } catch (error) {
          console.warn('[home] Failed to load event boops', error);
          setBoopCountsByEvent({});
        }
      } else {
        setEventReactionCounts({});
        setEventReactionSelections({});
        setBoopCountsByEvent({});
      }
      const friendIds = Array.from(
        new Set(
          events
            .map((event) => event.user_id)
            .filter((userId) => userId && userId !== session?.userId),
        ),
      );
      if (friendIds.length) {
        try {
          const profiles = await fetchUserProfilesByIds(friendIds);
          const nextMap: Record<string, string> = {};
          profiles.forEach((profile) => {
            if (profile.full_name) {
              nextMap[profile.id] = profile.full_name;
            } else if (profile.alias) {
              nextMap[profile.id] = profile.alias;
            } else if (profile.email) {
              nextMap[profile.id] = profile.email;
            }
          });
          setCycleNameMap(nextMap);
        } catch (error) {
          console.warn('[home] Failed to load cycle friend names', error);
          setCycleNameMap({});
        }
      } else {
        setCycleNameMap({});
      }
    } catch (error) {
      console.warn('[home] Failed to load cycle events', error);
      setCycleEvents([]);
      setCycleNameMap({});
      setEventReactionCounts({});
      setEventReactionSelections({});
      setBoopCountsByEvent({});
    } finally {
      setLoading(false);
    }
  }, [session?.userId]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  useEffect(() => {
    if (!quickReactionsKey) {
      setQuickReactions(QUICK_REACTION_EMOJIS);
      return;
    }
    let isActive = true;
    AsyncStorage.getItem(quickReactionsKey)
      .then((stored) => {
        if (!isActive) {
          return;
        }
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setQuickReactions(normalizeQuickReactions(parsed));
            return;
          }
        }
        setQuickReactions(QUICK_REACTION_EMOJIS);
      })
      .catch(() => {
        if (isActive) {
          setQuickReactions(QUICK_REACTION_EMOJIS);
        }
      });
    return () => {
      isActive = false;
    };
  }, [normalizeQuickReactions, quickReactionsKey]);

  useEffect(() => {
    if (!quickReactionsKey) {
      return;
    }
    AsyncStorage.setItem(quickReactionsKey, JSON.stringify(quickReactions)).catch(() => {});
  }, [quickReactions, quickReactionsKey]);

  const handlePost = useCallback(async () => {
    const body = composerText.trim();
    if (!body) {
      return;
    }
    setPosting(true);
    try {
      const moodTagValue = composerMoods.length ? serializeMoodTags(composerMoods) : undefined;
      const created = await createPost({ body, alias, moodTag: moodTagValue });
      if (created) {
        setPosts((prev) => [created, ...prev]);
      }
      setComposerText('');
      clearComposerMoods();
      setComposerOpen(false);
    } catch (error) {
      console.warn('[home] Failed to create post', error);
    } finally {
      setPosting(false);
      postPressRef.current = false;
    }
  }, [alias, clearComposerMoods, composerMoods, composerText]);

  const handleQuickTag = useCallback(
    async (label: string) => {
      setPosting(true);
      try {
        const created = await createPost({ moodTag: label, alias });
        if (created) {
          setPosts((prev) => [created, ...prev]);
        }
      } catch (error) {
        console.warn('[home] Failed to create quick post', error);
      } finally {
        setPosting(false);
      }
    },
    [alias],
  );

  const handleBoop = useCallback(
    async (post: PostRow) => {
      if (!post.user_id || post.user_id === session?.userId) {
        return;
      }
      const currentStatus = boopStatusByPost[post.id];
      if (currentStatus === 'sent' || currentStatus === 'queued' || currentStatus === 'sending') {
        return;
      }
      setBoopStatusByPost((prev) => ({ ...prev, [post.id]: 'sending' }));
      try {
        const result = await sendBoop({ toUserId: post.user_id, postId: post.id });
        setBoopStatusByPost((prev) => ({ ...prev, [post.id]: result.status }));
        if (result.status === 'sent') {
          setBoopCounts((prev) => ({ ...prev, [post.id]: (prev[post.id] ?? 0) + 1 }));
        }
      } catch (error) {
        console.warn('[home] Failed to send boop', error);
        setBoopStatusByPost((prev) => ({ ...prev, [post.id]: 'idle' }));
      }
    },
    [boopStatusByPost, session?.userId],
  );

  const handleEventBoop = useCallback(
    async (event: CycleEventRow) => {
      if (!event.user_id || event.user_id === session?.userId) {
        return;
      }
      const currentStatus = boopStatusByEvent[event.id];
      if (currentStatus === 'sent' || currentStatus === 'queued') {
        return;
      }
      if (boopLoadingByEvent[event.id]) {
        return;
      }
      setBoopLoadingByEvent((prev) => ({ ...prev, [event.id]: true }));
      try {
        const result = await sendBoop({ toUserId: event.user_id, eventId: event.id });
        setBoopStatusByEvent((prev) => ({ ...prev, [event.id]: result.status }));
        if (result.status === 'sent') {
          setBoopCountsByEvent((prev) => ({
            ...prev,
            [event.id]: (prev[event.id] ?? 0) + 1,
          }));
        }
      } catch (error) {
        console.warn('[home] Failed to send boop for cycle event', error);
        setBoopStatusByEvent((prev) => ({ ...prev, [event.id]: 'idle' }));
      } finally {
        setBoopLoadingByEvent((prev) => ({ ...prev, [event.id]: false }));
      }
    },
    [boopLoadingByEvent, boopStatusByEvent, session?.userId],
  );

  const handleReaction = useCallback(
    async (target: ReactionTarget, emoji: string) => {
      try {
        const selectionMap =
          target.type === 'post' ? reactionSelections : eventReactionSelections;
        const isSelected = Boolean(selectionMap[target.id]?.[emoji]);
        if (target.type === 'post') {
          if (isSelected) {
            const removed = await removePostReaction(target.id, emoji);
            if (!removed) {
              return;
            }
            setReactionCounts((prev) => {
              const next = { ...prev };
              const postReactions = { ...(next[target.id] ?? {}) };
              const nextCount = (postReactions[emoji] ?? 1) - 1;
              if (nextCount <= 0) {
                delete postReactions[emoji];
              } else {
                postReactions[emoji] = nextCount;
              }
              if (Object.keys(postReactions).length === 0) {
                delete next[target.id];
              } else {
                next[target.id] = postReactions;
              }
              return next;
            });
            setReactionSelections((prev) => {
              const next = { ...prev };
              const postSelections = { ...(next[target.id] ?? {}) };
              delete postSelections[emoji];
              if (Object.keys(postSelections).length === 0) {
                delete next[target.id];
              } else {
                next[target.id] = postSelections;
              }
              return next;
            });
          } else {
            const inserted = await addPostReaction(target.id, emoji);
            if (!inserted) {
              return;
            }
            setReactionCounts((prev) => {
              const next = { ...prev };
              const postReactions = { ...(next[target.id] ?? {}) };
              postReactions[emoji] = (postReactions[emoji] ?? 0) + 1;
              next[target.id] = postReactions;
              return next;
            });
            setReactionSelections((prev) => {
              const next = { ...prev };
              const postSelections = { ...(next[target.id] ?? {}) };
              postSelections[emoji] = true;
              next[target.id] = postSelections;
              return next;
            });
          }
        } else {
          if (isSelected) {
            const removed = await removeEventReaction(target.id, emoji);
            if (!removed) {
              return;
            }
            setEventReactionCounts((prev) => {
              const next = { ...prev };
              const eventReactions = { ...(next[target.id] ?? {}) };
              const nextCount = (eventReactions[emoji] ?? 1) - 1;
              if (nextCount <= 0) {
                delete eventReactions[emoji];
              } else {
                eventReactions[emoji] = nextCount;
              }
              if (Object.keys(eventReactions).length === 0) {
                delete next[target.id];
              } else {
                next[target.id] = eventReactions;
              }
              return next;
            });
            setEventReactionSelections((prev) => {
              const next = { ...prev };
              const eventSelections = { ...(next[target.id] ?? {}) };
              delete eventSelections[emoji];
              if (Object.keys(eventSelections).length === 0) {
                delete next[target.id];
              } else {
                next[target.id] = eventSelections;
              }
              return next;
            });
          } else {
            const inserted = await addEventReaction(target.id, emoji);
            if (!inserted) {
              return;
            }
            setEventReactionCounts((prev) => {
              const next = { ...prev };
              const eventReactions = { ...(next[target.id] ?? {}) };
              eventReactions[emoji] = (eventReactions[emoji] ?? 0) + 1;
              next[target.id] = eventReactions;
              return next;
            });
            setEventReactionSelections((prev) => {
              const next = { ...prev };
              const eventSelections = { ...(next[target.id] ?? {}) };
              eventSelections[emoji] = true;
              next[target.id] = eventSelections;
              return next;
            });
          }
        }
      } catch (error) {
        console.warn('[home] Failed to update reaction', error);
      } finally {
        setReactionTarget(null);
        setReactionPickerExpanded(false);
        setReactionAnchor(null);
      }
    },
    [eventReactionSelections, reactionSelections],
  );

  const openReactionPicker = useCallback(
    (target: ReactionTarget, event: GestureResponderEvent) => {
      const { pageX, pageY } = event.nativeEvent;
      setReactionTarget(target);
      setReactionPickerExpanded(false);
      setReactionAnchor({ x: pageX, y: pageY });
    },
    [],
  );

  const closeReactionPicker = useCallback(() => {
    setReactionTarget(null);
    setReactionPickerExpanded(false);
    setReactionAnchor(null);
  }, []);
  const handleEmojiPress = useCallback(
    (emoji: string) => {
      if (!reactionTarget) {
        return;
      }
      handleReaction(reactionTarget, emoji);
    },
    [handleReaction, reactionTarget],
  );

  const handlePostPress = useCallback(
    (postId: string) => {
      const now = Date.now();
      const result = getDoubleTapResult(lastTapRef.current, postId, now);
      if (result.isDoubleTap) {
        lastTapRef.current = result.nextState;
        const defaultEmoji = quickReactions[0];
        if (defaultEmoji) {
          handleReaction({ type: 'post', id: postId }, defaultEmoji);
        }
        return;
      }
      lastTapRef.current = result.nextState;
    },
    [handleReaction, quickReactions],
  );

  const handleEventPress = useCallback(
    (eventId: string) => {
      const now = Date.now();
      const targetId = `cycle-${eventId}`;
      const result = getDoubleTapResult(lastTapRef.current, targetId, now);
      if (result.isDoubleTap) {
        lastTapRef.current = result.nextState;
        const defaultEmoji = quickReactions[0];
        if (defaultEmoji) {
          handleReaction({ type: 'cycle', id: eventId }, defaultEmoji);
        }
        return;
      }
      lastTapRef.current = result.nextState;
    },
    [handleReaction, quickReactions],
  );

  const reactionBarLayout = useMemo(() => {
    const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
    const reactionCount = quickReactions.length + 1;
    const rawWidth =
      reactionCount * REACTION_BUTTON_SIZE +
      (reactionCount - 1) * REACTION_BUTTON_GAP +
      REACTION_BAR_PADDING * 2;
    const barWidth = Math.min(screenWidth - 24, rawWidth);
    const barHeight = REACTION_BUTTON_SIZE + REACTION_BAR_PADDING * 2;
    const anchorX = reactionAnchor?.x ?? screenWidth / 2;
    const anchorY = reactionAnchor?.y ?? screenHeight / 2;
    const unclampedLeft = anchorX - barWidth / 2;
    const minLeft = 12;
    const maxLeft = screenWidth - barWidth - 12;
    const left = Math.min(Math.max(unclampedLeft, minLeft), maxLeft);
    const preferredTop = anchorY - barHeight - 14;
    const minTop = 80;
    const maxTop = screenHeight - barHeight - 16;
    const top =
      preferredTop < minTop
        ? Math.min(anchorY + 14, maxTop)
        : Math.min(preferredTop, maxTop);
    return { barWidth, barHeight, left, top };
  }, [quickReactions.length, reactionAnchor]);

  const expandedPanelLayout = useMemo(() => {
    const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
    const panelWidth = Math.min(screenWidth - 32, 360);
    const usableWidth = panelWidth - EXPANDED_PANEL_PADDING * 2;
    const cellSize =
      (usableWidth - EXPANDED_GRID_GAP * (EXPANDED_GRID_COLUMNS - 1)) /
      EXPANDED_GRID_COLUMNS;
    const rows = Math.ceil(EXTENDED_REACTION_EMOJIS.length / EXPANDED_GRID_COLUMNS);
    const gridHeight = rows * cellSize + (rows - 1) * EXPANDED_GRID_GAP;
    const panelHeight =
      EXPANDED_PANEL_PADDING * 2 + EXPANDED_HEADER_HEIGHT + gridHeight;
    const barBottom = reactionBarLayout.top + reactionBarLayout.barHeight;
    const barCenter = reactionBarLayout.left + reactionBarLayout.barWidth / 2;
    const minLeft = 12;
    const maxLeft = screenWidth - panelWidth - 12;
    const left = Math.min(Math.max(barCenter - panelWidth / 2, minLeft), maxLeft);
    const minTop = 80;
    const maxTop = screenHeight - panelHeight - 16;
    const preferredTop = barBottom + 10;
    const top =
      preferredTop > maxTop
        ? Math.max(reactionBarLayout.top - panelHeight - 10, minTop)
        : Math.min(preferredTop, maxTop);
    return {
      panelWidth,
      panelHeight,
      left,
      top,
      cellSize,
    };
  }, [reactionBarLayout]);

  const formatTime = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatSyncLabel = (value?: string | null) => {
    if (!value) {
      return 'Not synced yet';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 'Not synced yet';
    }
    const datePart = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    const timePart = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    return `${datePart} • ${timePart}`;
  };

  const formatEventType = (value: string) => {
    if (!value) {
      return 'Cycle update';
    }
    const normalized = value.replace(/_/g, ' ');
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  };

  const shortId = (value: string) => `${value.slice(0, 4)}...${value.slice(-4)}`;

  const formatPhaseLabel = (value?: string | null) => {
    if (!value) {
      return null;
    }
    const normalized = value.replace(/_/g, ' ');
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  };

  const phasePillPalette: Record<string, string> = {
    menstruation: '#FDECEC',
    follicular: '#ECFDF3',
    ovulation: '#FFF8E1',
    luteal: '#EEF2FF',
    pms: '#FEF3C7',
    unknown: '#F3F4F6',
  };

  const phasePillPaletteText: Record<string, string> = {
    menstruation: '#B42318',
    follicular: '#027A48',
    ovulation: '#B54708',
    luteal: '#3730A3',
    pms: '#92400E',
    unknown: '#6B7280',
  };

  const cyclePhaseKey = snapshot?.currentPhase ?? 'unknown';
  const cyclePhaseLabel = useMemo(
    () => formatPhaseLabel(snapshot?.currentPhase) ?? 'Unknown phase',
    [snapshot?.currentPhase],
  );
  const cycleSyncLabel = useMemo(
    () => formatSyncLabel(lastSyncedAt ?? snapshot?.syncedAt ?? null),
    [lastSyncedAt, snapshot?.syncedAt],
  );
  const cycleDetailLabel = useMemo(() => {
    if (!snapshot) {
      return 'Connect Health to see your phase.';
    }
    if (isSnapshotStale) {
      return cycleSyncLabel === 'Not synced yet'
        ? 'Needs sync'
        : `Needs sync • ${cycleSyncLabel}`;
    }
    return cycleSyncLabel === 'Not synced yet' ? 'Synced recently' : `Last synced ${cycleSyncLabel}`;
  }, [cycleSyncLabel, isSnapshotStale, snapshot]);
  const cycleMetaTone = !snapshot || isSnapshotStale ? 'stale' : 'fresh';
  const cyclePhaseColors = {
    background: phasePillPalette[cyclePhaseKey] ?? palette.mutedFill,
    text: phasePillPaletteText[cyclePhaseKey] ?? palette.secondaryText,
  };

  const periodDayByEventId = useMemo(() => {
    const result: Record<string, { day: number; total: number }> = {};
    const byUser: Record<string, Record<number, CycleEventRow[]>> = {};
    const dayMs = 24 * 60 * 60 * 1000;

    cycleEvents
      .filter((event) => event.event_type === 'menstrual_flow')
      .forEach((event) => {
        const date = new Date(event.starts_at);
        if (Number.isNaN(date.getTime())) {
          return;
        }
        const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
        if (!byUser[event.user_id]) {
          byUser[event.user_id] = {};
        }
        if (!byUser[event.user_id][dayStart]) {
          byUser[event.user_id][dayStart] = [];
        }
        byUser[event.user_id][dayStart].push(event);
      });

    Object.values(byUser).forEach((byDay) => {
      const dayStarts = Object.keys(byDay)
        .map((value) => Number(value))
        .sort((a, b) => a - b);
      let runStartIndex = 0;
      dayStarts.forEach((dayStart, index) => {
        const previous = dayStarts[index - 1];
        const isBreak = index === 0 || dayStart - previous > dayMs;
        if (isBreak && index > 0) {
          const runDays = dayStarts.slice(runStartIndex, index);
          runDays.forEach((runDay, runIndex) => {
            const total = runDays.length;
            byDay[runDay].forEach((event) => {
              result[event.id] = { day: runIndex + 1, total };
            });
          });
          runStartIndex = index;
        }
      });
      const trailingRun = dayStarts.slice(runStartIndex);
      if (trailingRun.length) {
        trailingRun.forEach((runDay, runIndex) => {
          const total = trailingRun.length;
          byDay[runDay].forEach((event) => {
            result[event.id] = { day: runIndex + 1, total };
          });
        });
      }
    });

    return result;
  }, [cycleEvents]);

  const feedItems = useMemo<HomeFeedItem[]>(() => {
    const toSortKey = (timestamp: string) => {
      const date = new Date(timestamp);
      return Number.isNaN(date.getTime()) ? 0 : date.getTime();
    };
    const merged: HomeFeedItem[] = [
      ...posts.map((post) => ({
        type: 'post',
        id: `post-${post.id}`,
        sortKey: toSortKey(post.created_at),
        post,
      })),
      ...cycleEvents.map((event) => ({
        type: 'cycle',
        id: `cycle-${event.id}`,
        sortKey: toSortKey(event.starts_at),
        event,
      })),
    ];
    return merged.sort((a, b) => b.sortKey - a.sortKey);
  }, [posts, cycleEvents]);

  const renderPost = ({ item }: { item: PostRow }) => {
    const name = item.user_id === session?.userId ? 'You' : item.alias ?? 'Anonymous';
    const timeLabel = formatTime(item.created_at);
    const initials = (item.alias ?? name).slice(0, 1).toUpperCase();
    const moodTags = parseMoodTags(item.mood_tag);
    const metaLabel = moodTags.length ? 'Mood update' : item.body ? 'Shared an update' : 'Check-in';
    const moodTone = moodTags.length ? MOOD_TAG_MAP[moodTags[0]] : null;
    const isSelf = item.user_id === session?.userId;
    const boopCount = boopCounts[item.id] ?? 0;
    const boopStatus = boopStatusByPost[item.id] ?? 'idle';
    const boopSent = boopStatus === 'sent';
    const boopQueued = boopStatus === 'queued';
    const boopSending = boopStatus === 'sending';
    const boopTextColor =
      boopSending || isSelf
        ? palette.secondaryText
        : boopSent
          ? palette.success
          : boopQueued
          ? palette.pendingText
          : palette.accent;
    const postReactions = reactionCounts[item.id] ?? {};
    const postSelections = reactionSelections[item.id] ?? {};
    const headerContent = (
      <>
        <View style={styles.headerLeft}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.postMeta}>
            <Text style={styles.postName}>{name}</Text>
            <Text style={styles.postMetaText}>{metaLabel}</Text>
          </View>
        </View>
        {timeLabel ? <Text style={styles.postTime}>{timeLabel}</Text> : null}
      </>
    );

    return (
      <TouchableOpacity
        style={styles.postCard}
        onLongPress={(event) => openReactionPicker({ type: 'post', id: item.id }, event)}
        onPress={() => handlePostPress(item.id)}
        activeOpacity={0.9}
      >
        <View style={styles.postHeader}>
          {isSelf ? (
            <View style={styles.postHeaderButton}>{headerContent}</View>
          ) : (
            <TouchableOpacity
              style={styles.postHeaderButton}
              onPress={() => navigateToFriendSync(item.user_id)}
              accessibilityLabel={`View sync with ${name}`}
            >
              {headerContent}
            </TouchableOpacity>
          )}
        </View>
        {moodTags.length ? (
          <View style={styles.moodPillRow}>
            {moodTags.map((tag, index) => (
              <View key={`${tag}-${index}`} style={styles.moodPill}>
                <View
                  style={[
                    styles.moodDotSmall,
                    { backgroundColor: MOOD_TAG_MAP[tag]?.dot ?? palette.tertiaryText },
                  ]}
                />
                <Text style={styles.moodPillText}>{tag}</Text>
              </View>
            ))}
          </View>
        ) : null}
        {item.body ? <Text style={styles.postBody}>{item.body}</Text> : null}
        <View style={styles.postActions}>
          <TouchableOpacity
            style={[
              styles.boopButton,
              boopQueued ? styles.boopButtonQueued : null,
              boopSent ? styles.boopButtonSent : null,
            ]}
            onPress={() => handleBoop(item)}
            disabled={boopSending || boopQueued || boopSent || isSelf}
          >
            <Ionicons
              name={boopSent ? 'checkmark' : 'hand-left-outline'}
              size={14}
              color={boopTextColor}
            />
            <Text style={[styles.boopText, { color: boopTextColor }]}>
              {boopSending ? 'Booping...' : boopQueued ? 'Queued' : boopSent ? 'Booped' : 'Boop'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.boopCount}>{boopCount}</Text>
          {Object.keys(postReactions).length > 0 ? (
            <View style={styles.reactionRow}>
              {Object.entries(postReactions).map(([emoji, count]) => (
                <TouchableOpacity
                  key={`${item.id}-${emoji}`}
                  style={[
                    styles.reactionChip,
                    postSelections[emoji] ? styles.reactionChipActive : null,
                  ]}
                  onPress={() => handleReaction({ type: 'post', id: item.id }, emoji)}
                >
                  <Text style={styles.reactionEmoji}>{emoji}</Text>
                  <Text
                    style={[
                      styles.reactionCount,
                      postSelections[emoji] ? styles.reactionCountActive : null,
                    ]}
                  >
                    {count}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  const renderCycleEvent = ({ item }: { item: CycleEventRow }) => {
    const isSelf = item.user_id === session?.userId;
    const name = isSelf ? 'You' : cycleNameMap[item.user_id] ?? `Friend ${shortId(item.user_id)}`;
    const timeLabel = formatTime(item.starts_at);
    const initials = name.trim().slice(0, 1).toUpperCase() || '?';
    const eventReactions = eventReactionCounts[item.id] ?? {};
    const eventSelections = eventReactionSelections[item.id] ?? {};
    const boopStatus = boopStatusByEvent[item.id] ?? 'idle';
    const queued = boopStatus === 'queued';
    const boopInFlight = boopLoadingByEvent[item.id];
    const boopSent = boopStatus === 'sent';
    const boopTextColor =
      boopInFlight || isSelf
        ? palette.secondaryText
        : boopSent
          ? palette.success
          : queued
          ? palette.pendingText
          : palette.accent;
    const boopCount = boopCountsByEvent[item.id] ?? 0;
    const phaseLabel = formatPhaseLabel(item.phase);
    const periodInfo = periodDayByEventId[item.id];
    const isPhaseTransition = item.event_type === 'phase_transition';
    const metaLabel = isPhaseTransition ? 'Phase change' : 'Cycle update';
    const eventIcon = isPhaseTransition
      ? 'pulse-outline'
      : item.event_type === 'menstrual_flow'
        ? 'water-outline'
        : 'calendar-outline';
    const phaseKey = item.phase ?? 'unknown';
    const pillLabel = isPhaseTransition
      ? phaseLabel
        ? `Entered ${phaseLabel}`
        : 'Phase update'
      : item.event_type === 'menstrual_flow'
        ? periodInfo
          ? `Period day ${periodInfo.day} of ${periodInfo.total}`
          : 'Menstrual flow'
        : formatEventType(item.event_type);
    const pillColors = isPhaseTransition
      ? {
          background: palette.mutedFill,
          text: phasePillPaletteText[phaseKey] ?? palette.secondaryText,
        }
      : item.event_type === 'menstrual_flow'
        ? {
            background: palette.mutedFill,
            text: phasePillPaletteText.menstruation,
          }
        : { background: palette.mutedFill, text: palette.secondaryText };
    const headerContent = (
      <>
        <View style={styles.headerLeft}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.postMeta}>
            <Text style={styles.postName}>{name}</Text>
            <Text style={styles.postMetaText}>{metaLabel}</Text>
          </View>
        </View>
        {timeLabel ? <Text style={styles.postTime}>{timeLabel}</Text> : null}
      </>
    );
    return (
      <TouchableOpacity
        style={styles.postCard}
        onLongPress={(event) => openReactionPicker({ type: 'cycle', id: item.id }, event)}
        onPress={() => handleEventPress(item.id)}
        activeOpacity={0.9}
      >
        <View style={styles.postHeader}>
          {isSelf ? (
            <View style={styles.postHeaderButton}>{headerContent}</View>
          ) : (
            <TouchableOpacity
              style={styles.postHeaderButton}
              onPress={() => navigateToFriendSync(item.user_id)}
              accessibilityLabel={`View sync with ${name}`}
            >
              {headerContent}
            </TouchableOpacity>
          )}
        </View>
        <View style={[styles.moodPill, { backgroundColor: pillColors.background }]}>
          <Ionicons name={eventIcon} size={12} color={pillColors.text} />
          <Text style={[styles.moodPillText, { color: pillColors.text }]}>{pillLabel}</Text>
        </View>
        <View style={styles.postActions}>
          <TouchableOpacity
            style={[
              styles.boopButton,
              queued ? styles.boopButtonQueued : null,
              boopSent ? styles.boopButtonSent : null,
            ]}
            onPress={() => handleEventBoop(item)}
            disabled={boopInFlight || queued || boopSent || isSelf}
          >
            <Ionicons
              name={boopSent ? 'checkmark' : 'hand-left-outline'}
              size={14}
              color={boopTextColor}
            />
            <Text style={[styles.boopText, { color: boopTextColor }]}>
              {boopInFlight ? 'Booping...' : queued ? 'Queued' : boopSent ? 'Booped' : 'Boop'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.boopCount}>{boopCount}</Text>
          {Object.keys(eventReactions).length > 0 ? (
            <View style={styles.reactionRow}>
              {Object.entries(eventReactions).map(([emoji, count]) => (
                <TouchableOpacity
                  key={`${item.id}-${emoji}`}
                  style={[
                    styles.reactionChip,
                    eventSelections[emoji] ? styles.reactionChipActive : null,
                  ]}
                  onPress={() =>
                    handleReaction({ type: 'cycle', id: item.id }, emoji)
                  }
                >
                  <Text style={styles.reactionEmoji}>{emoji}</Text>
                  <Text
                    style={[
                      styles.reactionCount,
                      eventSelections[emoji] ? styles.reactionCountActive : null,
                    ]}
                  >
                    {count}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={feedItems}
        keyExtractor={(item) => item.id}
        refreshing={isLoading}
        onRefresh={loadFeed}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.navRow}>
              <TouchableOpacity onPress={navigateToProfile} style={styles.profileButton}>
                <Ionicons
                  name="person-circle-outline"
                  size={30}
                  color={palette.primaryText}
                />
              </TouchableOpacity>
              <View style={styles.navActions}>
                <FriendSyncButton onPress={navigateToProfile} />
                <NotificationsBell count={unreadCount} onPress={() => setSheetVisible(true)} />
              </View>
            </View>
            <View style={styles.titleBlock}>
              <Text style={styles.title}>Today</Text>
              <Text style={styles.subtitle}>
                {todayLabel} · How are you feeling, {alias ?? 'there'}?
              </Text>
            </View>
            <View style={styles.cycleRow}>
              <View style={styles.cycleRowLeft}>
                <View
                  style={[
                    styles.cycleIconBadge,
                    { backgroundColor: cyclePhaseColors.background },
                  ]}
                >
                  <Ionicons
                    name="pulse-outline"
                    size={16}
                    color={cyclePhaseColors.text}
                  />
                </View>
                <View style={styles.cycleRowText}>
                  <Text style={styles.cycleRowLabel}>My cycle</Text>
                  <Text style={styles.cycleRowValue}>{cyclePhaseLabel}</Text>
                  <Text
                    style={[
                      styles.cycleRowMeta,
                      cycleMetaTone === 'stale' ? styles.cycleRowMetaStale : null,
                    ]}
                  >
                    {cycleDetailLabel}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.cycleLearnButton}
                onPress={navigateToProfile}
                accessibilityRole="button"
                accessibilityLabel="Learn more about your cycle"
              >
                <Text style={styles.cycleLearnButtonText}>Learn more</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.quickMoodCard}>
              <View style={[styles.sectionHeader, styles.quickMoodHeader]}>
                <Text style={styles.sectionTitle}>Quick moods</Text>
                <Text style={styles.sectionHint}>Tap to share</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.moodRow}
              >
                {MOOD_TAGS.map((label) => (
                  <TouchableOpacity
                    key={label}
                    style={styles.moodChip}
                    onPress={() => handleQuickTag(label)}
                    disabled={isPosting}
                  >
                    <View
                      style={[
                        styles.moodDot,
                        { backgroundColor: MOOD_TAG_MAP[label]?.dot ?? palette.tertiaryText },
                      ]}
                    />
                    <Text style={styles.moodChipText}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <View style={styles.composerCard}>
              <View style={styles.composerHeader}>
                <Text style={styles.sectionTitle}>Share an update</Text>
                <Ionicons name="create-outline" size={16} color={palette.accent} />
              </View>
              {!isComposerOpen ? (
                <TouchableOpacity
                  onPress={() => setComposerOpen(true)}
                  style={styles.composerCollapsed}
                  accessibilityLabel="Share how you're feeling"
                >
                  <View style={styles.composerCollapsedRow}>
                    <Text style={styles.composerPlaceholder}>I'm feeling...</Text>
                    <Ionicons name="chevron-forward" size={16} color={palette.tertiaryText} />
                  </View>
                </TouchableOpacity>
              ) : (
                <View style={styles.composerExpanded}>
                  <TextInput
                    style={styles.composerInput}
                    value={composerText}
                    onChangeText={setComposerText}
                    placeholder="I'm feeling..."
                    placeholderTextColor={palette.placeholder}
                    multiline
                    autoFocus
                    onBlur={() => {
                      if (!postPressRef.current) {
                        setComposerOpen(false);
                      }
                    }}
                  />
                </View>
              )}
              {composerMoods.length ? (
                <View style={styles.composerSelectedMoods}>
                  {composerMoods.map((label) => (
                    <View key={label} style={styles.selectedMoodChip}>
                      <View
                        style={[
                          styles.moodDot,
                          { backgroundColor: MOOD_TAG_MAP[label]?.dot ?? palette.tertiaryText },
                        ]}
                      />
                      <Text style={styles.selectedMoodChipText}>{label}</Text>
                      <TouchableOpacity
                        onPress={() => toggleComposerMood(label)}
                        style={styles.selectedMoodRemove}
                        accessibilityLabel={`Remove ${label}`}
                      >
                        <Ionicons name="close" size={12} color={palette.secondaryText} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              ) : null}
              <View style={styles.composerActions}>
                <TouchableOpacity
                  style={styles.addMoodButton}
                  onPress={openMoodModal}
                  accessibilityLabel="Add mood tags"
                >
                  <Ionicons name="pricetag-outline" size={16} color={palette.accent} />
                  <Text style={styles.addMoodButtonText}>
                    {composerMoods.length ? `Edit moods (${composerMoods.length})` : 'Add mood'}
                  </Text>
                </TouchableOpacity>
                {isComposerOpen ? (
                  <TouchableOpacity
                    style={[styles.postButton, isPosting ? styles.postButtonDisabled : null]}
                    onPress={handlePost}
                    onPressIn={() => {
                      postPressRef.current = true;
                    }}
                    onPressOut={() => {
                      postPressRef.current = false;
                    }}
                    disabled={isPosting}
                  >
                    <Ionicons
                      name={isPosting ? 'time-outline' : 'paper-plane'}
                      size={16}
                      color="#fff"
                    />
                    <Text
                      style={[
                        styles.postButtonText,
                        isPosting ? styles.postButtonTextDisabled : null,
                      ]}
                    >
                      {isPosting ? 'Posting...' : 'Share update'}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
            {isOffline ? (
              <View style={styles.offlineBanner}>
                <Text style={styles.offlineText}>Offline: posts will send when you're back online.</Text>
              </View>
            ) : null}
            {feedItems.length ? (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Latest updates</Text>
                <Text style={styles.sectionHint}>Double tap to react</Text>
              </View>
            ) : null}
          </View>
        }
        renderItem={({ item }) => {
          if (item.type === 'post') {
            return renderPost({ item: item.post });
          }
          return renderCycleEvent({ item: item.event });
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={28}
              color={palette.tertiaryText}
            />
            <Text style={styles.emptyTitle}>No updates yet</Text>
            <Text style={styles.emptySubtitle}>
              Share how you feel or sync your cycle to see updates here.
            </Text>
          </View>
        }
      />
      <NotificationsSheet
        visible={isSheetVisible}
        notifications={notifications}
        friendRequests={friendRequests}
        requestProfileMap={requestProfileMap}
        onRespondRequest={respondToFriendRequest}
        onClose={() => setSheetVisible(false)}
      />
      <Modal
        visible={Boolean(reactionTarget)}
        transparent
        animationType="fade"
        onRequestClose={closeReactionPicker}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalDismiss} onPress={closeReactionPicker} />
          <View
            style={[
              styles.reactionBar,
              {
                width: reactionBarLayout.barWidth,
                left: reactionBarLayout.left,
                top: reactionBarLayout.top,
              },
            ]}
          >
            {quickReactions.map((emoji, index) => {
              const isSelected = reactionTarget
                ? reactionTarget.type === 'post'
                  ? reactionSelections[reactionTarget.id]?.[emoji]
                  : eventReactionSelections[reactionTarget.id]?.[emoji]
                : false;
              return (
              <TouchableOpacity
                key={`${emoji}-${index}`}
                style={[
                  styles.reactionButton,
                  isSelected ? styles.reactionButtonActive : null,
                ]}
                onPress={() => handleEmojiPress(emoji)}
                accessibilityLabel={`React with ${emoji}`}
              >
                <Text style={styles.reactionButtonEmoji}>{emoji}</Text>
              </TouchableOpacity>
            );
            })}
            <TouchableOpacity
              style={[styles.reactionButton, styles.reactionMoreButton]}
              onPress={() => setReactionPickerExpanded(true)}
              accessibilityLabel="More reactions"
            >
              <Ionicons name="add" size={18} color="#111" />
            </TouchableOpacity>
          </View>
          {isReactionPickerExpanded ? (
            <View
              style={[
                styles.expandedSheet,
                {
                  width: expandedPanelLayout.panelWidth,
                  left: expandedPanelLayout.left,
                  top: expandedPanelLayout.top,
                },
              ]}
            >
              <View style={styles.expandedHeader}>
                <Text style={styles.expandedTitle}>More reactions</Text>
                <TouchableOpacity onPress={() => setReactionPickerExpanded(false)}>
                  <Text style={styles.expandedClose}>Done</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.expandedGrid}>
                {EXTENDED_REACTION_EMOJIS.map((emoji) => {
                  const isSelected = reactionTarget
                    ? reactionTarget.type === 'post'
                      ? reactionSelections[reactionTarget.id]?.[emoji]
                      : eventReactionSelections[reactionTarget.id]?.[emoji]
                    : false;
                  return (
                  <TouchableOpacity
                    key={emoji}
                    style={[
                      styles.expandedEmojiButton,
                      isSelected ? styles.reactionButtonActive : null,
                      {
                        width: expandedPanelLayout.cellSize,
                        height: expandedPanelLayout.cellSize,
                      },
                    ]}
                    onPress={() => handleEmojiPress(emoji)}
                    accessibilityLabel={`React with ${emoji}`}
                  >
                    <Text style={styles.expandedEmoji}>{emoji}</Text>
                  </TouchableOpacity>
                );
                })}
              </View>
            </View>
          ) : null}
        </View>
      </Modal>
      <Modal
        visible={isMoodModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeMoodModal}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalDismiss} onPress={closeMoodModal} />
          <View style={styles.moodModal}>
            <View style={styles.moodModalHeader}>
              <Text style={styles.moodModalTitle}>Select moods</Text>
              <TouchableOpacity onPress={closeMoodModal} accessibilityLabel="Close mood selector">
                <Text style={styles.moodModalDone}>Done</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.moodModalGrid}>
              {MOOD_TAGS.map((label) => {
                const isSelected = composerMoods.includes(label);
                return (
                  <TouchableOpacity
                    key={label}
                    style={[
                      styles.modalMoodChip,
                      isSelected ? styles.modalMoodChipSelected : null,
                    ]}
                    onPress={() => toggleComposerMood(label)}
                    accessibilityLabel={
                      isSelected ? `Remove ${label} mood tag` : `Select ${label} mood tag`
                    }
                  >
                    <View
                      style={[
                        styles.moodDot,
                        { backgroundColor: MOOD_TAG_MAP[label]?.dot ?? palette.tertiaryText },
                      ]}
                    />
                    <Text style={styles.modalMoodChipText}>{label}</Text>
                    {isSelected ? (
                      <Ionicons name="checkmark" size={14} color={palette.accent} />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            {composerMoods.length ? (
              <TouchableOpacity
                onPress={clearComposerMoods}
                style={styles.moodModalClear}
                accessibilityLabel="Clear selected moods"
              >
                <Text style={styles.moodModalClearText}>Clear all</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 36,
    gap: 18,
  },
  header: {
    gap: 16,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  profileButton: {
    padding: 4,
    borderRadius: 18,
    backgroundColor: palette.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.separator,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  titleBlock: {
    gap: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: palette.primaryText,
  },
  subtitle: {
    fontSize: 15,
    color: palette.secondaryText,
  },
  cycleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: palette.card,
    borderRadius: 16,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.separator,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  cycleRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  cycleIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cycleRowText: {
    flex: 1,
    gap: 2,
  },
  cycleRowLabel: {
    fontSize: 12,
    color: palette.tertiaryText,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  cycleRowValue: {
    fontSize: 16,
    fontWeight: '700',
    color: palette.primaryText,
    textTransform: 'capitalize',
  },
  cycleRowMeta: {
    fontSize: 12,
    color: palette.secondaryText,
  },
  cycleRowMetaStale: {
    color: palette.warningText,
  },
  cycleLearnButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: palette.accentSoft,
  },
  cycleLearnButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: palette.accent,
  },
  quickMoodCard: {
    backgroundColor: palette.card,
    borderRadius: 18,
    padding: 14,
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.separator,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  composerCard: {
    backgroundColor: palette.card,
    borderRadius: 18,
    padding: 14,
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.separator,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  composerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  composerCollapsed: {
    backgroundColor: palette.mutedFill,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  composerCollapsedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  composerPlaceholder: {
    fontSize: 15,
    color: palette.placeholder,
  },
  composerExpanded: {
    gap: 12,
  },
  composerInput: {
    fontSize: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    minHeight: 80,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.separator,
    backgroundColor: palette.mutedFill,
    color: palette.primaryText,
    textAlignVertical: 'top',
  },
  composerSelectedMoods: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectedMoodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: palette.mutedFill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.separator,
  },
  selectedMoodChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: palette.primaryText,
  },
  selectedMoodRemove: {
    padding: 4,
    borderRadius: 999,
    backgroundColor: palette.fill,
  },
  composerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  addMoodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.separator,
    backgroundColor: palette.mutedFill,
  },
  addMoodButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: palette.accent,
  },
  postButton: {
    alignItems: 'center',
    backgroundColor: palette.accent,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 40,
  },
  postButtonDisabled: {
    backgroundColor: palette.disabled,
  },
  postButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  postButtonTextDisabled: {
    color: palette.secondaryText,
  },
  quickMoodHeader: {
    marginTop: 6,
  },
  moodRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 4,
  },
  moodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: palette.mutedFill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.separator,
  },
  moodChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: palette.primaryText,
  },
  moodDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.primaryText,
  },
  sectionHint: {
    fontSize: 12,
    color: palette.tertiaryText,
  },
  offlineBanner: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: palette.warningBackground,
    alignSelf: 'flex-start',
  },
  offlineText: {
    fontSize: 12,
    color: palette.warningText,
    fontWeight: '600',
  },
  postCard: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.separator,
    backgroundColor: palette.card,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  postHeaderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flex: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: palette.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: palette.primaryText,
    fontWeight: '700',
    fontSize: 15,
  },
  postMeta: {
    flex: 1,
    gap: 2,
  },
  postName: {
    fontSize: 15,
    fontWeight: '600',
    color: palette.primaryText,
  },
  postMetaText: {
    fontSize: 12,
    color: palette.secondaryText,
  },
  postTime: {
    fontSize: 12,
    color: palette.tertiaryText,
  },
  moodPill: {
    alignSelf: 'flex-start',
    backgroundColor: palette.mutedFill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  moodPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  moodPillText: {
    fontSize: 12,
    color: palette.primaryText,
    fontWeight: '600',
  },
  moodDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  postBody: {
    fontSize: 15,
    color: palette.primaryText,
    lineHeight: 20,
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  boopButton: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 6,
    minHeight: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 999,
    backgroundColor: palette.mutedFill,
    gap: 6,
  },
  boopButtonQueued: {
    backgroundColor: palette.pendingBackground,
  },
  boopButtonSent: {
    backgroundColor: palette.successBackground,
  },
  boopText: {
    fontWeight: '600',
    fontSize: 12,
    lineHeight: 16,
  },
  boopCount: {
    fontSize: 12,
    color: palette.secondaryText,
    lineHeight: 16,
  },
  reactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  reactionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: palette.mutedFill,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minHeight: 26,
  },
  reactionChipActive: {
    backgroundColor: palette.accentSoft,
    borderColor: palette.accent,
    borderWidth: StyleSheet.hairlineWidth,
  },
  reactionEmoji: {
    fontSize: 12,
    lineHeight: 16,
  },
  reactionCount: {
    fontSize: 11,
    color: palette.secondaryText,
    lineHeight: 16,
  },
  reactionCountActive: {
    color: palette.accent,
  },
  emptyState: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: palette.card,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.separator,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: palette.primaryText,
  },
  emptySubtitle: {
    fontSize: 13,
    color: palette.secondaryText,
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDismiss: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  reactionBar: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: palette.card,
    borderRadius: 999,
    paddingHorizontal: REACTION_BAR_PADDING,
    paddingVertical: REACTION_BAR_PADDING,
    gap: REACTION_BUTTON_GAP,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.separator,
    zIndex: 2,
  },
  reactionButton: {
    width: REACTION_BUTTON_SIZE,
    height: REACTION_BUTTON_SIZE,
    borderRadius: 999,
    backgroundColor: palette.mutedFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionButtonActive: {
    backgroundColor: palette.accentSoft,
    borderColor: palette.accent,
    borderWidth: StyleSheet.hairlineWidth,
  },
  reactionButtonEmoji: {
    fontSize: 18,
  },
  reactionMoreButton: {
    backgroundColor: palette.fill,
  },
  expandedSheet: {
    position: 'absolute',
    backgroundColor: palette.card,
    borderRadius: 20,
    padding: EXPANDED_PANEL_PADDING,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    zIndex: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.separator,
  },
  expandedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expandedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.primaryText,
  },
  expandedClose: {
    fontSize: 13,
    fontWeight: '600',
    color: palette.accent,
  },
  expandedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    columnGap: EXPANDED_GRID_GAP,
    rowGap: EXPANDED_GRID_GAP,
  },
  expandedEmojiButton: {
    borderRadius: 14,
    backgroundColor: palette.mutedFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandedEmoji: {
    fontSize: 24,
  },
  moodModal: {
    width: '86%',
    maxWidth: 360,
    borderRadius: 20,
    backgroundColor: palette.card,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.separator,
  },
  moodModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  moodModalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: palette.primaryText,
  },
  moodModalDone: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.accent,
  },
  moodModalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  modalMoodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.separator,
    backgroundColor: palette.mutedFill,
    flexBasis: '48%',
  },
  modalMoodChipSelected: {
    borderColor: palette.accent,
    backgroundColor: palette.accentSoft,
  },
  modalMoodChipText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: palette.primaryText,
  },
  moodModalClear: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  moodModalClearText: {
    fontSize: 13,
    fontWeight: '600',
    color: palette.accent,
  },
});

export default HomeScreen;
