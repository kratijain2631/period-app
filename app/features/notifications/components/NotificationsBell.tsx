import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { brand, brandType } from '../../../theme/brand';
import { useWidgetTheme } from '../../../theme/widgetTheme';

type NotificationsBellProps = {
  count: number;
  onPress: () => void;
  appearance?: 'default' | 'widget';
};

const NotificationsBell = ({ count, onPress, appearance = 'default' }: NotificationsBellProps) => {
  const t = useWidgetTheme();
  const widget = appearance === 'widget';
  return (
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Open notifications${count ? `, ${count} unread` : ''}`} style={[styles.container, widget && { width: 46, height: 46, backgroundColor: t.colors.canvas, borderColor: t.colors.border, borderRadius: t.radius.control, shadowOpacity: 0 }]} onPress={onPress}>
      <Ionicons name={widget ? 'notifications' : 'notifications-outline'} size={widget ? 23 : 18} color={widget ? t.colors.text : brand.colors.secondaryText} />
      {count > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count > 99 ? '99+' : `${count}`}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 40,
    height: 40,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: brand.colors.separator,
    backgroundColor: brand.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...brand.shadow.soft,
  },
  badge: {
    position: 'absolute',
    right: -3,
    top: -3,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: brand.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 2,
    borderColor: brand.colors.white,
  },
  badgeText: {
    color: brand.colors.white,
    fontSize: 9,
    ...brandType.semibold,
  },
});

export default NotificationsBell;
