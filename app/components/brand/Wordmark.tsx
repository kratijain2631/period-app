import { APP_NAME } from '../../config/branding';
import { useWidgetTheme } from '../../theme/widgetTheme';
import { AppText } from '../ui/WidgetPrimitives';

export function Wordmark() {
  const t = useWidgetTheme();
  return (
    <AppText
      accessibilityRole="header"
      style={{ fontFamily: t.type.display, fontSize: 34, lineHeight: 43, letterSpacing: -1, color: t.colors.accent }}
    >
      {APP_NAME.toLowerCase()}
    </AppText>
  );
}
