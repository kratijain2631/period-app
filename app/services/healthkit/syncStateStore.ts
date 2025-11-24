import AsyncStorage from '@react-native-async-storage/async-storage';

const CURSOR_KEY = 'cycle-sync-cursor';
const CURSOR_PHASE_KEY = 'cycle-sync-cursor-start';

export const getLastSyncCursor = async (): Promise<string | null> => {
  try {
    const value = await AsyncStorage.getItem(CURSOR_KEY);
    return value;
  } catch (error) {
    console.warn('[cycle-sync] Failed to read cursor', error);
    return null;
  }
};

export const setLastSyncCursor = async (cursor: string | null) => {
  try {
    if (!cursor) {
      await AsyncStorage.removeItem(CURSOR_KEY);
      await AsyncStorage.removeItem(CURSOR_PHASE_KEY);
      return;
    }
    await AsyncStorage.setItem(CURSOR_KEY, cursor);
    // Store the start time of this cursor window to avoid regressing
    await AsyncStorage.setItem(CURSOR_PHASE_KEY, new Date().toISOString());
  } catch (error) {
    console.warn('[cycle-sync] Failed to write cursor', error);
  }
};

export const resetSyncCursor = async () => {
  try {
    await AsyncStorage.removeItem(CURSOR_KEY);
    await AsyncStorage.removeItem(CURSOR_PHASE_KEY);
  } catch (error) {
    console.warn('[cycle-sync] Failed to reset cursor', error);
  }
};
