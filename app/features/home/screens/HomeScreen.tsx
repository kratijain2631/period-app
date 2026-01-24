import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  GestureResponderEvent,
  Modal,
  Pressable,
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
import {
  addPostReaction,
  fetchPostReactions,
  removePostReaction,
} from '../../../services/supabase/postReactions';
import { fetchPostBoops, sendBoop } from '../../../services/supabase/boops';
import { selectIsOnline, useConnectionStore } from '../../../state/connectionStore';
import { selectAlias, selectSession, useSessionStore } from '../../../state/sessionStore';
import { getDoubleTapResult } from '../utils/reactionDoubleTap';

const MOOD_TAGS = [
  { label: 'Recovering', color: '#C98B2B', text: '#fff' },
  { label: 'Amazing', color: '#4CAF50', text: '#fff' },
  { label: 'Rock Hard', color: '#1565C0', text: '#fff' },
  { label: 'Sad', color: '#C0392B', text: '#fff' },
  { label: 'Bloated af', color: '#B03A2E', text: '#fff' },
  { label: 'One more day', color: '#C98B2B', text: '#fff' },
  { label: 'Boop me', color: '#F39C12', text: '#fff' },
];

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

const REACTION_BUTTON_SIZE = 32;
const REACTION_BUTTON_GAP = 6;
const REACTION_BAR_PADDING = 10;
const EXPANDED_GRID_COLUMNS = 6;
const EXPANDED_GRID_GAP = 10;
const EXPANDED_PANEL_PADDING = 12;
const EXPANDED_HEADER_HEIGHT = 28;

const HomeScreen = () => {
  const navigation = useNavigation();
  const { notifications, unreadCount } = useNotifications();
  const session = useSessionStore(selectSession);
  const alias = useSessionStore(selectAlias);
  const isOnline = useConnectionStore(selectIsOnline);
  const isOffline = !isOnline;
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [isLoading, setLoading] = useState(false);
  const [isSheetVisible, setSheetVisible] = useState(false);
  const [isComposerOpen, setComposerOpen] = useState(false);
  const [composerText, setComposerText] = useState('');
  const [isPosting, setPosting] = useState(false);
  const [reactionModalPostId, setReactionModalPostId] = useState<string | null>(null);
  const [isReactionPickerExpanded, setReactionPickerExpanded] = useState(false);
  const [reactionAnchor, setReactionAnchor] = useState<{ x: number; y: number } | null>(null);
  const [reactionCounts, setReactionCounts] = useState<ReactionMap>({});
  const [reactionSelections, setReactionSelections] = useState<ReactionSelectionMap>({});
  const [quickReactions, setQuickReactions] = useState<string[]>(QUICK_REACTION_EMOJIS);
  const [boopCounts, setBoopCounts] = useState<Record<string, number>>({});
  const [boopStatusByPost, setBoopStatusByPost] = useState<Record<string, BoopStatus>>({});
  const postPressRef = useRef(false);
  const lastTapRef = useRef<{ postId: string | null; timestamp: number | null }>({
    postId: null,
    timestamp: null,
  });

  const quickReactionsKey = session?.userId ? `quick-reactions:${session.userId}` : null;

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
      } catch (error) {
        console.warn('[home] Failed to load boops', error);
        setBoopCounts({});
      }
    } catch (error) {
      console.warn('[home] Failed to load posts', error);
      setPosts([]);
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
      const created = await createPost({ body, alias });
      if (created) {
        setPosts((prev) => [created, ...prev]);
      }
      setComposerText('');
      setComposerOpen(false);
    } catch (error) {
      console.warn('[home] Failed to create post', error);
    } finally {
      setPosting(false);
      postPressRef.current = false;
    }
  }, [alias, composerText]);

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
    [session?.userId],
  );

  const handleReaction = useCallback(async (postId: string, emoji: string) => {
    try {
      const isSelected = Boolean(reactionSelections[postId]?.[emoji]);
      if (isSelected) {
        const removed = await removePostReaction(postId, emoji);
        if (!removed) {
          return;
        }
        setReactionCounts((prev) => {
          const next = { ...prev };
          const postReactions = { ...(next[postId] ?? {}) };
          const nextCount = (postReactions[emoji] ?? 1) - 1;
          if (nextCount <= 0) {
            delete postReactions[emoji];
          } else {
            postReactions[emoji] = nextCount;
          }
          if (Object.keys(postReactions).length === 0) {
            delete next[postId];
          } else {
            next[postId] = postReactions;
          }
          return next;
        });
        setReactionSelections((prev) => {
          const next = { ...prev };
          const postSelections = { ...(next[postId] ?? {}) };
          delete postSelections[emoji];
          if (Object.keys(postSelections).length === 0) {
            delete next[postId];
          } else {
            next[postId] = postSelections;
          }
          return next;
        });
      } else {
        const inserted = await addPostReaction(postId, emoji);
        if (!inserted) {
          return;
        }
        setReactionCounts((prev) => {
          const next = { ...prev };
          const postReactions = { ...(next[postId] ?? {}) };
          postReactions[emoji] = (postReactions[emoji] ?? 0) + 1;
          next[postId] = postReactions;
          return next;
        });
        setReactionSelections((prev) => {
          const next = { ...prev };
          const postSelections = { ...(next[postId] ?? {}) };
          postSelections[emoji] = true;
          next[postId] = postSelections;
          return next;
        });
      }
    } catch (error) {
      console.warn('[home] Failed to update reaction', error);
    } finally {
      setReactionModalPostId(null);
      setReactionPickerExpanded(false);
      setReactionAnchor(null);
    }
  }, [reactionSelections]);

  const openReactionPicker = useCallback(
    (postId: string, event: GestureResponderEvent) => {
      const { pageX, pageY } = event.nativeEvent;
      setReactionModalPostId(postId);
      setReactionPickerExpanded(false);
      setReactionAnchor({ x: pageX, y: pageY });
    },
    [],
  );

  const closeReactionPicker = useCallback(() => {
    setReactionModalPostId(null);
    setReactionPickerExpanded(false);
    setReactionAnchor(null);
  }, []);
  const handleEmojiPress = useCallback(
    (emoji: string) => {
      if (!reactionModalPostId) {
        return;
      }
      handleReaction(reactionModalPostId, emoji);
    },
    [handleReaction, reactionModalPostId],
  );

  const handlePostPress = useCallback(
    (postId: string) => {
      const now = Date.now();
      const result = getDoubleTapResult(lastTapRef.current, postId, now);
      if (result.isDoubleTap) {
        lastTapRef.current = result.nextState;
        const defaultEmoji = quickReactions[0];
        if (defaultEmoji) {
          handleReaction(postId, defaultEmoji);
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

  const renderPost = ({ item }: { item: PostRow }) => {
    const name = item.user_id === session?.userId ? 'You' : item.alias ?? 'Anonymous';
    const timeLabel = formatTime(item.created_at);
    const initials = (item.alias ?? name).slice(0, 1).toUpperCase();
    const boopCount = boopCounts[item.id] ?? 0;
    const boopStatus = boopStatusByPost[item.id] ?? 'idle';
    const postReactions = reactionCounts[item.id] ?? {};
    const postSelections = reactionSelections[item.id] ?? {};
    const isSelf = item.user_id === session?.userId;
    const headerContent = (
      <>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.postMeta}>
          <Text style={styles.postName}>{name}</Text>
          <Text style={styles.postTime}>{timeLabel}</Text>
        </View>
      </>
    );

    return (
      <TouchableOpacity
        style={styles.postCard}
        onLongPress={(event) => openReactionPicker(item.id, event)}
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
        {item.mood_tag ? (
          <View style={styles.moodPill}>
            <Text style={styles.moodPillText}>{item.mood_tag}</Text>
          </View>
        ) : null}
        {item.body ? <Text style={styles.postBody}>{item.body}</Text> : null}
        <View style={styles.postActions}>
          <TouchableOpacity
            style={[styles.boopButton, boopStatus === 'queued' ? styles.boopButtonQueued : null]}
            onPress={() => handleBoop(item)}
            disabled={boopStatus === 'sending' || isSelf}
          >
            <Text style={styles.boopText}>
              {boopStatus === 'queued' ? 'Queued' : 'Boop'}
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
                  onPress={() => handleReaction(item.id, emoji)}
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

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        refreshing={isLoading}
        onRefresh={loadFeed}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.navRow}>
              <TouchableOpacity onPress={navigateToProfile} style={styles.profileIcon}>
                <Ionicons name="person-circle-outline" size={28} color="#111" />
              </TouchableOpacity>
              <View style={styles.navActions}>
                <FriendSyncButton onPress={navigateToProfile} />
                <NotificationsBell count={unreadCount} onPress={() => setSheetVisible(true)} />
              </View>
            </View>
            <Text style={styles.title}>How are you feeling, {alias ?? 'there'}?</Text>
            {!isComposerOpen ? (
              <TouchableOpacity onPress={() => setComposerOpen(true)} style={styles.composerCollapsed}>
                <Text style={styles.composerPlaceholder}>I'm feeling...</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.composerExpanded}>
                <TextInput
                  style={styles.composerInput}
                  value={composerText}
                  onChangeText={setComposerText}
                  placeholder="I'm feeling..."
                  multiline
                  autoFocus
                  onBlur={() => {
                    if (!postPressRef.current) {
                      setComposerOpen(false);
                    }
                  }}
                />
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
                  <Ionicons name={isPosting ? 'time-outline' : 'paper-plane'} size={16} color="#fff" />
                  <Text style={styles.postButtonText}>
                    {isPosting ? 'Posting...' : 'Share update'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.moodRow}>
              {MOOD_TAGS.map((tag) => (
                <TouchableOpacity
                  key={tag.label}
                  style={[styles.moodChip, { backgroundColor: tag.color }]}
                  onPress={() => handleQuickTag(tag.label)}
                  disabled={isPosting}
                >
                  <Text style={[styles.moodChipText, { color: tag.text }]}>{tag.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {isOffline ? (
              <View style={styles.offlineBanner}>
                <Text style={styles.offlineText}>Offline: posts will send when you're back online.</Text>
              </View>
            ) : null}
          </View>
        }
        renderItem={renderPost}
        ListEmptyComponent={<Text style={styles.emptyState}>No posts yet. Share how you feel.</Text>}
      />
      <NotificationsSheet
        visible={isSheetVisible}
        notifications={notifications}
        onClose={() => setSheetVisible(false)}
      />
      <Modal
        visible={Boolean(reactionModalPostId)}
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
              const isSelected = reactionModalPostId
                ? reactionSelections[reactionModalPostId]?.[emoji]
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
                  const isSelected = reactionModalPostId
                    ? reactionSelections[reactionModalPostId]?.[emoji]
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  header: {
    gap: 12,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileIcon: {
    padding: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111',
  },
  composerCollapsed: {
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingVertical: 6,
    width: '30%',
    alignSelf: 'stretch',
  },
  composerPlaceholder: {
    fontSize: 14,
    color: '#999',
  },
  composerExpanded: {
    gap: 10,
    width: '100%',
  },
  composerInput: {
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    fontSize: 16,
    paddingVertical: 6,
    minHeight: 60,
    width: '100%',
  },
  postButton: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: '#111',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  postButtonDisabled: {
    backgroundColor: '#444',
  },
  postButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  moodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  moodChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
  },
  moodChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  offlineBanner: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#ffe6e6',
    alignSelf: 'flex-start',
  },
  offlineText: {
    fontSize: 12,
    color: '#7a1f1f',
    fontWeight: '600',
  },
  postCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    padding: 12,
    gap: 8,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  postHeaderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontWeight: '700',
  },
  postMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  postName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111',
  },
  postTime: {
    fontSize: 12,
    color: '#888',
  },
  moodPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  moodPillText: {
    fontSize: 12,
    color: '#555',
    fontWeight: '600',
  },
  postBody: {
    fontSize: 14,
    color: '#222',
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  boopButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    minHeight: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  boopButtonQueued: {
    opacity: 0.6,
  },
  boopText: {
    color: '#111',
    fontWeight: '600',
    fontSize: 12,
    lineHeight: 16,
  },
  boopCount: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  reactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reactionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minHeight: 24,
  },
  reactionChipActive: {
    backgroundColor: '#e7f0ff',
    borderColor: '#3b5bdb',
    borderWidth: 1,
  },
  reactionEmoji: {
    fontSize: 12,
    lineHeight: 16,
  },
  reactionCount: {
    fontSize: 11,
    color: '#555',
    lineHeight: 16,
  },
  reactionCountActive: {
    color: '#1f3a93',
  },
  emptyState: {
    textAlign: 'center',
    color: '#777',
    marginTop: 16,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
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
    backgroundColor: '#fff',
    borderRadius: 999,
    paddingHorizontal: REACTION_BAR_PADDING,
    paddingVertical: REACTION_BAR_PADDING,
    gap: REACTION_BUTTON_GAP,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    zIndex: 2,
  },
  reactionButton: {
    width: REACTION_BUTTON_SIZE,
    height: REACTION_BUTTON_SIZE,
    borderRadius: 999,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionButtonActive: {
    backgroundColor: '#e7f0ff',
    borderColor: '#3b5bdb',
    borderWidth: 1,
  },
  reactionButtonEmoji: {
    fontSize: 18,
  },
  reactionMoreButton: {
    backgroundColor: '#e9e9e9',
  },
  expandedSheet: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: EXPANDED_PANEL_PADDING,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    zIndex: 2,
  },
  expandedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expandedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111',
  },
  expandedClose: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3d2f8f',
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
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandedEmoji: {
    fontSize: 24,
  },
});

export default HomeScreen;
