import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Animated,
  Easing,
  Image,
  Platform,
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
import { deleteCurrentAccount, signOut } from '../../../services/supabase/auth';
import { brand, brandType } from '../../../theme/brand';
import { CycleRing, PhaseAvatar, PhaseIndicator, getPhaseBg, getPhaseColor } from '../../../components/brand/CycleRing';
import { DottieMascot, DottieTheme, DottieThemed } from '../../../components/brand/DottieMascot';
import { useStaggeredEntrance } from '../../../components/brand/useStaggeredEntrance';

const palette = {
  background: brand.colors.background,
  card: brand.colors.card,
  primaryText: brand.colors.primaryText,
  secondaryText: brand.colors.secondaryText,
  tertiaryText: brand.colors.tertiaryText,
  separator: brand.colors.separator,
  accent: brand.colors.accent,
  accentSoft: brand.colors.accentSoft,
  success: brand.colors.success,
  warningText: brand.colors.warningText,
  fill: brand.colors.fill,
  mutedFill: brand.colors.mutedFill,
  white: brand.colors.white,
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

type FlipGuideCardProps = {
  title: string;
  body: string;
  bg: string;
  color: string;
  theme: DottieTheme;
  accessibilityLabel: string;
};

const FlipGuideCard = ({ title, body, bg, color, theme, accessibilityLabel }: FlipGuideCardProps) => {
  const [isFlipped, setFlipped] = useState(false);
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(rotate, {
      toValue: isFlipped ? 1 : 0,
      duration: 450,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      useNativeDriver: true,
    }).start();
  }, [isFlipped, rotate]);

  const frontRotate = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });
  const backRotate = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '360deg'],
  });

  return (
    <Pressable
      onPress={() => setFlipped((value) => !value)}
      style={styles.flipCardWrap}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <View style={styles.flipCardPerspective}>
        <Animated.View
          style={[
            styles.flipCardFace,
            styles.flipCardFront,
            {
              backgroundColor: bg,
              transform: [{ perspective: 900 }, { rotateY: frontRotate }],
            },
          ]}
        >
          <DottieThemed theme={theme} color={color} size={52} />
          <Text style={[styles.flipCardTitle, { color }]}>{title}</Text>
          <Text style={styles.flipCardHint}>tap to flip</Text>
        </Animated.View>

        <Animated.View
          style={[
            styles.flipCardFace,
            styles.flipCardBack,
            {
              backgroundColor: bg,
              transform: [{ perspective: 900 }, { rotateY: backRotate }],
            },
          ]}
        >
          <Text style={styles.flipCardBody} numberOfLines={5}>
            {body}
          </Text>
        </Animated.View>
      </View>
    </Pressable>
  );
};

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
  const [accountAction, setAccountAction] = useState<'idle' | 'signingOut' | 'deleting'>('idle');
  const [accountError, setAccountError] = useState<string | null>(null);

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

  const formatPhaseSourceLabel = (value?: string | null) => {
    if (value === 'estimated') {
      return 'Estimated';
    }
    return null;
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
    const normalize = (value: string) => value.trim().toUpperCase();
    if (profileName) {
      return normalize(profileName);
    }
    if (profileEmail) {
      return normalize(profileEmail);
    }
    return 'Your Name';
  }, [profileEmail, profileName]);

  const displayEmail = useMemo(() => {
    if (!profileEmail) {
      return '';
    }
    return profileEmail.trim().toUpperCase();
  }, [profileEmail]);

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
      (navigation as any).navigate('FriendSync', { friendId: friendUserId });
    },
    [navigation],
  );

  const navigateToAutoPostSettings = useCallback(() => {
    (navigation as any).navigate('AutoPostSettings');
  }, [navigation]);

  const handleSignOut = useCallback(async () => {
    if (accountAction !== 'idle') {
      return;
    }
    setAccountError(null);
    setAccountAction('signingOut');
    try {
      await signOut();
      useSessionStore.getState().reset();
    } catch (error) {
      console.warn('[profile] Failed to sign out', error);
      setAccountError('Could not sign out right now.');
    } finally {
      setAccountAction('idle');
    }
  }, [accountAction]);

  const confirmDeleteAccount = useCallback(() => {
    if (accountAction !== 'idle') {
      return;
    }
    Alert.alert(
      'Delete account?',
      'This permanently removes your account and cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setAccountError(null);
            setAccountAction('deleting');
            try {
              await deleteCurrentAccount();
              useSessionStore.getState().reset();
            } catch (error) {
              console.warn('[profile] Failed to delete account', error);
              setAccountError('Could not delete account right now.');
            } finally {
              setAccountAction('idle');
            }
          },
        },
      ],
    );
  }, [accountAction]);

  const cyclePhaseKey = snapshot?.currentPhase ?? 'unknown';
  const cyclePhaseLabel = useMemo(
    () => formatPhaseLabel(snapshot?.currentPhase) ?? 'Unknown phase',
    [snapshot?.currentPhase],
  );
  const cyclePhaseSourceLabel = useMemo(
    () => formatPhaseSourceLabel(snapshot?.phaseSource ?? null),
    [snapshot?.phaseSource],
  );
  const cyclePhaseDisplayLabel = useMemo(
    () =>
      cyclePhaseSourceLabel
        ? `${cyclePhaseLabel} (${cyclePhaseSourceLabel})`
        : cyclePhaseLabel,
    [cyclePhaseLabel, cyclePhaseSourceLabel],
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
    const elapsedDays = Math.max(
      0,
      Math.floor((startOfToday - startOfLatest) / (24 * 60 * 60 * 1000)),
    );
    const cycleLength = snapshot?.cycleLengthDays ?? 28;
    return (elapsedDays % cycleLength) + 1;
  }, [snapshot?.cycleLengthDays, snapshot?.latestSampleStart]);

  const cycleLengthDays = snapshot?.cycleLengthDays ?? 28;
  const monthlyTracked = Math.max(
    1,
    Math.min(12, Math.round((snapshot?.samples.length ?? 0) / 5) || 6),
  );

  const parseGuideText = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return { title: 'Tip', body: '' };
    }
    const parts = trimmed.split(':');
    if (parts.length > 1) {
      return {
        title: parts[0].trim(),
        body: parts.slice(1).join(':').trim(),
      };
    }
    const words = trimmed.split(/\s+/);
    const title = words.slice(0, Math.min(3, words.length)).join(' ');
    return { title, body: trimmed };
  };

  const doThemes: DottieTheme[] = ['hydrate', 'movement', 'nourish'];
  const dontThemes: DottieTheme[] = ['caffeine', 'overcommit', 'workouts'];
  const doPalette = [
    { bg: '#EEF3F8', color: '#6B8DB5' },
    { bg: '#EDF5F0', color: '#7BA68F' },
    { bg: '#FFF8ED', color: '#D4A252' },
  ];
  const dontPalette = [
    { bg: '#FFF0EB', color: '#C4654A' },
    { bg: '#EEF3F8', color: '#6B8DB5' },
    { bg: '#EDF5F0', color: '#7BA68F' },
  ];

  const doCards = phaseDos.map((item, index) => {
    const parsed = parseGuideText(item);
    return {
      ...parsed,
      ...doPalette[index % doPalette.length],
      theme: doThemes[index % doThemes.length],
    };
  });

  const dontCards = phaseDonts.map((item, index) => {
    const parsed = parseGuideText(item);
    return {
      ...parsed,
      ...dontPalette[index % dontPalette.length],
      theme: dontThemes[index % dontThemes.length],
    };
  });
  const entranceStyles = useStaggeredEntrance(5, {
    initialDelay: 40,
    stagger: 80,
    distance: 14,
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Animated.View style={entranceStyles[0]}>
          <View style={styles.headerRow}>
          <View style={styles.headerIdentity}>
            <Pressable
              style={styles.avatarPress}
              onPress={handleAvatarPress}
              accessibilityRole="button"
              accessibilityLabel="Choose profile photo"
              accessibilityState={{ disabled: isAvatarBusy }}
            >
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
                <PhaseAvatar initial={avatarInitial} phase={cyclePhaseKey} size={56} />
              )}
            </Pressable>
            <View style={styles.identityMeta}>
              <Text style={styles.profileName}>{displayName}</Text>
              {displayEmail ? <Text style={styles.profileEmail}>{displayEmail}</Text> : null}
              {isAvatarBusy ? <Text style={styles.inlineStatus}>Glamifying your photo...</Text> : null}
              {avatarError ? <Text style={styles.inlineError}>{avatarError}</Text> : null}
            </View>
          </View>

          <TouchableOpacity
            style={styles.settingsButton}
            onPress={navigateToAutoPostSettings}
            accessibilityRole="button"
            accessibilityLabel="Open auto-post settings"
          >
            <Ionicons name="settings-outline" size={19} color="#8A857E" />
          </TouchableOpacity>
          </View>
        </Animated.View>

        <Animated.View style={entranceStyles[1]}>
          <View style={[styles.heroCard, { backgroundColor: getPhaseBg(cyclePhaseKey) }]}>
            <CycleRing currentDay={cycleDayNumber ?? 1} currentPhase={cyclePhaseKey} size={180} />
            <View style={styles.heroPhaseWrap}>
              <PhaseIndicator phase={cyclePhaseKey} />
            </View>
            <View style={styles.heroMascot}>
              <DottieMascot size={64} mood="meditating" color={getPhaseColor(cyclePhaseKey)} />
            </View>
          </View>
        </Animated.View>

        <Animated.View style={entranceStyles[2]}>
          <View style={styles.recapBlock}>
          <Text style={styles.recapEyebrow}>Your Monthly Recap</Text>

          <View style={styles.recapLargeCard}>
            <Text style={styles.recapLargeLabel}>Cycle Length</Text>
            <Text style={styles.recapLargeHint}>Right on track!</Text>
            <View style={styles.recapValueRow}>
              <Text style={styles.recapLargeValue}>{cycleLengthDays}</Text>
              <Text style={styles.recapLargeSuffix}>days</Text>
            </View>
          </View>

          <View style={styles.recapGrid}>
            <View style={[styles.recapSmallCard, { backgroundColor: '#EDF5F0' }]}>
              <Text style={[styles.recapSmallLabel, { color: '#7BA68F' }]}>Current Day</Text>
              <View style={styles.recapValueRow}>
                <Text style={styles.recapSmallValue}>{cycleDayNumber ?? '--'}</Text>
                <Text style={styles.recapSmallSuffix}>of {cycleLengthDays}</Text>
              </View>
            </View>

            <View style={[styles.recapSmallCard, { backgroundColor: '#FFF8ED' }]}>
              <Text style={[styles.recapSmallLabel, { color: '#D4A252' }]}>Tracked</Text>
              <View style={styles.recapValueRow}>
                <Text style={styles.recapSmallValue}>{monthlyTracked}</Text>
                <Text style={styles.recapSmallSuffix}>months</Text>
              </View>
            </View>
          </View>
          </View>
        </Animated.View>

        <Text style={styles.sectionTitle}>Phase Guide</Text>

        <Text style={styles.doLabel}>Do&apos;s</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.guideRow}
        >
          {doCards.length ? (
            doCards.map((card, index) => (
              <FlipGuideCard
                key={`do-${index}`}
                title={card.title}
                body={card.body}
                bg={card.bg}
                color={card.color}
                theme={card.theme}
                accessibilityLabel={`Flip do card ${card.title}`}
              />
            ))
          ) : (
            <Text style={styles.emptyInlineText}>{guidanceEmptyLabel}</Text>
          )}
        </ScrollView>

        <Text style={styles.dontLabel}>Don&apos;ts</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.guideRow}
        >
          {dontCards.length ? (
            dontCards.map((card, index) => (
              <FlipGuideCard
                key={`dont-${index}`}
                title={card.title}
                body={card.body}
                bg={card.bg}
                color={card.color}
                theme={card.theme}
                accessibilityLabel={`Flip don't card ${card.title}`}
              />
            ))
          ) : (
            <Text style={styles.emptyInlineText}>{guidanceEmptyLabel}</Text>
          )}
        </ScrollView>

        <Text style={styles.sectionTitle}>Friends In Sync</Text>
        <View style={styles.friendsCard}>
          {friendSuggestions.length ? (
            friendSuggestions.map((item, index) => {
              const friendName = item.friend_name ?? `Friend ${shortId(item.friend_id)}`;
              const initial = friendName.trim().slice(0, 1).toUpperCase() || '?';
              const phaseColor = getPhaseColor(cyclePhaseKey);
              return (
                <TouchableOpacity
                  key={`${item.friend_id}-${index}`}
                  style={styles.friendRow}
                  onPress={() => navigateToFriendSync(item.friend_id)}
                  accessibilityLabel={`View sync with ${friendName}`}
                >
                  <PhaseAvatar initial={initial} phase={cyclePhaseKey} size={42} />
                  <View style={styles.friendMeta}>
                    <View style={styles.friendMetaTitle}>
                      <Text style={styles.friendName}>{friendName}</Text>
                      <View style={[styles.friendPhaseBadge, { backgroundColor: `${phaseColor}14` }]}>
                        <View style={[styles.friendPhaseDot, { backgroundColor: phaseColor }]} />
                        <Text style={[styles.friendPhaseText, { color: phaseColor }]}>Sync</Text>
                      </View>
                    </View>
                    <Text style={styles.friendNote} numberOfLines={1}>
                      {item.suggestion}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#DDD9D3" />
                  {index < friendSuggestions.length - 1 ? <View style={styles.friendDivider} /> : null}
                </TouchableOpacity>
              );
            })
          ) : (
            <Text style={styles.emptyInlineText}>{friendsEmptyLabel}</Text>
          )}
        </View>

        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.accountCard}>
          <TouchableOpacity style={[styles.accountRow, styles.accountRowDivider]} onPress={navigateToAutoPostSettings}>
            <Ionicons name="settings-outline" size={18} color="#8A857E" />
            <Text style={styles.accountRowText}>Post Settings</Text>
            <Ionicons name="chevron-forward" size={16} color="#DDD9D3" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.accountRow, styles.accountRowDivider, accountAction !== 'idle' ? styles.buttonDisabled : null]}
            onPress={handleSignOut}
            disabled={accountAction !== 'idle'}
          >
            <Ionicons name="log-out-outline" size={18} color="#C4654A" />
            <Text style={styles.accountSignOutText}>
              {accountAction === 'signingOut' ? 'Signing out...' : 'Sign out'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.accountRow, accountAction !== 'idle' ? styles.buttonDisabled : null]}
            onPress={confirmDeleteAccount}
            disabled={accountAction !== 'idle'}
          >
            <Ionicons name="trash-outline" size={18} color="#D4A252" />
            <Text style={styles.accountDeleteText}>
              {accountAction === 'deleting' ? 'Deleting...' : 'Delete account'}
            </Text>
          </TouchableOpacity>

          {accountError ? <Text style={styles.inlineError}>{accountError}</Text> : null}
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
    paddingTop: 14,
    paddingBottom: 120,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  headerIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatarPress: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    resizeMode: 'cover',
  },
  identityMeta: {
    flex: 1,
    minWidth: 0,
  },
  profileName: {
    fontSize: 22,
    color: '#2D2A26',
    ...brandType.display,
  },
  profileEmail: {
    fontSize: 13,
    color: '#8A857E',
    marginTop: 0.5,
    letterSpacing: 0.2,
    ...brandType.body,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0EDE8',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...brand.shadow.soft,
  },
  inlineStatus: {
    marginTop: 3,
    fontSize: 12,
    color: '#C4654A',
    ...brandType.semibold,
  },
  inlineError: {
    marginTop: 6,
    fontSize: 12,
    color: '#C4654A',
    ...brandType.body,
  },
  heroCard: {
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    overflow: 'hidden',
  },
  heroPhaseWrap: {
    marginTop: 10,
  },
  heroMascot: {
    position: 'absolute',
    right: -4,
    bottom: -2,
    opacity: 0.32,
  },
  recapBlock: {
    marginBottom: 18,
  },
  recapEyebrow: {
    fontSize: 10,
    color: '#8A857E',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    ...brandType.semibold,
  },
  recapLargeCard: {
    borderRadius: 24,
    backgroundColor: '#EEF3F8',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  recapLargeLabel: {
    fontSize: 10,
    color: '#6B8DB5',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    ...brandType.semibold,
  },
  recapLargeHint: {
    fontSize: 12,
    color: '#8A857E',
    marginBottom: 3,
    ...brandType.body,
  },
  recapValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
  },
  recapLargeValue: {
    fontSize: 58,
    lineHeight: 66,
    paddingTop: 2,
    color: '#2D2A26',
    ...brandType.display,
  },
  recapLargeSuffix: {
    fontSize: 14,
    color: '#8A857E',
    marginBottom: 8,
    ...brandType.body,
  },
  recapGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  recapSmallCard: {
    flex: 1,
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  recapSmallLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 3,
    ...brandType.semibold,
  },
  recapSmallValue: {
    fontSize: 40,
    lineHeight: 46,
    paddingTop: 1,
    color: '#2D2A26',
    ...brandType.display,
  },
  recapSmallSuffix: {
    fontSize: 12,
    color: '#8A857E',
    marginBottom: 6,
    ...brandType.body,
  },
  sectionTitle: {
    fontSize: 28,
    color: '#2D2A26',
    marginBottom: 8,
    ...brandType.display,
  },
  doLabel: {
    fontSize: 12,
    color: '#7BA68F',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    ...brandType.semibold,
  },
  dontLabel: {
    fontSize: 12,
    color: '#C4654A',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 8,
    marginBottom: 8,
    ...brandType.semibold,
  },
  guideRow: {
    gap: 10,
    paddingBottom: 10,
    paddingRight: 2,
  },
  flipCardWrap: {
    width: 150,
    height: 158,
  },
  flipCardPerspective: {
    flex: 1,
    position: 'relative',
  },
  flipCardFace: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 22,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backfaceVisibility: 'hidden',
  },
  flipCardFront: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  flipCardBack: {
    justifyContent: 'center',
  },
  flipCardTitle: {
    marginTop: 6,
    fontSize: 13,
    textAlign: 'center',
    ...brandType.semibold,
  },
  flipCardHint: {
    position: 'absolute',
    bottom: 8,
    fontSize: 9,
    color: '#B5AFA7',
    ...brandType.body,
  },
  flipCardBody: {
    fontSize: 11,
    color: '#5A564F',
    lineHeight: 16,
    textAlign: 'center',
    ...brandType.body,
  },
  emptyInlineText: {
    fontSize: 13,
    color: '#8A857E',
    ...brandType.body,
  },
  friendsCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F0EDE8',
    backgroundColor: '#FFFFFF',
    marginBottom: 18,
    overflow: 'hidden',
    ...brand.shadow.card,
  },
  friendRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  friendMeta: {
    flex: 1,
    marginLeft: 10,
    marginRight: 8,
  },
  friendMetaTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  friendName: {
    fontSize: 14,
    color: '#2D2A26',
    ...brandType.semibold,
  },
  friendPhaseBadge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  friendPhaseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  friendPhaseText: {
    fontSize: 10,
    ...brandType.semibold,
  },
  friendNote: {
    fontSize: 12,
    color: '#8A857E',
    ...brandType.body,
  },
  friendDivider: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 0,
    height: 1,
    backgroundColor: '#F3F0EC',
  },
  accountCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F0EDE8',
    backgroundColor: '#FFFFFF',
    marginBottom: 18,
    overflow: 'hidden',
    ...brand.shadow.card,
  },
  accountRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
  },
  accountRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F0EC',
  },
  accountRowText: {
    flex: 1,
    fontSize: 14,
    color: '#5A564F',
    ...brandType.body,
  },
  accountSignOutText: {
    flex: 1,
    fontSize: 14,
    color: '#C4654A',
    ...brandType.semibold,
  },
  accountDeleteText: {
    flex: 1,
    fontSize: 14,
    color: '#D4A252',
    ...brandType.semibold,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

export default ProfileScreen;
