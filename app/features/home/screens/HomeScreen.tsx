import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  GestureResponderEvent,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNotifications } from '../../notifications/hooks/useNotifications';
import { createPost, deletePost, fetchPosts, type PostRow } from '../../../services/supabase/posts';
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
import { brand, brandType } from '../../../theme/brand';
import { CycleRing, PhaseAvatar, PhaseIndicator, getPhaseColor } from '../../../components/brand/CycleRing';
import { useStaggeredEntrance } from '../../../components/brand/useStaggeredEntrance';

const palette = {
  background: brand.colors.background,
  card: brand.colors.card,
  primaryText: brand.colors.primaryText,
  secondaryText: brand.colors.secondaryText,
  tertiaryText: brand.colors.tertiaryText,
  placeholder: '#C5BFB8',
  separator: brand.colors.separator,
  accent: brand.colors.accent,
  accentSoft: brand.colors.accentSoft,
  success: brand.colors.success,
  successBackground: brand.colors.successBackground,
  fill: brand.colors.fill,
  mutedFill: brand.colors.mutedFill,
  disabled: brand.colors.disabled,
  pendingText: brand.colors.pendingText,
  pendingBackground: brand.colors.pendingBackground,
  warningText: brand.colors.warningText,
  warningBackground: brand.colors.warningBackground,
  white: brand.colors.white,
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

const MOOD_EMOJI_MAP: Record<string, string> = {
  Recovering: '🌿',
  Amazing: '✨',
  'Rock Hard': '💪',
  Sad: '🌧',
  'Bloated af': '🫧',
  'One more day': '🕯',
  'Boop me': '🤝',
};

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
type FeedUserProfile = { name: string; avatarUrl: string | null };

const REACTION_BUTTON_SIZE = 32;
const REACTION_BUTTON_GAP = 6;
const REACTION_BAR_PADDING = 10;
const EXPANDED_GRID_COLUMNS = 6;
const EXPANDED_GRID_GAP = 10;
const EXPANDED_PANEL_PADDING = 12;
const EXPANDED_HEADER_HEIGHT = 28;

const HomeScreen = () => {
  const navigation = useNavigation();
  const {
    unreadCount,
    reload: reloadNotifications,
  } = useNotifications();
  const session = useSessionStore(selectSession);
  const alias = useSessionStore(selectAlias);
  const isOnline = useConnectionStore(selectIsOnline);
  const isOffline = !isOnline;
  const { snapshot, lastSyncedAt, isStale: isSnapshotStale } = useCycleSnapshot();
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [cycleEvents, setCycleEvents] = useState<CycleEventRow[]>([]);
  const [cycleNameMap, setCycleNameMap] = useState<Record<string, string>>({});
  const [userProfileMap, setUserProfileMap] = useState<Record<string, FeedUserProfile>>({});
  const [isLoading, setLoading] = useState(false);
  const [isRefreshing, setRefreshing] = useState(false);
  const [isComposerOpen, setComposerOpen] = useState(false);
  const [composerText, setComposerText] = useState('');
  const [isPosting, setPosting] = useState(false);
  const [composerMoods, setComposerMoods] = useState<string[]>([]);
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
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [likedEvents, setLikedEvents] = useState<Set<string>>(new Set());
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
    // Single-select: a post only ever displays one mood, so picking a mood
    // replaces any previous choice (tapping the selected one clears it).
    setComposerMoods((prev) => (prev.includes(label) ? [] : [label]));
  }, []);

  const clearComposerMoods = useCallback(() => {
    setComposerMoods([]);
  }, []);

  const toggleLikedPost = useCallback((postId: string) => {
    setLikedPosts((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });
  }, []);

  const toggleLikedEvent = useCallback((eventId: string) => {
    setLikedEvents((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
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
    // Open the single "You" (Profile) tab. Previously this pushed a separate
    // `HomeProfile` instance of ProfileScreen inside the Home stack, so the
    // cycle card and the You tab showed two different copies of the same page.
    (navigation as any).navigate('Profile');
  };

  const navigateToFriendSync = useCallback(
    (friendUserId: string) => {
      (navigation as any).navigate('FriendSync', { friendId: friendUserId });
    },
    [navigation],
  );

  const loadFeed = useCallback(async () => {
    setLoading(true);

    // The posts branch and the cycle-events branch are independent, and within
    // each branch the reactions and boops reads only depend on the row ids —
    // so they all run concurrently instead of as a serial await-waterfall.
    const loadPostsBranch = async (): Promise<PostRow[]> => {
      try {
        const data = await fetchPosts();
        setPosts(data);
        const ids = data.map((post) => post.id);
        await Promise.all([
          (async () => {
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
          })(),
          (async () => {
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
          })(),
        ]);
        return data;
      } catch (error) {
        console.warn('[home] Failed to load posts', error);
        setPosts([]);
        setReactionCounts({});
        setReactionSelections({});
        setBoopCounts({});
        return [];
      }
    };

    const loadEventsBranch = async (): Promise<CycleEventRow[]> => {
      try {
        const events = await fetchCycleEvents();
        setCycleEvents(events);
        const eventIds = events.map((event) => event.id);
        if (eventIds.length) {
          await Promise.all([
            (async () => {
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
            })(),
            (async () => {
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
            })(),
          ]);
        } else {
          setEventReactionCounts({});
          setEventReactionSelections({});
          setBoopCountsByEvent({});
        }
        return events;
      } catch (error) {
        console.warn('[home] Failed to load cycle events', error);
        setCycleEvents([]);
        setCycleNameMap({});
        setEventReactionCounts({});
        setEventReactionSelections({});
        setBoopCountsByEvent({});
        return [];
      }
    };

    const [postRows, eventRows] = await Promise.all([loadPostsBranch(), loadEventsBranch()]);

    const profileIds = Array.from(
        new Set(
          [...postRows.map((row) => row.user_id), ...eventRows.map((row) => row.user_id), session?.userId]
            .filter((id): id is string => Boolean(id)),
        ),
      );
      if (profileIds.length) {
        try {
          const profiles = await fetchUserProfilesByIds(profileIds);
          const nextProfiles: Record<string, FeedUserProfile> = {};
          const nextNames: Record<string, string> = {};
          profiles.forEach((profile) => {
            const name =
              profile.full_name?.trim() ||
              profile.alias?.trim() ||
              profile.email?.trim() ||
              `Friend ${profile.id.slice(0, 4)}...${profile.id.slice(-4)}`;
            nextProfiles[profile.id] = {
              name,
              avatarUrl: profile.avatar_url ?? null,
            };
            nextNames[profile.id] = name;
          });
          setUserProfileMap(nextProfiles);
          setCycleNameMap(nextNames);
        } catch (error) {
          console.warn('[home] Failed to load user profiles', error);
          setUserProfileMap({});
          setCycleNameMap({});
        }
      } else {
        setUserProfileMap({});
        setCycleNameMap({});
      }
    setLoading(false);
  }, [session?.userId]);

  // Refetch the feed + notifications whenever the tab regains focus, and
  // keep it fresh with a silent poll every 60s while the screen is open.
  useFocusEffect(
    useCallback(() => {
      loadFeed();
      reloadNotifications();
      const intervalId = setInterval(() => {
        loadFeed();
        reloadNotifications();
      }, 60000);
      return () => clearInterval(intervalId);
    }, [loadFeed, reloadNotifications]),
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadFeed(), reloadNotifications()]);
    } catch (error) {
      console.warn('[home] Pull-to-refresh failed', error);
    } finally {
      setRefreshing(false);
    }
  }, [loadFeed, reloadNotifications]);

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

  const handleDeletePost = useCallback((post: PostRow) => {
    if (post.user_id !== session?.userId) {
      return;
    }
    Alert.alert('Delete post', 'This permanently removes your post. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          // Optimistically drop it; restore on failure.
          const previous = post;
          setPosts((prev) => prev.filter((item) => item.id !== post.id));
          try {
            await deletePost(post.id);
          } catch (error) {
            console.warn('[home] Failed to delete post', error);
            setPosts((prev) => [previous, ...prev].sort((a, b) => b.created_at.localeCompare(a.created_at)));
            Alert.alert('Could not delete post', 'Please try again.');
          }
        },
      },
    ]);
  }, [session?.userId]);

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
        // Double-tap always likes and never un-likes; skip if already reacted
        // with the default emoji (handleReaction toggles, so calling it on an
        // already-liked item would remove the like).
        if (defaultEmoji && !reactionSelections[postId]?.[defaultEmoji]) {
          handleReaction({ type: 'post', id: postId }, defaultEmoji);
        }
        return;
      }
      lastTapRef.current = result.nextState;
    },
    [handleReaction, quickReactions, reactionSelections],
  );

  const handleEventPress = useCallback(
    (eventId: string) => {
      const now = Date.now();
      const targetId = `cycle-${eventId}`;
      const result = getDoubleTapResult(lastTapRef.current, targetId, now);
      if (result.isDoubleTap) {
        lastTapRef.current = result.nextState;
        const defaultEmoji = quickReactions[0];
        // Double-tap always likes and never un-likes (see handlePostPress).
        if (defaultEmoji && !eventReactionSelections[eventId]?.[defaultEmoji]) {
          handleReaction({ type: 'cycle', id: eventId }, defaultEmoji);
        }
        return;
      }
      lastTapRef.current = result.nextState;
    },
    [handleReaction, quickReactions, eventReactionSelections],
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

  const formatPhaseSourceLabel = (value?: string | null) => {
    if (value === 'estimated') {
      return 'Estimated';
    }
    return null;
  };

  const cyclePhaseKey = snapshot?.currentPhase ?? 'unknown';
  const quickMoodActiveColor = useMemo(() => getPhaseColor(cyclePhaseKey), [cyclePhaseKey]);
  const cyclePhaseLabel = useMemo(
    () => formatPhaseLabel(snapshot?.currentPhase) ?? 'Unknown phase',
    [snapshot?.currentPhase],
  );
  const cyclePhaseSourceLabel = useMemo(
    () => formatPhaseSourceLabel(snapshot?.phaseSource ?? null),
    [snapshot?.phaseSource],
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
        type: 'post' as const,
        id: `post-${post.id}`,
        sortKey: toSortKey(post.created_at),
        post,
      })),
      ...cycleEvents.map((event) => ({
        type: 'cycle' as const,
        id: `cycle-${event.id}`,
        sortKey: toSortKey(event.starts_at),
        event,
      })),
    ];
    return merged.sort((a, b) => b.sortKey - a.sortKey);
  }, [posts, cycleEvents]);

  const cycleDayNumber = useMemo(() => {
    const latest = snapshot?.latestSampleStart;
    if (!latest) {
      return null;
    }
    const latestDate = new Date(latest);
    if (Number.isNaN(latestDate.getTime())) {
      return null;
    }
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfLatest = new Date(
      latestDate.getFullYear(),
      latestDate.getMonth(),
      latestDate.getDate(),
    ).getTime();
    const elapsedDays = Math.max(0, Math.floor((startOfToday - startOfLatest) / (24 * 60 * 60 * 1000)));
    const cycleLength = snapshot?.cycleLengthDays ?? 28;
    return ((elapsedDays % cycleLength) + 1);
  }, [snapshot?.cycleLengthDays, snapshot?.latestSampleStart]);
  const entranceStyles = useStaggeredEntrance(4, {
    initialDelay: 40,
    stagger: 80,
    distance: 14,
  });

  const openReactionPickerAtCenter = useCallback((target: ReactionTarget) => {
    const { width, height } = Dimensions.get('window');
    setReactionTarget(target);
    setReactionPickerExpanded(false);
    setReactionAnchor({ x: width / 2, y: height * 0.62 });
  }, []);

  const renderReactions = useCallback(
    (
      target: ReactionTarget,
      reactions: Record<string, number>,
      selections: Record<string, boolean>,
    ) => {
      const entries = Object.entries(reactions).sort((a, b) => b[1] - a[1]);
      const visible = entries.slice(0, 3);
      const hidden = Math.max(0, entries.length - visible.length);

      return (
        <View style={styles.reactionInlineRow}>
          {visible.map(([emoji, count]) => (
            <TouchableOpacity
              key={`${target.id}-${emoji}`}
              style={[
                styles.reactionChip,
                selections[emoji] ? styles.reactionChipActive : null,
              ]}
              onPress={() => handleReaction(target, emoji)}
            >
              <Text style={styles.reactionEmoji}>{emoji}</Text>
              <Text
                style={[
                  styles.reactionCount,
                  selections[emoji] ? styles.reactionCountActive : null,
                ]}
              >
                {count}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.reactionMoreChip}
            onPress={() => openReactionPickerAtCenter(target)}
            accessibilityLabel="More reactions"
          >
            {hidden > 0 ? (
              <Text style={styles.reactionMoreText}>+{hidden}</Text>
            ) : (
              <Ionicons name="add" size={14} color={palette.secondaryText} />
            )}
          </TouchableOpacity>
        </View>
      );
    },
    [handleReaction, openReactionPickerAtCenter],
  );

  const renderPost = ({ item }: { item: PostRow }) => {
    const isSelf = item.user_id === session?.userId;
    const profile = userProfileMap[item.user_id];
    const name = isSelf ? 'You' : profile?.name ?? item.alias ?? 'Anonymous';
    const initials = (item.alias ?? name).slice(0, 1).toUpperCase();
    const avatarUrl = profile?.avatarUrl ?? null;
    const timeLabel = formatTime(item.created_at);
    const moodTags = parseMoodTags(item.mood_tag);
    const boopCount = boopCounts[item.id] ?? 0;
    const boopStatus = boopStatusByPost[item.id] ?? 'idle';
    const boopSent = boopStatus === 'sent';
    const boopQueued = boopStatus === 'queued';
    const boopSending = boopStatus === 'sending';
    const boopTextColor = isSelf
      ? palette.disabled
      : boopSending
        ? palette.secondaryText
        : boopSent
          ? palette.success
          : boopQueued
            ? palette.pendingText
            : palette.accent;
    const postReactions = reactionCounts[item.id] ?? {};
    const postSelections = reactionSelections[item.id] ?? {};
    const reactionTotal = Object.values(postReactions).reduce((sum, value) => sum + value, 0);
    const isLiked = likedPosts.has(item.id);
    const likeCount = reactionTotal + (isLiked ? 1 : 0);
    const avatarPhase = isSelf ? cyclePhaseKey : 'unknown';
    const moodLabel = moodTags.length ? moodTags[0] : 'Cycle update';

    return (
      <TouchableOpacity
        style={styles.feedCard}
        onLongPress={(event) => openReactionPicker({ type: 'post', id: item.id }, event)}
        onPress={() => handlePostPress(item.id)}
        activeOpacity={0.93}
      >
        <View style={styles.feedHeaderRow}>
          <View style={styles.feedHeaderLeft}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.feedAvatarImage} />
            ) : (
              <PhaseAvatar initial={initials} phase={avatarPhase} size={40} />
            )}
            <View style={styles.feedMeta}>
              <Text style={styles.feedName}>{name}</Text>
              <Text style={styles.feedSubline}>{moodLabel}</Text>
            </View>
          </View>
          <View style={styles.feedHeaderRight}>
            {timeLabel ? <Text style={styles.feedTime}>{timeLabel}</Text> : null}
            {isSelf ? (
              <TouchableOpacity
                style={styles.feedDeleteButton}
                onPress={() => handleDeletePost(item)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Delete post"
              >
                <Ionicons name="trash-outline" size={15} color={palette.tertiaryText} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {item.body ? <Text style={styles.feedBody}>{item.body}</Text> : null}

        <View style={styles.feedActionsRow}>
          <View style={styles.feedReactionsWrap}>
            {renderReactions({ type: 'post', id: item.id }, postReactions, postSelections)}
          </View>
          <View style={styles.feedIconActions}>
            <TouchableOpacity
              style={styles.feedIconButton}
              onPress={() => toggleLikedPost(item.id)}
              disabled={isSelf}
              accessibilityLabel="Toggle like"
            >
              <Ionicons
                name={isLiked ? 'heart' : 'heart-outline'}
                size={15}
                color={isSelf ? palette.disabled : isLiked ? palette.accent : palette.tertiaryText}
              />
              <Text
                style={[
                  styles.feedIconCount,
                  isSelf ? { color: palette.disabled } : isLiked ? { color: palette.accent } : null,
                ]}
              >
                {likeCount}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.feedIconButton}
              onPress={() => handleBoop(item)}
              disabled={boopSending || boopQueued || boopSent || isSelf}
              accessibilityLabel="Boop post"
            >
              <Ionicons
                name={boopSent ? 'checkmark-circle' : 'hand-left-outline'}
                size={15}
                color={boopTextColor}
              />
              <Text style={[styles.feedIconCount, { color: boopTextColor }]}>{boopCount}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderCycleEvent = ({ item }: { item: CycleEventRow }) => {
    const isSelf = item.user_id === session?.userId;
    const profile = userProfileMap[item.user_id];
    const name =
      isSelf ? 'You' : profile?.name ?? cycleNameMap[item.user_id] ?? `Friend ${shortId(item.user_id)}`;
    const initials = name.trim().slice(0, 1).toUpperCase() || '?';
    const avatarUrl = profile?.avatarUrl ?? null;
    const timeLabel = formatTime(item.starts_at);
    const eventReactions = eventReactionCounts[item.id] ?? {};
    const eventSelections = eventReactionSelections[item.id] ?? {};
    const boopStatus = boopStatusByEvent[item.id] ?? 'idle';
    const queued = boopStatus === 'queued';
    const boopSent = boopStatus === 'sent';
    const boopLoading = boopLoadingByEvent[item.id];
    const boopCount = boopCountsByEvent[item.id] ?? 0;
    const boopTextColor = isSelf
      ? palette.disabled
      : boopLoading
        ? palette.secondaryText
        : boopSent
          ? palette.success
          : queued
            ? palette.pendingText
            : palette.accent;

    const phaseLabel = formatPhaseLabel(item.phase);
    const periodInfo = periodDayByEventId[item.id];
    const isPhaseTransition = item.event_type === 'phase_transition';
    const pillLabel = isPhaseTransition
      ? phaseLabel
        ? `Entered ${phaseLabel}`
        : 'Phase change'
      : item.event_type === 'menstrual_flow'
        ? periodInfo
          ? `Period day ${periodInfo.day} of ${periodInfo.total}`
          : 'Menstrual flow'
        : formatEventType(item.event_type);
    const eventText = pillLabel;
    const eventToneColor =
      item.event_type === 'menstrual_flow'
        ? '#C4654A'
        : item.event_type === 'ovulation_detected'
          ? '#D4A252'
          : getPhaseColor(item.phase);
    const eventIcon: keyof typeof Ionicons.glyphMap =
      item.event_type === 'menstrual_flow'
        ? 'water-outline'
        : item.event_type === 'ovulation_detected'
          ? 'sunny-outline'
          : item.event_type === 'phase_transition'
            ? 'pulse-outline'
            : 'sparkles-outline';
    const isLiked = likedEvents.has(item.id);
    const reactionTotal = Object.values(eventReactions).reduce((sum, value) => sum + value, 0);
    const likeCount = reactionTotal + (isLiked ? 1 : 0);

    return (
      <TouchableOpacity
        style={styles.feedCard}
        onLongPress={(event) => openReactionPicker({ type: 'cycle', id: item.id }, event)}
        onPress={() => handleEventPress(item.id)}
        activeOpacity={0.93}
      >
        <View style={styles.feedHeaderRow}>
          <View style={styles.feedHeaderLeft}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.feedAvatarImage} />
            ) : (
              <PhaseAvatar initial={initials} phase={item.phase} size={40} />
            )}
            <View style={styles.feedMeta}>
              <Text style={styles.feedName}>{name}</Text>
              <Text style={styles.feedSubline}>{phaseLabel ? `${phaseLabel} phase` : 'Cycle update'}</Text>
            </View>
          </View>
          {timeLabel ? <Text style={styles.feedTime}>{timeLabel}</Text> : null}
        </View>

        <View style={[styles.eventPill, { backgroundColor: `${eventToneColor}14` }]}>
          <Ionicons name={eventIcon} size={12} color={eventToneColor} />
          <Text style={[styles.eventPillText, { color: eventToneColor }]}>{eventText}</Text>
        </View>

        <View style={styles.feedActionsRow}>
          <View style={styles.feedReactionsWrap}>
            {renderReactions({ type: 'cycle', id: item.id }, eventReactions, eventSelections)}
          </View>
          <View style={styles.feedIconActions}>
            <TouchableOpacity
              style={styles.feedIconButton}
              onPress={() => toggleLikedEvent(item.id)}
              disabled={isSelf}
              accessibilityLabel="Toggle like"
            >
              <Ionicons
                name={isLiked ? 'heart' : 'heart-outline'}
                size={15}
                color={isSelf ? palette.disabled : isLiked ? palette.accent : palette.tertiaryText}
              />
              <Text
                style={[
                  styles.feedIconCount,
                  isSelf ? { color: palette.disabled } : isLiked ? { color: palette.accent } : null,
                ]}
              >
                {likeCount}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.feedIconButton}
              onPress={() => handleEventBoop(item)}
              disabled={boopLoading || queued || boopSent || isSelf}
              accessibilityLabel="Boop cycle event"
            >
              <Ionicons
                name={boopSent ? 'checkmark-circle' : 'hand-left-outline'}
                size={15}
                color={boopTextColor}
              />
              <Text style={[styles.feedIconCount, { color: boopTextColor }]}>{boopCount}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={feedItems}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="never"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={palette.accent}
            colors={[palette.accent]}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Animated.View style={entranceStyles[0]}>
              <View style={styles.headerTopRow}>
                <View style={styles.titleBlock}>
                  <Text style={styles.dateEyebrow}>{todayLabel}</Text>
                  <Text style={styles.title}>Hey, {alias ?? 'there'}</Text>
                </View>
                <TouchableOpacity
                  style={styles.bellButton}
                  onPress={() => (navigation as any).navigate('Notifications')}
                  accessibilityLabel="Open notifications"
                >
                  <Ionicons name="notifications-outline" size={18} color={palette.secondaryText} />
                  {unreadCount > 0 ? <View style={styles.bellDot} /> : null}
                </TouchableOpacity>
              </View>
            </Animated.View>

            <Animated.View style={entranceStyles[1]}>
              <TouchableOpacity
                style={styles.cycleCard}
                onPress={navigateToProfile}
                accessibilityLabel="Open your profile"
                activeOpacity={0.95}
              >
                <View style={styles.cycleRingWrap}>
                  <CycleRing
                    currentDay={cycleDayNumber ?? 1}
                    currentPhase={cyclePhaseKey}
                    size={72}
                    strokeWidth={6}
                    showCenter={false}
                  />
                </View>
                <View style={styles.cycleMeta}>
                  <Text style={styles.cycleDayLabel}>Day {cycleDayNumber ?? '--'}</Text>
                  <PhaseIndicator phase={cyclePhaseKey} />
                  <Text style={styles.cycleDetail}>{cycleDetailLabel}</Text>
                </View>
              </TouchableOpacity>
            </Animated.View>

            <Animated.View style={entranceStyles[2]}>
              <View style={styles.shareCard}>
                <View style={styles.shareInputRow}>
                  <TextInput
                    style={styles.shareInput}
                    value={composerText}
                    onChangeText={setComposerText}
                    placeholder="What's on your mind..."
                    placeholderTextColor={palette.placeholder}
                    returnKeyType="done"
                    onFocus={() => setComposerOpen(true)}
                  />
                  <TouchableOpacity
                    style={[styles.sendButton, isPosting ? styles.sendButtonDisabled : null]}
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
                      size={14}
                      color={isPosting ? palette.secondaryText : palette.white}
                    />
                  </TouchableOpacity>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyboardShouldPersistTaps="always"
                  contentContainerStyle={styles.quickMoodRow}
                >
                  {MOOD_TAGS.map((label) => {
                    const selected = composerMoods.includes(label);
                    return (
                      <TouchableOpacity
                        key={label}
                        style={[
                          styles.quickMoodChip,
                          selected
                            ? {
                                backgroundColor: `${quickMoodActiveColor}15`,
                                borderColor: 'transparent',
                              }
                            : null,
                        ]}
                        onPress={() => toggleComposerMood(label)}
                      >
                        <Text
                          style={[
                            styles.quickMoodText,
                            selected ? { color: quickMoodActiveColor } : null,
                          ]}
                          numberOfLines={1}
                        >
                          {`${MOOD_EMOJI_MAP[label] ?? ''} ${label}`.trim()}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </Animated.View>

            {isOffline ? (
              <View style={styles.offlineBanner}>
                <Text style={styles.offlineText}>Offline: posts will send when you&apos;re back online.</Text>
              </View>
            ) : null}

            <Animated.View style={entranceStyles[3]}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Updates</Text>
                <Text style={styles.sectionHint}>Long press to react</Text>
              </View>
            </Animated.View>
          </View>
        }
        renderItem={({ item }) => {
          if (item.type === 'post') {
            return renderPost({ item: item.post });
          }
          return renderCycleEvent({ item: item.event });
        }}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator color={palette.accent} />
              <Text style={styles.emptySubtitle}>Loading your circle feed…</Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No updates yet</Text>
              <Text style={styles.emptySubtitle}>Share how you feel to start your circle feed.</Text>
            </View>
          )
        }
      />


      <Modal
        visible={Boolean(reactionTarget)}
        transparent
        animationType="fade"
        onRequestClose={closeReactionPicker}
      >
        <View style={styles.overlayCenter}>
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
                  style={[styles.reactionButton, isSelected ? styles.reactionButtonActive : null]}
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
              <Ionicons name="add" size={18} color={palette.secondaryText} />
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
    paddingBottom: 120,
  },
  header: {
    marginBottom: 14,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  titleBlock: {
    gap: 3,
  },
  dateEyebrow: {
    fontSize: 11,
    color: palette.secondaryText,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    ...brandType.semibold,
  },
  title: {
    fontSize: 30,
    color: palette.primaryText,
    ...brandType.display,
  },
  bellButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.separator,
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...brand.shadow.soft,
  },
  bellDot: {
    position: 'absolute',
    top: 11,
    right: 11,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: palette.accent,
  },
  cycleCard: {
    backgroundColor: palette.white,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: palette.separator,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
    ...brand.shadow.card,
  },
  cycleRingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cycleRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cycleRingInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cycleRingDay: {
    fontSize: 22,
    color: palette.primaryText,
    ...brandType.display,
  },
  cycleRingDot: {
    position: 'absolute',
    top: -3,
    right: 12,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    borderWidth: 2,
    borderColor: palette.white,
  },
  cycleMeta: {
    flex: 1,
    gap: 6,
  },
  cycleDayLabel: {
    fontSize: 26,
    color: palette.primaryText,
    ...brandType.display,
  },
  phaseIndicator: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  phaseIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  phaseIndicatorText: {
    fontSize: 12,
    ...brandType.semibold,
  },
  cycleDetail: {
    fontSize: 12,
    color: palette.secondaryText,
    ...brandType.body,
  },
  shareCard: {
    backgroundColor: palette.white,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: palette.separator,
    padding: 14,
    marginBottom: 14,
    ...brand.shadow.card,
  },
  shareInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  shareInput: {
    flex: 1,
    minHeight: 42,
    borderRadius: 16,
    backgroundColor: palette.mutedFill,
    paddingHorizontal: 13,
    paddingVertical: 10,
    fontSize: 14,
    color: palette.primaryText,
    ...brandType.body,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: palette.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: palette.fill,
  },
  quickMoodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 4,
  },
  quickMoodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: palette.mutedFill,
    borderWidth: 0,
    maxWidth: 160,
  },
  quickMoodText: {
    fontSize: 12,
    color: palette.secondaryText,
    flexShrink: 1,
    ...brandType.semibold,
  },
  quickMoodMoreChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 999,
    width: 72,
    paddingVertical: 6,
    backgroundColor: palette.mutedFill,
    borderWidth: 0,
    flexShrink: 0,
  },
  quickMoodMoreText: {
    fontSize: 12,
    color: palette.secondaryText,
    ...brandType.semibold,
  },
  offlineBanner: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: palette.warningBackground,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  offlineText: {
    fontSize: 12,
    color: palette.warningText,
    ...brandType.semibold,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 20,
    color: palette.primaryText,
    ...brandType.heading,
  },
  sectionHint: {
    fontSize: 11,
    color: palette.tertiaryText,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    ...brandType.semibold,
  },
  feedCard: {
    backgroundColor: palette.white,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: palette.separator,
    padding: 14,
    marginBottom: 10,
    ...brand.shadow.soft,
  },
  feedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 8,
  },
  feedHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  feedHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  feedDeleteButton: {
    padding: 2,
  },
  feedAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: palette.fill,
  },
  feedAvatarText: {
    fontSize: 15,
    color: palette.primaryText,
    ...brandType.semibold,
  },
  feedMeta: {
    flex: 1,
    gap: 2,
  },
  feedName: {
    fontSize: 14,
    color: palette.primaryText,
    ...brandType.semibold,
  },
  feedSubline: {
    fontSize: 11,
    color: palette.secondaryText,
    ...brandType.body,
  },
  feedTime: {
    fontSize: 11,
    color: palette.tertiaryText,
    ...brandType.body,
  },
  feedBody: {
    fontSize: 13,
    lineHeight: 19,
    color: '#5A564F',
    marginBottom: 8,
    ...brandType.body,
  },
  eventPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 9,
  },
  eventPillText: {
    fontSize: 12,
    ...brandType.semibold,
  },
  moodPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  moodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    backgroundColor: palette.mutedFill,
  },
  moodPillText: {
    fontSize: 11,
    color: palette.secondaryText,
    ...brandType.semibold,
  },
  feedActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  feedReactionsWrap: {
    flex: 1,
  },
  feedIconActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  feedIconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  feedIconCount: {
    fontSize: 12,
    color: palette.tertiaryText,
    ...brandType.semibold,
  },
  reactionInlineRow: {
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
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: palette.separator,
  },
  reactionChipActive: {
    backgroundColor: palette.accentSoft,
    borderColor: palette.accent,
  },
  reactionEmoji: {
    fontSize: 12,
  },
  reactionCount: {
    fontSize: 11,
    color: palette.secondaryText,
    ...brandType.semibold,
  },
  reactionCountActive: {
    color: palette.accent,
  },
  reactionMoreChip: {
    minWidth: 28,
    height: 28,
    borderRadius: 999,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.mutedFill,
    borderWidth: 1,
    borderColor: palette.separator,
  },
  reactionMoreText: {
    fontSize: 11,
    color: palette.secondaryText,
    ...brandType.semibold,
  },
  emptyState: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: palette.separator,
    backgroundColor: palette.white,
    padding: 18,
    alignItems: 'center',
    gap: 5,
    ...brand.shadow.soft,
  },
  emptyTitle: {
    fontSize: 16,
    color: palette.primaryText,
    ...brandType.heading,
  },
  emptySubtitle: {
    fontSize: 13,
    color: palette.secondaryText,
    textAlign: 'center',
    ...brandType.body,
  },
  overlayCenter: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    justifyContent: 'flex-end',
  },
  modalDismiss: {
    ...StyleSheet.absoluteFillObject,
  },
  reactionBar: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: palette.white,
    borderRadius: 999,
    paddingHorizontal: REACTION_BAR_PADDING,
    paddingVertical: REACTION_BAR_PADDING,
    gap: REACTION_BUTTON_GAP,
    shadowColor: '#000',
    shadowOpacity: 0.13,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    borderWidth: 1,
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
    borderWidth: 1,
  },
  reactionButtonEmoji: {
    fontSize: 18,
  },
  reactionMoreButton: {
    backgroundColor: palette.fill,
  },
  expandedSheet: {
    position: 'absolute',
    backgroundColor: palette.white,
    borderRadius: 20,
    padding: EXPANDED_PANEL_PADDING,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    borderWidth: 1,
    borderColor: palette.separator,
    zIndex: 2,
  },
  expandedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  expandedTitle: {
    fontSize: 14,
    color: palette.primaryText,
    ...brandType.heading,
  },
  expandedClose: {
    fontSize: 13,
    color: palette.accent,
    ...brandType.semibold,
  },
  expandedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
  moodSheet: {
    width: '100%',
    backgroundColor: palette.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 26,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.fill,
    alignSelf: 'center',
    marginBottom: 12,
  },
  moodSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  moodSheetTitle: {
    fontSize: 20,
    color: palette.primaryText,
    ...brandType.heading,
  },
  moodSheetDone: {
    fontSize: 14,
    color: palette.accent,
    ...brandType.semibold,
  },
  moodSheetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sheetMoodChip: {
    width: '48%',
    borderRadius: 16,
    backgroundColor: palette.mutedFill,
    borderWidth: 0,
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sheetMoodChipSelected: {
    borderWidth: 1.5,
    borderColor: palette.accent,
    backgroundColor: palette.accentSoft,
  },
  sheetMoodEmoji: {
    fontSize: 18,
    lineHeight: 20,
  },
  sheetMoodText: {
    fontSize: 13,
    color: '#5A564F',
    ...brandType.semibold,
  },
  sheetMoodTextSelected: {
    color: palette.accent,
  },
  clearMoodButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  clearMoodButtonText: {
    fontSize: 13,
    color: palette.accent,
    ...brandType.semibold,
  },
});

export default HomeScreen;
