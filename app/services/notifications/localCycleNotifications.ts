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

// Human-friendly phase name for reminder copy ("period" reads better than
// "menstruation" mid-sentence).
const phaseWord = (phase: string): string => (phase === 'menstruation' ? 'period' : phase);

const PHASE_REMINDER_ID = 'cycle-phase-reminder';

// Schedule a reliable local reminder for the predicted next phase transition, so
// the user gets a lock-screen nudge to open + share around the change — even if
// the app is closed (scheduled local notifications fire regardless of app state,
// unlike background execution). Re-called on each sync; always clears the prior
// reminder first so the prediction stays current. No-ops without permission.
export const scheduleUpcomingPhaseReminder = async (
  nextPhaseStart: string | null | undefined,
  nextPhase: string | null | undefined,
): Promise<void> => {
  try {
    await Notifications.cancelScheduledNotificationAsync(PHASE_REMINDER_ID).catch(() => {});
    if (!nextPhaseStart || !nextPhase) {
      return;
    }
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      return;
    }
    const when = new Date(nextPhaseStart);
    if (Number.isNaN(when.getTime())) {
      return;
    }
    when.setHours(10, 0, 0, 0); // fire at 10am local on the predicted day
    if (when.getTime() <= Date.now()) {
      return; // never schedule in the past
    }
    const word = phaseWord(nextPhase);
    const body =
      nextPhase === 'menstruation'
        ? 'Your period is starting soon — open to share with your circle 💬'
        : `Your ${word} phase is starting soon — open to share with your circle 💬`;
    await Notifications.scheduleNotificationAsync({
      identifier: PHASE_REMINDER_ID,
      content: {
        title: 'Cycle heads-up',
        body,
        data: { type: 'phase_reminder', phase: nextPhase },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when },
    });
  } catch (error) {
    console.warn('[cycle-notify] Failed to schedule phase reminder', error);
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
