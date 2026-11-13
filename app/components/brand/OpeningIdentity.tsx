import { Image, Platform, Text, View } from 'react-native';
import { APP_TAGLINE, TAGLINE_LINES } from '../../config/branding';
import { AppText } from '../ui/WidgetPrimitives';
import { Wordmark } from './Wordmark';

export function OpeningIdentity() {
  return (
    <View style={{ alignItems: 'center', gap: 12 }}>
      <Image
        source={require('./assets/app-icon.png')}
        accessible={false}
        style={{ width: 142, height: 142, borderRadius: 38, marginBottom: 10 }}
      />
      <Wordmark />
      <AppText accessibilityLabel={APP_TAGLINE} style={{ textAlign: 'center', fontSize: 23, lineHeight: 32 }}>
        {TAGLINE_LINES.map(([lead, phrase], index) => (
          <Text key={lead}>
            {index > 0 ? '\n' : ''}
            {lead}{' '}
            <Text
              style={{
                fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia, serif' }),
                fontStyle: 'italic',
              }}
            >
              {phrase}
            </Text>
          </Text>
        ))}
      </AppText>
    </View>
  );
}
