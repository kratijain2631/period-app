import { Pressable, View } from 'react-native';
import { AppText } from '../../../components/ui/WidgetPrimitives';
import { useWidgetTheme } from '../../../theme/widgetTheme';
import type { ActivityItemModel } from '../models/activity';

export const ReactionBar = ({
  reactions,
  disabled,
  onReact,
  onChoose,
  onInspect,
}: {
  reactions: ActivityItemModel['reactions'];
  disabled: boolean;
  onReact: (emoji: string) => void;
  onChoose: () => void;
  onInspect: (value: string | null) => void;
}) => {
  const t = useWidgetTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {reactions
        .filter((r) => r.count > 0)
        .map((r) => (
          <Pressable
            key={r.emoji}
            onLongPress={() => onInspect(r.emoji)}
            accessibilityHint="Hold to see who reacted"
            accessibilityActions={[{ name: 'showPeople', label: 'Show who reacted' }]}
            onAccessibilityAction={e => { if (e.nativeEvent.actionName === 'showPeople') onInspect(r.emoji); }}
            onPress={() => { if (!disabled) onReact(r.emoji); }}
            accessibilityRole="button"
            accessibilityLabel={`${r.emoji}, ${r.count} reactions`}
            accessibilityState={{ selected: r.selected }}
            style={{
              minHeight: 44,
              minWidth: 44,
              paddingHorizontal: 10,
              justifyContent: 'center',
              borderRadius: 22,
              backgroundColor: r.selected ? t.colors.upcoming : t.colors.subtle,
              borderWidth: 1,
              borderColor: r.selected ? t.colors.accent : t.colors.border,
            }}
          >
            <AppText>
              {r.emoji} {r.count}
            </AppText>
          </Pressable>
        ))}
      <Pressable
        onLongPress={() => onInspect(null)}
        accessibilityHint="Hold to see all reactions and boops"
        accessibilityActions={[{ name: 'showPeople', label: 'Show reactions and boops' }]}
        onAccessibilityAction={e => { if (e.nativeEvent.actionName === 'showPeople') onInspect(null); }}
        onPress={() => { if (!disabled) onChoose(); }}
        accessibilityRole="button"
        accessibilityLabel="Choose a reaction"
        style={{ minHeight: 44, paddingHorizontal: 12, justifyContent: 'center', opacity: disabled ? 0.5 : 1 }}
      >
        <AppText style={{ color: t.colors.accent, fontFamily: t.type.semibold }}>♡ React</AppText>
      </Pressable>
    </View>
  );
};

export const BoopAction = ({
  count,
  status,
  disabled,
  onBoop,
  onInspect,
}: {
  count: number;
  status: ActivityItemModel['boopStatus'];
  disabled: boolean;
  onBoop: () => void;
  onInspect: () => void;
}) => {
  const t = useWidgetTheme();
  const label =
    status === 'queued'
      ? 'Boop queued'
      : status === 'sent'
        ? 'Booped'
        : status === 'sending'
          ? 'Sending…'
          : 'Boop';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}${count ? `, ${count} boops` : ''}`}
      accessibilityHint="Hold to see who booped"
      accessibilityActions={[{ name: 'showPeople', label: 'Show who booped' }]}
      onAccessibilityAction={e => { if (e.nativeEvent.actionName === 'showPeople') onInspect(); }}
      onLongPress={onInspect}
      onPress={() => { if (status === 'idle' && !disabled) onBoop(); else onInspect(); }}
      style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 12 }}
    >
      <AppText style={{ color: status === 'sent' ? t.colors.success : t.colors.secondary }}>
        ☞ {label}
        {count ? ` · ${count}` : ''}
      </AppText>
    </Pressable>
  );
};
