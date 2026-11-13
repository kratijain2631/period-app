import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, ActionButton } from '../../../components/ui/WidgetPrimitives';
import { useWidgetTheme } from '../../../theme/widgetTheme';
import { reactionEmojis } from '../models/activity';

export const ReactionPicker = ({
  visible,
  quickReactions,
  onSelect,
  onClose,
}: {
  visible: boolean;
  quickReactions: string[];
  onSelect: (emoji: string) => void;
  onClose: () => void;
}) => {
  const t = useWidgetTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000055' }}>
        <Pressable
          accessibilityLabel="Dismiss reactions"
          accessibilityRole="button"
          onPress={onClose}
          style={{ flex: 1 }}
        />
        <View
          accessibilityViewIsModal
          style={{
            maxHeight: '80%',
            backgroundColor: t.colors.surface,
            padding: 22,
            paddingBottom: Math.max(22, insets.bottom),
            borderTopLeftRadius: t.radius.card,
            borderTopRightRadius: t.radius.card,
          }}
        >
          <AppText role="heading" accessibilityRole="header">
            Send a little feeling
          </AppText>
          <ScrollView
            contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 18 }}
          >
            {[...new Set([...quickReactions, ...reactionEmojis])].map((emoji) => (
              <Pressable
                key={emoji}
                accessibilityRole="button"
                accessibilityLabel={`React with ${emoji}`}
                onPress={() => onSelect(emoji)}
                style={{
                  minWidth: 48,
                  minHeight: 48,
                  padding: 8,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 14,
                  backgroundColor: t.colors.subtle,
                }}
              >
                <AppText style={{ fontSize: 25, lineHeight: 32 }}>{emoji}</AppText>
              </Pressable>
            ))}
          </ScrollView>
          <ActionButton outline label="CLOSE" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
};
