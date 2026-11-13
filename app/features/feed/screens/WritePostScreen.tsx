import { useNavigation } from '@react-navigation/native';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { selectIsOnline, useConnectionStore } from '../../../state/connectionStore';
import { useWidgetTheme } from '../../../theme/widgetTheme';
import { useSocial } from '../../social/SocialProvider';
import { PostComposer } from '../components/PostComposer';

export default function WritePostScreen() {
  const { composer } = useSocial().feed;
  const navigation = useNavigation();
  const offline = !useConnectionStore(selectIsOnline);
  const theme = useWidgetTheme();

  async function share() {
    const shared = await composer.submit();
    if (shared && navigation.isFocused()) navigation.goBack();
  }

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1, backgroundColor: theme.colors.canvas }}>
      <ScrollView
        contentContainerStyle={{ padding: 16 }}
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
      >
        <PostComposer
          text={composer.text}
          mood={composer.mood}
          posting={composer.posting}
          offline={offline}
          error={composer.error}
          onChangeText={composer.setText}
          onChangeMood={composer.setMood}
          onSubmit={share}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
