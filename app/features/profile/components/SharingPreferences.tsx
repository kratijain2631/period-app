import { View } from 'react-native';
import { ActionButton, AppText, Surface } from '../../../components/ui/WidgetPrimitives';
import type { AutoPostSettings } from '../../../services/healthkit/autoPostSettings';
import { PostSettingsRows } from './PostSettingsRows';
import { RankingVisibilityRow } from './RankingVisibilityRow';

export function SharingPreferences({ ranked, onRanked, posts, onPosts, busy, message, onContinue }: {
  ranked: boolean;
  onRanked: (next: boolean) => void;
  posts: AutoPostSettings;
  onPosts: (next: AutoPostSettings) => void;
  busy: boolean;
  message?: string;
  onContinue: () => void;
}) {
  return (
    <View style={{ gap: 14 }}>
      <AppText role="heading" accessibilityRole="header">Choose what you share</AppText>
      <AppText>You can change these choices anytime in Settings.</AppText>
      <Surface>
        <RankingVisibilityRow enabled={ranked} onChange={onRanked} busy={busy} />
      </Surface>
      <PostSettingsRows value={posts} onChange={onPosts} disabled={busy} />
      {message && <AppText accessibilityRole="alert">{message}</AppText>}
      <ActionButton label={busy ? 'Saving…' : 'Save and continue'} disabled={busy} onPress={onContinue} />
    </View>
  );
}
