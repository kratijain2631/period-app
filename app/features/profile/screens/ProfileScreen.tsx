import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Animated,
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
import {
  useFocusEffect,
  useNavigation,
  useRoute,
  type NavigationProp,
  type RouteProp,
} from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { selectAlias, selectSession, useSessionStore } from '../../../state/sessionStore';
import { fetchCurrentUserProfile, updateCurrentUserProfile } from '../../../services/supabase/users';
import { usePhaseGuidance } from '../hooks/usePhaseGuidance';
import { guidanceMatchesPhase, resolvePhaseGuidance } from '../../../../packages/domain/cycles/guidance';
import { countPeriods } from '../../../../packages/domain/cycles/models';
import { useCycleSnapshot } from '../../feed/hooks/useCycleSnapshot';
import { generateAvatarImage, uploadAvatarBlob } from '../../../services/supabase/avatars';
import { brand, brandType } from '../../../theme/brand';
import { CycleStatus } from '../../cycle/components/CycleStatus';
import { selectCycleOverview } from '../../cycle/models/cycleOverview';
import { ProfileIdentity, CycleMetrics } from '../components/ProfileWidgets';
import { PageHeading } from '../../../components/ui/ScreenControls';
import { ActionButton, AppText, Surface } from '../../../components/ui/WidgetPrimitives';
import { MemberUpdates } from '../../feed/components/SharedActivity';
import { PhaseGuide } from '../components/PhaseGuide';
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

type ProfileSections = { Settings: undefined; ProfileRoot: { section?: 'cycle' | 'guide' } | undefined };
const ProfileScreen = () => {
  const session = useSessionStore(selectSession);
  const alias = useSessionStore(selectAlias);
  const navigation = useNavigation<NavigationProp<ProfileSections>>();
  const route = useRoute<RouteProp<ProfileSections, 'ProfileRoot'>>();
  const scroll = useRef<ScrollView>(null);
  const [cycleY, setCycleY] = useState<number | null>(null);
  const [guideY, setGuideY] = useState<number | null>(null);
  const section = route.params?.section;
  const sectionY = section === 'guide' ? guideY : cycleY;
  useFocusEffect(
    useCallback(() => {
      if (!section || sectionY === null) return;
      const frame = requestAnimationFrame(() => {
        scroll.current?.scrollTo({ y: sectionY, animated: false });
        navigation.setParams({ section: undefined });
      });
      return () => cancelAnimationFrame(frame);
    }, [section, sectionY, navigation]),
  );
  const cycle = useCycleSnapshot();
  const { snapshot } = cycle;
  const overview = selectCycleOverview(cycle);
  const cyclePhaseKey = snapshot?.currentPhase ?? 'unknown';
  const cyclePhaseStart = snapshot?.currentPhaseStart ?? null;
  const [profileName, setProfileName] = useState('');
  const [profileBio, setProfileBio] = useState('');
  const [nameDraft, setNameDraft] = useState('');
  const [bioDraft, setBioDraft] = useState('');
  const [isBioEditing, setBioEditing] = useState(false);
  const [bioStatus, setBioStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const [isAvatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const {
    guidance: cycleGuidance,
    status: cycleGuidanceStatus,
    message: guidanceMessage,
    canRefresh: canRefreshGuidance,
    refresh: refreshGuidance,
  } = usePhaseGuidance(session?.userId, cyclePhaseKey, cyclePhaseStart);
  const loadProfile = useCallback(async () => {
    try {
      const data = await fetchCurrentUserProfile();
      if (data) {
        setProfileName(data.full_name ?? '');
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

  const handleSaveBio = useCallback(async () => {
    const trimmed = bioDraft.trim();
    if (trimmed.length > BIO_MAX_LENGTH) {
      setBioStatus('error');
      return;
    }
    setBioStatus('saving');
    try {
      await updateCurrentUserProfile({ fullName: nameDraft.trim() || null, bio: trimmed || null });
      setProfileName(nameDraft.trim());
      setProfileBio(trimmed);
      setBioEditing(false);
      setBioStatus('saved');
      setTimeout(() => setBioStatus('idle'), 1500);
    } catch (error) {
      console.warn('[profile] Failed to update bio', error);
      setBioStatus('error');
    }
  }, [bioDraft, nameDraft]);

  const handleStartBioEdit = useCallback(() => {
    setNameDraft(profileName);
    setBioDraft(profileBio);
    setBioStatus('idle');
    setBioEditing(true);
  }, [profileBio, profileName]);

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
            () => reject(new Error('This is taking longer than expected. Please try again.')),
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
        error instanceof Error && error.message ? error.message : 'Unable to glam your avatar right now.';
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

  const formatPhaseLabel = (value?: string | null) => {
    if (!value) {
      return null;
    }
    if (value === 'pms') return 'PMS';
    const normalized = value.replace(/_/g, ' ');
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  };

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const currentGuidance = guidanceMatchesPhase(cycleGuidance, cyclePhaseKey, cyclePhaseStart);
  const { dos: phaseDos, donts: phaseDonts } = resolvePhaseGuidance(cycleGuidance, cyclePhaseKey, cyclePhaseStart);
  const entranceStyles = useStaggeredEntrance(5, {
    initialDelay: 40,
    stagger: 80,
    distance: 14,
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView ref={scroll} contentContainerStyle={styles.content}>
        <View style={{ gap: 14, marginBottom: 14 }}>
          <PageHeading
            title="You"
            icon="settings-outline"
            action="Open settings"
            onPress={() => navigation.navigate('Settings')}
          />
          <ProfileIdentity
            profile={{ name: profileName || alias || 'You', alias: alias || '', bio: profileBio, avatarUrl }}
            onEdit={handleStartBioEdit}
            onOpen={() => session && (navigation as any).navigate('MemberProfile', { memberId: session.userId })}
          />
          {isBioEditing && (
            <Surface style={{ gap: 8 }}>
              <AppText role="heading">Edit profile</AppText>
              <TextInput
                accessibilityLabel="Display name"
                placeholder="Display name"
                value={nameDraft}
                maxLength={80}
                onChangeText={setNameDraft}
                style={{ minHeight: 44 }}
              />
              <TextInput
                accessibilityLabel="Bio"
                placeholder="A little about you"
                value={bioDraft}
                maxLength={BIO_MAX_LENGTH}
                onChangeText={setBioDraft}
                style={{ minHeight: 44 }}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Choose profile photo"
                onPress={handleAvatarPress}
                disabled={isAvatarBusy}
                style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8 }}
              >
                {avatarUrl && !avatarLoadFailed && (
                  <Image
                    source={{ uri: avatarUrl }}
                    style={styles.avatarImage}
                    onError={() => setAvatarLoadFailed(true)}
                  />
                )}
                <AppText>{isAvatarBusy ? 'Updating photo…' : 'Change profile photo'}</AppText>
              </Pressable>
              {avatarError && <AppText>{avatarError}</AppText>}
              {bioStatus === 'error' && <AppText>Couldn’t save your profile. Try again.</AppText>}
              <ActionButton label="Save changes" disabled={bioStatus === 'saving'} onPress={handleSaveBio} />
              <ActionButton outline label="Cancel" onPress={handleCancelBioEdit} />
            </Surface>
          )}
        </View>
        <Animated.View
          style={[entranceStyles[1], { marginBottom: 16 }]}
          onLayout={(e) => setCycleY(e.nativeEvent.layout.y)}
        >
          <CycleStatus model={overview} />
        </Animated.View>

        {overview.state === 'ready' && snapshot && (
          <View style={{ marginBottom: 14 }}>
            <CycleMetrics
              month={new Date().toLocaleDateString(undefined, { month: 'long' })}
              metrics={[
                {
                  label: 'Cycle length',
                  value: overview.cycleLength && countPeriods(snapshot.samples) >= 2 ? overview.cycleLength + 'd' : '—',
                },
                {
                  label: 'Period length',
                  value: snapshot.periodLengthDays ? snapshot.periodLengthDays + 'd' : '—',
                },
                {
                  label: 'Months tracked',
                  value: String(new Set(snapshot.samples.map((s) => s.startDate.slice(0, 7))).size),
                },
              ]}
            />
          </View>
        )}
        <View onLayout={(e) => setGuideY(e.nativeEvent.layout.y)}>
          <PhaseGuide
            dos={phaseDos}
            donts={phaseDonts}
            personalized={currentGuidance}
            onRefresh={refreshGuidance}
            refreshing={cycleGuidanceStatus === 'loading'}
            refreshDisabled={!canRefreshGuidance}
            message={guidanceMessage}
            phaseLabel={cyclePhaseKey === 'unknown' ? null : formatPhaseLabel(cyclePhaseKey)}
          />
        </View>

        <View style={{ marginTop: 14, gap: 8 }}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            My posts
          </Text>
          {session && <MemberUpdates memberId={session.userId} postsOnly />}
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
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    resizeMode: 'cover',
  },
  inlineError: {
    marginTop: 6,
    fontSize: 12,
    color: '#C4654A',
    ...brandType.body,
  },
  sectionTitle: {
    fontSize: 28,
    color: '#2D2A26',
    marginBottom: 8,
    ...brandType.display,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

export default ProfileScreen;
