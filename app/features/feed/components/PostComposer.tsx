import { TextInput, View, Pressable } from 'react-native';
import { AppText, Surface, ActionButton } from '../../../components/ui/WidgetPrimitives';
import { useWidgetTheme } from '../../../theme/widgetTheme';
import { moodOptions } from '../models/activity';

export const PostComposer = ({ text, mood, posting, offline, error, onChangeText, onChangeMood, onSubmit }: {
  text: string; mood: string | null; posting: boolean; offline: boolean; error: string | null;
  onChangeText: (text: string) => void; onChangeMood: (mood: string | null) => void; onSubmit: () => void;
}) => {
  const t = useWidgetTheme();
  return <Surface>
    <AppText role="heading" accessibilityRole="header">How’s your day?</AppText>
    <AppText role="caption" style={{ color: t.colors.secondary, marginTop: 2 }}>Share a little with your circle</AppText>
    <TextInput accessibilityLabel="Your circle update" placeholder="A small win, a big feeling…" placeholderTextColor={t.colors.secondary}
      value={text} onChangeText={onChangeText} multiline editable={!posting}
      style={{ color: t.colors.text, fontFamily: t.type.body, fontSize: 15, lineHeight: 23, minHeight: 90, paddingVertical: 15, textAlignVertical: 'top' }} />
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 14 }}>
      {moodOptions.map(option => <Pressable key={option.label} disabled={posting} accessibilityRole="button" accessibilityState={{ selected: mood === option.label, disabled: posting }}
        onPress={() => onChangeMood(mood === option.label ? null : option.label)}
        style={{ minHeight: 44, justifyContent: 'center', borderRadius: t.radius.control, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 7,
          borderColor: mood === option.label ? t.colors.accent : t.colors.border, backgroundColor: mood === option.label ? t.colors.upcoming : t.colors.surface }}>
        <AppText style={{ fontSize: 12 }}>{option.emoji} {option.label}</AppText>
      </Pressable>)}
    </View>
    {offline || error ? <AppText accessibilityRole="alert" style={{ color: t.colors.error, marginBottom: 10 }}>{offline ? 'You’re offline. Keep your draft here and post when you reconnect.' : error}</AppText> : null}
    <ActionButton label={posting ? 'SHARING…' : 'SHARE WITH YOUR CIRCLE'} onPress={onSubmit} disabled={posting || offline || (!text.trim() && !mood)} />
  </Surface>;
};
