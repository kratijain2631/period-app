import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { brand } from '../../../theme/brand';

type FriendSyncButtonProps = {
  onPress: () => void;
};

const FriendSyncButton = ({ onPress }: FriendSyncButtonProps) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} accessibilityLabel="Friend sync">
      <Ionicons name="person-add-outline" size={18} color={brand.colors.secondaryText} />
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
});

export default FriendSyncButton;
