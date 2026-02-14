import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Animated,
  Easing,
  Image,
  Platform,
  PlatformColor,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Buffer } from 'buffer';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { selectSession, useSessionStore } from '../../../state/sessionStore';
import {
  fetchCurrentUserProfile,
  updateCurrentUserProfile,
} from '../../../services/supabase/users';
import {
  fetchCycleGuidance,
  type CycleGuidanceRow,
} from '../../../services/supabase/cycleGuidance';
import { useCycleSnapshot } from '../../feed/hooks/useCycleSnapshot';
import { generateAvatarImage, uploadAvatarBlob } from '../../../services/supabase/avatars';

const iosColor = (name: string, fallback: string) =>
  Platform.OS === 'ios' ? PlatformColor(name) : fallback;

const palette = {
  background: iosColor('systemGroupedBackground', '#F2F2F7'),
  card: iosColor('secondarySystemGroupedBackground', '#FFFFFF'),
  primaryText: iosColor('label', '#111827'),
  secondaryText: iosColor('secondaryLabel', '#6B7280'),
  tertiaryText: iosColor('tertiaryLabel', '#9CA3AF'),
  separator: iosColor('separator', '#E5E7EB'),
  accent: iosColor('systemBlue', '#007AFF'),
  accentSoft: '#E6F0FF',
  success: iosColor('systemGreen', '#16A34A'),
  warningText: iosColor('systemRed', '#B42318'),
  fill: iosColor('systemGray5', '#E5E7EB'),
  mutedFill: iosColor('systemGray6', '#F3F4F6'),
};

const BIO_MAX_LENGTH = 80;

const AVATAR_GLAM_PROMPT = [
  'This is an image edit task, not generation from scratch.',
  'Glamify the exact uploaded image and preserve the same subject and composition.',
  'Do not replace the person, do not change identity, and do not create a new person.',
  'If the input has no person, keep the original scene and do not add any people.',
  'Preserve facial features, skin tone, hair, pose, background structure, and framing.',
  'Apply only tasteful glam enhancements: flattering lighting, refined color, and gentle polish.',
].join(' ');
const AVATAR_GLAM_STYLE_LABEL = 'Maximum Glam';
const AVATAR_GENERATION_TIMEOUT_MS = 90000;

const ProfileScreen = () => {
  const session = useSessionStore(selectSession);
  const navigation = useNavigation();
  const { snapshot, isStale, lastSyncedAt } = useCycleSnapshot();
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileBio, setProfileBio] = useState('');
  const [bioDraft, setBioDraft] = useState('');
  const [isBioEditing, setBioEditing] = useState(false);
  const [bioStatus, setBioStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const [isAvatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const avatarPulse = useRef(new Animated.Value(0)).current;
  const [cycleGuidance, setCycleGuidance] = useState<CycleGuidanceRow | null>(null);
  const [cycleGuidanceStatus, setCycleGuidanceStatus] = useState<
    'idle' | 'loading' | 'error'
  >('idle');

  const loadProfile = useCallback(async () => {
    try {
      const data = await fetchCurrentUserProfile();
      if (data) {
        setProfileName(data.full_name ?? '');
        setProfileEmail(data.email ?? '');
        const nextBio = data.bio ?? '';
        setProfileBio(nextBio);
        setBioDraft(nextBio);
        setBioEditing(false);
        setAvatarUrl(data.avatar_url ?? null);
        setAvatarLoadFailed(false);
      }
    } catch (error) {
      console.warn('[profile] Failed to load user profile', error);
    }
  }, []);

  const loadCycleGuidance = useCallback(async () => {
    if (!session?.userId) {
      setCycleGuidance(null);
      setCycleGuidanceStatus('idle');
      return;
    }
    try {
      setCycleGuidanceStatus('loading');
      const guidance = await fetchCycleGuidance();
      setCycleGuidance(guidance);
      setCycleGuidanceStatus('idle');
    } catch (error) {
      console.warn('[profile] Failed to load cycle guidance', error);
      setCycleGuidance(null);
      setCycleGuidanceStatus('error');
    }
  }, [session?.userId]);

  const handleSaveBio = useCallback(async () => {
    const trimmed = bioDraft.trim();
    if (trimmed.length > BIO_MAX_LENGTH) {
      setBioStatus('error');
      return;
    }
    setBioStatus('saving');
    try {
      await updateCurrentUserProfile({ bio: trimmed ? trimmed : null });
      setProfileBio(trimmed);
      setBioEditing(false);
      setBioStatus('saved');
      setTimeout(() => setBioStatus('idle'), 1500);
    } catch (error) {
      console.warn('[profile] Failed to update bio', error);
      setBioStatus('error');
    }
  }, [bioDraft]);

  const handleStartBioEdit = useCallback(() => {
    setBioDraft(profileBio);
    setBioStatus('idle');
    setBioEditing(true);
  }, [profileBio]);

  const handleCancelBioEdit = useCallback(() => {
    setBioDraft(profileBio);
    setBioStatus('idle');
    setBioEditing(false);
  }, [profileBio]);

  const ensurePhotoPermission = useCallback(async () => {
    const existingPermission = await ImagePicker.getMediaLibraryPermissionsAsync();
    if (existingPermission.granted) {
      return true;
    }
    const requestedPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return requestedPermission.granted;
  }, []);

  const handlePickAvatar = useCallback(async () => {
    if (!session?.userId) {
      return;
    }
    setAvatarError(null);
    const hasPermission = await ensurePhotoPermission();
    if (!hasPermission) {
      setAvatarError('Allow photo access to choose an avatar.');
      return;
    }
    let result: ImagePicker.ImagePickerResult;
    try {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.9,
        allowsEditing: true,
        aspect: [1, 1],
        base64: true,
      });
    } catch (error) {
      console.warn('[profile] Failed to open photo library', error);
      setAvatarError('Unable to open your photo library right now.');
      return;
    }
    if (result.canceled || !result.assets?.length) {
      return;
    }
    const asset = result.assets[0];
    if (!asset.base64) {
      setAvatarError('Unable to load the selected photo.');
      return;
    }
    const mimeType = asset.mimeType ?? 'image/jpeg';
    const dataUri = `data:${mimeType};base64,${asset.base64}`;
    setAvatarBusy(true);
    try {
      const generated = (await Promise.race([
        generateAvatarImage({
          prompt: AVATAR_GLAM_PROMPT,
          imageBase64: dataUri,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(
            () =>
              reject(new Error('This is taking longer than expected. Please try again.')),
            AVATAR_GENERATION_TIMEOUT_MS,
          ),
        ),
      ])) as Awaited<ReturnType<typeof generateAvatarImage>>;
      const buffer = Buffer.from(generated.b64, 'base64');
      const url = await uploadAvatarBlob(session.userId, buffer, 'png', 'image/png');
      await updateCurrentUserProfile({
        avatarUrl: url,
        avatarStyle: AVATAR_GLAM_STYLE_LABEL,
        avatarPrompt: AVATAR_GLAM_PROMPT,
      });
      setAvatarUrl(url);
      setAvatarLoadFailed(false);
    } catch (error) {
      console.warn('[profile] Failed to generate avatar', error);
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Unable to glam your avatar right now.';
      setAvatarError(message);
    } finally {
      setAvatarBusy(false);
    }
  }, [ensurePhotoPermission, session?.userId]);

  const handleRemoveAvatar = useCallback(async () => {
    if (!session?.userId) {
      return;
    }
    setAvatarError(null);
    setAvatarBusy(true);
    try {
      await updateCurrentUserProfile({ avatarUrl: null, avatarStyle: null, avatarPrompt: null });
      setAvatarUrl(null);
      setAvatarLoadFailed(false);
    } catch (error) {
      console.warn('[profile] Failed to remove avatar', error);
      setAvatarError('Unable to remove avatar right now.');
    } finally {
      setAvatarBusy(false);
    }
  }, [session?.userId]);

  useEffect(() => {
    if (!isAvatarBusy) {
      avatarPulse.stopAnimation();
      avatarPulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(avatarPulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(avatarPulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [avatarPulse, isAvatarBusy]);

  const handleAvatarPress = useCallback(() => {
    if (isAvatarBusy) {
      return;
    }
    if (!avatarUrl) {
      void handlePickAvatar();
      return;
    }

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Choose new photo', 'Remove photo', 'Cancel'],
          cancelButtonIndex: 2,
          destructiveButtonIndex: 1,
        },
        (buttonIndex) => {
          if (buttonIndex === 0) {
            void handlePickAvatar();
          }
          if (buttonIndex === 1) {
            void handleRemoveAvatar();
          }
        },
      );
      return;
    }

    Alert.alert('Profile photo', undefined, [
      {
        text: 'Choose new photo',
        onPress: () => {
          void handlePickAvatar();
        },
      },
      {
        text: 'Remove photo',
        style: 'destructive',
        onPress: () => {
          void handleRemoveAvatar();
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [avatarUrl, handlePickAvatar, handleRemoveAvatar, isAvatarBusy]);

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

  const formatPhaseLabel = (value?: string | null) => {
    if (!value) {
      return null;
    }
    const normalized = value.replace(/_/g, ' ');
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  };

  const shortId = (value: string) => `${value.slice(0, 4)}...${value.slice(-4)}`;

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

  useEffect(() => {
    loadProfile();
    loadCycleGuidance();
  }, [loadCycleGuidance, loadProfile]);

  useFocusEffect(
    useCallback(() => {
      loadCycleGuidance();
    }, [loadCycleGuidance]),
  );

  const displayName = useMemo(() => {
    if (profileName) {
      return profileName;
    }
    if (profileEmail) {
      return profileEmail;
    }
    return 'Your Name';
  }, [profileEmail, profileName]);

  const canSaveBio = useMemo(
    () => bioDraft.trim() !== profileBio.trim() && bioDraft.trim().length <= BIO_MAX_LENGTH,
    [bioDraft, profileBio],
  );

  const bioStatusLabel = useMemo(() => {
    switch (bioStatus) {
      case 'saving':
        return 'Saving...';
      case 'saved':
        return 'Saved';
      case 'error':
        return 'Could not save';
      default:
        return `${bioDraft.trim().length}/${BIO_MAX_LENGTH}`;
    }
  }, [bioDraft, bioStatus]);

  const avatarInitial = displayName.trim().slice(0, 1).toUpperCase() || '?';

  const navigateToFriendSync = useCallback(
    (friendUserId: string) => {
      navigation.navigate('FriendSync' as never, { friendId: friendUserId } as never);
    },
    [navigation],
  );

  const navigateToAutoPostSettings = useCallback(() => {
    navigation.navigate('AutoPostSettings' as never);
  }, [navigation]);

  const cyclePhaseKey = snapshot?.currentPhase ?? 'unknown';
  const cyclePhaseLabel = useMemo(
    () => formatPhaseLabel(snapshot?.currentPhase) ?? 'Unknown phase',
    [snapshot?.currentPhase],
  );
  const cycleSyncLabel = useMemo(
    () => formatSyncLabel(lastSyncedAt ?? snapshot?.syncedAt ?? null),
    [lastSyncedAt, snapshot?.syncedAt],
  );
  const cycleMetaLabel = useMemo(() => {
    if (!snapshot) {
      return 'Connect Health';
    }
    if (isStale) {
      return cycleSyncLabel === 'Not synced yet'
        ? 'Needs sync'
        : `Needs sync • ${cycleSyncLabel}`;
    }
    return 'Up to date';
  }, [cycleSyncLabel, isStale, snapshot]);
  const cycleDetailLabel = useMemo(() => {
    if (!snapshot) {
      return 'Connect Health to see your phase.';
    }
    if (isStale) {
      return cycleSyncLabel === 'Not synced yet'
        ? 'Needs sync'
        : `Needs sync • ${cycleSyncLabel}`;
    }
    return cycleSyncLabel === 'Not synced yet' ? 'Synced recently' : `Last synced ${cycleSyncLabel}`;
  }, [cycleSyncLabel, isStale, snapshot]);
  const cycleMetaTone = !snapshot || isStale ? 'stale' : 'fresh';
  const cyclePhaseColors = {
    background: phasePillPalette[cyclePhaseKey] ?? palette.mutedFill,
    text: phasePillPaletteText[cyclePhaseKey] ?? palette.secondaryText,
  };
  const isGuidanceStale = Boolean(cycleGuidance?.phase && cycleGuidance.phase !== cyclePhaseKey);
  const guidanceUpdatedLabel = useMemo(() => {
    if (isGuidanceStale) {
      return 'Refreshing tips';
    }
    if (cycleGuidance?.generated_at) {
      const date = new Date(cycleGuidance.generated_at);
      return Number.isNaN(date.getTime())
        ? 'Updated recently'
        : `Updated ${date.toLocaleDateString()}`;
    }
    return cycleGuidanceStatus === 'loading' ? 'Refreshing tips' : 'No guidance yet';
  }, [cycleGuidance?.generated_at, cycleGuidanceStatus, isGuidanceStale]);
  const phaseDos = cycleGuidance?.dos ?? [];
  const phaseDonts = cycleGuidance?.donts ?? [];
  const friendSuggestions = cycleGuidance?.friend_suggestions ?? [];
  const guidanceEmptyLabel = useMemo(() => {
    if (cycleGuidanceStatus === 'loading') {
      return 'Refreshing your phase guidance.';
    }
    if (!snapshot) {
      return 'Sync Health data to unlock phase guidance.';
    }
    return 'No guidance yet.';
  }, [cycleGuidanceStatus, snapshot]);
  const friendsEmptyLabel = useMemo(() => {
    if (cycleGuidanceStatus === 'loading') {
      return 'Finding friends in similar phases...';
    }
    return 'No similar-phase friends yet.';
  }, [cycleGuidanceStatus]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profileCard}>
          <View style={styles.profileHeaderRow}>
            <Pressable
              style={styles.avatar}
              onPress={handleAvatarPress}
              accessibilityRole="button"
              accessibilityLabel="Choose profile photo"
              accessibilityState={{ disabled: isAvatarBusy }}
            >
              {isAvatarBusy ? (
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.avatarPulse,
                    {
                      opacity: avatarPulse.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.2, 0.55],
                      }),
                      transform: [
                        {
                          scale: avatarPulse.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 1.12],
                          }),
                        },
                      ],
                    },
                  ]}
                />
              ) : null}
              <View style={styles.avatarImageWrap}>
                {avatarUrl && !avatarLoadFailed ? (
                  <Image
                    source={{ uri: avatarUrl }}
                    style={styles.avatarImage}
                    onError={() => {
                      setAvatarLoadFailed(true);
                      setAvatarError('Could not load avatar. Try re-uploading.');
                    }}
                  />
                ) : (
                  <Text style={styles.avatarText}>{avatarInitial}</Text>
                )}
              </View>
              <View style={styles.avatarOverlay}>
                <Ionicons
                  name={isAvatarBusy ? 'sparkles' : 'camera-outline'}
                  size={18}
                  color={isAvatarBusy ? palette.accent : palette.primaryText}
                />
              </View>
            </Pressable>
            <View style={styles.profileMeta}>
              <View style={styles.profileMetaTopRow}>
                <Text style={styles.profileName}>{displayName}</Text>
                <TouchableOpacity
                  style={styles.profileSettingsButton}
                  onPress={navigateToAutoPostSettings}
                  accessibilityRole="button"
                  accessibilityLabel="Open auto-post settings"
                >
                  <Ionicons name="settings-outline" size={16} color={palette.secondaryText} />
                </TouchableOpacity>
              </View>
              {profileEmail ? <Text style={styles.profileEmail}>{profileEmail}</Text> : null}
              {session?.userId ? (
                <Text style={styles.profileId}>Your ID: {session.userId}</Text>
              ) : null}
              {isAvatarBusy ? (
                <Text style={styles.avatarStatus}>Glamifying your photo...</Text>
              ) : null}
              {avatarError ? <Text style={styles.avatarError}>{avatarError}</Text> : null}
            </View>
          </View>
          <View style={styles.profileDivider} />
          <View style={styles.bioSection}>
            <View style={styles.bioHeader}>
              <Text style={styles.sectionTitle}>About you</Text>
              {isBioEditing ? (
                <Text style={styles.bioCounter}>{bioStatusLabel}</Text>
              ) : (
                <TouchableOpacity style={styles.bioEditButton} onPress={handleStartBioEdit}>
                  <Ionicons name="pencil-outline" size={13} color={palette.accent} />
                  <Text style={styles.bioEditButtonText}>
                    {profileBio.trim() ? 'Edit' : 'Add'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            {isBioEditing ? (
              <>
                <TextInput
                  style={styles.bioInput}
                  value={bioDraft}
                  onChangeText={setBioDraft}
                  placeholder="NYC, Yale '24, matcha loyalist"
                  maxLength={BIO_MAX_LENGTH}
                  autoCapitalize="sentences"
                  autoCorrect
                />
                {bioStatus === 'error' ? (
                  <Text style={styles.bioError}>Unable to save right now.</Text>
                ) : null}
                <View style={styles.bioActionRow}>
                  <TouchableOpacity
                    style={[styles.bioSaveButton, !canSaveBio ? styles.bioSaveButtonDisabled : null]}
                    onPress={handleSaveBio}
                    disabled={!canSaveBio || bioStatus === 'saving'}
                  >
                    <Text style={styles.bioSaveButtonText}>
                      {bioStatus === 'saving' ? 'Saving...' : 'Save bio'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.bioCancelButton}
                    onPress={handleCancelBioEdit}
                    disabled={bioStatus === 'saving'}
                  >
                    <Text style={styles.bioCancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <Text
                style={[
                  styles.bioPreviewText,
                  !profileBio.trim() ? styles.bioPreviewPlaceholder : null,
                ]}
              >
                {profileBio.trim() || 'Add a short bio about yourself.'}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.cycleCard}>
          <View style={styles.cycleHeader}>
            <View style={styles.cycleHeaderLeft}>
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
              <View style={styles.cycleHeaderText}>
                <Text style={styles.cycleHeaderLabel}>My cycle</Text>
                <Text style={styles.cycleHeaderValue}>{cyclePhaseLabel}</Text>
              </View>
            </View>
            <Text
              style={[
                styles.cycleHeaderMeta,
                cycleMetaTone === 'stale' ? styles.cycleHeaderMetaStale : null,
              ]}
            >
              {cycleMetaLabel}
            </Text>
          </View>
          <View style={styles.cycleMetaRow}>
            <View
              style={[
                styles.phasePill,
                { backgroundColor: cyclePhaseColors.background },
              ]}
            >
              <Text
                style={[
                  styles.phasePillText,
                  { color: cyclePhaseColors.text },
                ]}
              >
                {cyclePhaseLabel}
              </Text>
            </View>
            <Text style={styles.cycleMetaDetail}>{cycleDetailLabel}</Text>
          </View>
          <View style={styles.cycleSectionHeader}>
            <Text style={styles.sectionTitle}>Phase guide</Text>
            <Text style={styles.sectionHint}>{guidanceUpdatedLabel}</Text>
          </View>
          {phaseDos.length || phaseDonts.length ? (
            <View style={styles.phaseGuideGrid}>
              <View style={styles.phaseGuideColumn}>
                <Text style={styles.phaseGuideLabel}>Do</Text>
                {phaseDos.map((item, index) => (
                  <View key={`do-${index}`} style={styles.phaseGuideRow}>
                    <Ionicons
                      name="checkmark-circle"
                      size={14}
                      color={palette.success}
                    />
                    <Text style={styles.phaseGuideText}>{item}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.phaseGuideColumn}>
                <Text style={styles.phaseGuideLabel}>Don't</Text>
                {phaseDonts.map((item, index) => (
                  <View key={`dont-${index}`} style={styles.phaseGuideRow}>
                    <Ionicons
                      name="close-circle"
                      size={14}
                      color={palette.warningText}
                    />
                    <Text style={styles.phaseGuideText}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <Text style={styles.cycleEmptyText}>{guidanceEmptyLabel}</Text>
          )}
          <View style={styles.cycleSectionHeader}>
            <Text style={styles.sectionTitle}>Friends in sync</Text>
            <Text style={styles.sectionHint}>Similar phases</Text>
          </View>
          {friendSuggestions.length ? (
            <View style={styles.friendSuggestionList}>
              {friendSuggestions.map((item, index) => {
                const friendName =
                  item.friend_name ?? `Friend ${shortId(item.friend_id)}`;
                const initial = friendName.trim().slice(0, 1).toUpperCase() || '?';
                return (
                  <TouchableOpacity
                    key={`${item.friend_id}-${index}`}
                    style={styles.friendSuggestionRow}
                    onPress={() => navigateToFriendSync(item.friend_id)}
                    accessibilityLabel={`View sync with ${friendName}`}
                  >
                    <View style={styles.friendSuggestionAvatar}>
                      <Text style={styles.friendSuggestionInitial}>{initial}</Text>
                    </View>
                    <View style={styles.friendSuggestionContent}>
                      <Text style={styles.friendSuggestionName}>{friendName}</Text>
                      <Text style={styles.friendSuggestionText}>{item.suggestion}</Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={palette.tertiaryText}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <Text style={styles.cycleEmptyText}>{friendsEmptyLabel}</Text>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 18,
  },
  profileCard: {
    backgroundColor: palette.card,
    borderRadius: 20,
    padding: 16,
    gap: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.separator,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  profileHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatar: {
    width: 92,
    height: 92,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'visible',
  },
  avatarImageWrap: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: palette.fill,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  avatarPulse: {
    position: 'absolute',
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    borderColor: palette.accent,
    backgroundColor: palette.accentSoft,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: palette.primaryText,
  },
  avatarOverlay: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFFEE',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: palette.separator,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  profileMeta: {
    flex: 1,
    gap: 4,
  },
  profileMetaTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: palette.primaryText,
    flex: 1,
  },
  profileSettingsButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.mutedFill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.separator,
  },
  profileEmail: {
    fontSize: 13,
    color: palette.secondaryText,
  },
  profileId: {
    fontSize: 12,
    color: palette.tertiaryText,
  },
  avatarStatus: {
    marginTop: 2,
    fontSize: 12,
    color: palette.accent,
    fontWeight: '600',
  },
  avatarError: {
    marginTop: 6,
    fontSize: 12,
    color: palette.warningText,
  },
  profileDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: palette.separator,
    marginHorizontal: -16,
  },
  bioSection: {
    gap: 10,
  },
  bioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bioEditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: palette.accentSoft,
  },
  bioEditButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: palette.accent,
  },
  bioCounter: {
    fontSize: 12,
    color: palette.tertiaryText,
  },
  bioPreviewText: {
    minHeight: 20,
    fontSize: 14,
    color: palette.primaryText,
  },
  bioPreviewPlaceholder: {
    color: palette.tertiaryText,
  },
  bioInput: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.separator,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: palette.primaryText,
    backgroundColor: palette.mutedFill,
  },
  bioError: {
    fontSize: 12,
    color: palette.warningText,
  },
  bioSaveButton: {
    alignSelf: 'flex-start',
    backgroundColor: palette.primaryText,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  bioSaveButtonDisabled: {
    opacity: 0.6,
  },
  bioSaveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  bioActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bioCancelButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.separator,
    backgroundColor: palette.card,
  },
  bioCancelButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: palette.secondaryText,
  },
  cycleCard: {
    backgroundColor: palette.card,
    borderRadius: 20,
    padding: 16,
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.separator,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  cycleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  cycleHeaderLeft: {
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
  cycleHeaderText: {
    flex: 1,
    gap: 2,
  },
  cycleHeaderLabel: {
    fontSize: 12,
    color: palette.tertiaryText,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  cycleHeaderValue: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.primaryText,
    textTransform: 'capitalize',
  },
  cycleHeaderMeta: {
    fontSize: 12,
    color: palette.secondaryText,
    textAlign: 'right',
  },
  cycleHeaderMetaStale: {
    color: palette.warningText,
  },
  cycleMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  phasePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  phasePillText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  cycleMetaDetail: {
    fontSize: 12,
    color: palette.secondaryText,
    flex: 1,
    textAlign: 'right',
  },
  cycleSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  phaseGuideGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  phaseGuideColumn: {
    flex: 1,
    gap: 6,
  },
  phaseGuideLabel: {
    fontSize: 12,
    color: palette.tertiaryText,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  phaseGuideRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  phaseGuideText: {
    fontSize: 13,
    color: palette.primaryText,
    flexShrink: 1,
  },
  cycleEmptyText: {
    fontSize: 13,
    color: palette.tertiaryText,
  },
  friendSuggestionList: {
    gap: 10,
  },
  friendSuggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: palette.mutedFill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.separator,
  },
  friendSuggestionAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: palette.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendSuggestionInitial: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.primaryText,
  },
  friendSuggestionContent: {
    flex: 1,
    gap: 2,
  },
  friendSuggestionName: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.primaryText,
  },
  friendSuggestionText: {
    fontSize: 12,
    color: palette.secondaryText,
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
});

export default ProfileScreen;
