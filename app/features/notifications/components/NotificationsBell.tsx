import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type NotificationsBellProps = {
  count: number;
  onPress: () => void;
};

const NotificationsBell = ({ count, onPress }: NotificationsBellProps) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <Ionicons name="notifications-outline" size={18} color="#111" />
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
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  badge: {
    position: 'absolute',
    right: 2,
    top: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#d93d3d',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});

export default NotificationsBell;
