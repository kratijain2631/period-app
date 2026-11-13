import { Pressable, View } from 'react-native';
import { AppText } from '../../../components/ui/WidgetPrimitives';
import { useWidgetTheme } from '../../../theme/widgetTheme';
import type { ActivityItemModel } from '../models/activity';

export const ReactionBar = ({ reactions, disabled, onReact, onChoose }: {
  reactions: ActivityItemModel['reactions']; disabled: boolean; onReact: (emoji: string) => void; onChoose: () => void;
}) => {
  const t = useWidgetTheme();
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
    {reactions.filter(r => r.count > 0).map(r => <Pressable key={r.emoji} disabled={disabled} onPress={() => onReact(r.emoji)}
      accessibilityRole="button" accessibilityLabel={`${r.emoji}, ${r.count} reactions`} accessibilityState={{ selected: r.selected, disabled }}
      style={{ minHeight: 44, minWidth: 44, paddingHorizontal: 10, justifyContent: 'center', borderRadius: 22,
        backgroundColor: r.selected ? t.colors.upcoming : t.colors.subtle, borderWidth: 1, borderColor: r.selected ? t.colors.accent : t.colors.border }}>
      <AppText>{r.emoji} {r.count}</AppText>
    </Pressable>)}
    <Pressable disabled={disabled} onPress={onChoose} accessibilityRole="button" accessibilityLabel="Choose a reaction" accessibilityState={{ disabled }}
      style={{ minHeight: 44, paddingHorizontal: 12, justifyContent: 'center', opacity: disabled ? 0.5 : 1 }}>
      <AppText style={{ color: t.colors.accent, fontFamily: t.type.semibold }}>♡ React</AppText>
    </Pressable>
  </View>;
};

export const BoopAction = ({ count, status, disabled, onBoop }: {
  count: number; status: ActivityItemModel['boopStatus']; disabled: boolean; onBoop: () => void;
}) => {
  const t = useWidgetTheme();
  const label = status === 'queued' ? 'Boop queued' : status === 'sent' ? 'Booped' : status === 'sending' ? 'Sending…' : 'Boop';
  return <Pressable accessibilityRole="button" accessibilityLabel={`${label}${count ? `, ${count} boops` : ''}`} accessibilityState={{ disabled: disabled || status !== 'idle' }}
    onPress={onBoop} disabled={disabled || status !== 'idle'} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 12 }}>
    <AppText style={{ color: status === 'sent' ? t.colors.success : t.colors.secondary }}>☞ {label}{count ? ` · ${count}` : ''}</AppText>
  </Pressable>;
};
