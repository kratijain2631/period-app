import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TouchableOpacity } from 'react-native';

type FriendSyncButtonProps = {
  onPress: () => void;
};

const FriendSyncButton = ({ onPress }: FriendSyncButtonProps) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} accessibilityLabel="Friend sync">
      <Ionicons name="person-add-outline" size={18} color="#111" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
});

export default FriendSyncButton;
