import * as Notifications from 'expo-notifications';

// A friendly headline for a phase transition. Local (on-device) notification —
// no Expo push token required, since it's the user's own device notifying them.
const phaseHeadline = (phase: string): string => {
  switch (phase) {
    case 'menstruation':
      return 'Your period phase has begun';
    case 'follicular':
      return "You've entered your follicular phase";
    case 'ovulation':
      return "You've entered your ovulation phase";
    case 'luteal':
      return "You've entered your luteal phase";
    case 'pms':
      return "You've entered your PMS phase";
    default:
      return 'Your cycle phase changed';
  }
};

// Deliver an immediate local notification for a background-detected phase change.
// No-ops silently if notification permission isn't granted.
export const schedulePhaseChangeNotification = async (phase: string): Promise<void> => {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      return;
    }
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Cycle update',
        body: phaseHeadline(phase),
        data: { type: 'phase_transition', phase },
      },
      trigger: null, // deliver now
    });
  } catch (error) {
    console.warn('[cycle-notify] Failed to schedule phase-change notification', error);
  }
};
