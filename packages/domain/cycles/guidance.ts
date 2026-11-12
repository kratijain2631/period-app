// Available immediately, including offline and before the first Health sync.
// Editorial basis and limits: docs/GUIDANCE.md. Phases are context, not rules.
const phaseTips: Record<string, { dos: string[]; donts: string[] }> = {
  menstruation: {
    dos: [
      'Try warmth: If cramps bother you, try a warm shower or a heat pad wrapped in a towel.',
      'Move for comfort: A short walk or gentle stretch is an option if it feels good.',
      'Make a comfort plan: Keep your preferred period supplies handy and leave room for a break.',
    ],
    donts: [
      'Pushing through pain: Adjust your plans if you need to. Pain that disrupts daily life deserves medical attention.',
      'An all-or-nothing workout: Shorten or change a session if it feels uncomfortable.',
      'Comparing your period: Notice your own patterns rather than measuring your experience against a friend’s.',
    ],
  },
  follicular: {
    dos: [
      'Start small: If you feel like trying something new, choose one manageable step today.',
      'Find your movement: Pick an activity you enjoy and adjust the pace to how you feel.',
      'Make a friend plan: Suggest a walk or catch-up with someone in your circle.',
    ],
    donts: [
      'Assuming a surge: You do not have to feel more energetic just because your estimated phase changed.',
      'Filling every gap: Leave some breathing room when you add plans to your calendar.',
      'Skipping recovery: Keep time for rest even when you feel ready to do more.',
    ],
  },
  ovulation: {
    dos: [
      'Connect your way: Invite a friend to something you would enjoy, whether that is coffee or a quiet walk.',
      'Check your pace: Choose movement based on today’s comfort, rather than a predicted energy peak.',
      'Keep a little space: Add a break between plans so you have time to reset.',
    ],
    donts: [
      'Pressure to perform: You do not owe anyone a social, productive or high-energy day.',
      'Overbooking the week: Choose the plans you want and leave room to change your mind.',
      'Letting a label lead: Your own comfort matters more than a calendar prediction.',
    ],
  },
  luteal: {
    dos: [
      'Keep sleep steady: Give yourself a familiar wind-down routine and enough time to sleep.',
      'Keep meals regular: Make room for balanced meals and a snack when you are hungry.',
      'Notice your pattern: Jot down changes in sleep, mood or comfort to learn what is usual for you.',
    ],
    donts: [
      'Expecting a slump: This phase does not decide your mood or ability. Start with how you actually feel.',
      'Stacking commitments: Leave an easy way to shorten or reschedule plans if you need one.',
      'Pushing past fatigue: Take a break or change the pace when your body asks for it.',
    ],
  },
  pms: {
    dos: [
      'Track what changes: Note symptoms over a couple of cycles so patterns are easier to spot.',
      'Make room to unwind: Try a short walk, a stretch or a few quiet minutes if that feels helpful.',
      'Ask for company: Tell a trusted friend what would help, from a check-in to a low-key evening.',
    ],
    donts: [
      'Brushing symptoms aside: If symptoms affect daily life, talk with a healthcare professional about support.',
      'Giving up sleep: Protect some wind-down time when you can, especially if sleep has been unsettled.',
      'Blaming yourself: Changes in how you feel are worth care, rather than criticism.',
    ],
  },
  unknown: {
    dos: [
      'Start with a check-in: Notice your comfort, energy and mood before choosing what today needs.',
      'Choose enjoyable movement: Try an activity that suits you, with room to change the pace.',
      'Keep a simple note: Record anything you want to remember about your period or symptoms.',
    ],
    donts: [
      'Guessing your phase: You can use these everyday ideas while your cycle information is unavailable.',
      'Following a rigid plan: Adapt suggestions to your own preferences and how you feel.',
      'Overlooking support: Ask someone you trust for company or practical help when you want it.',
    ],
  },
};

// Older cached tips can be a plain sentence; show it once instead of inventing
// a three-word heading and repeating the same sentence underneath it.
export const splitGuidanceTip = (value: string): { title: string; body: string | null } => {
  const trimmed = value.trim();
  const separator = trimmed.indexOf(':');
  if (separator > 0 && trimmed.slice(separator + 1).trim()) {
    return { title: trimmed.slice(0, separator).trim(), body: trimmed.slice(separator + 1).trim() };
  }
  return { title: trimmed, body: null };
};

export const fallbackPhaseGuidance = (phase?: string | null) => {
  const key = phase ?? 'unknown';
  return Object.prototype.hasOwnProperty.call(phaseTips, key) ? phaseTips[key] : phaseTips.unknown;
};

export type PhaseGuidance = {
  phase: string | null;
  phase_started_at?: string | null;
  dos: string[];
  donts: string[];
};

export const guidanceMatchesPhase = (
  guidance: PhaseGuidance | null,
  phase: string,
  phaseStart: string | null,
): boolean => Boolean(
  guidance && guidance.phase === phase &&
  (guidance.phase_started_at ?? null) === phaseStart &&
  guidance.dos.length && guidance.donts.length,
);

export const resolvePhaseGuidance = (
  guidance: PhaseGuidance | null,
  phase: string,
  phaseStart: string | null,
) => guidanceMatchesPhase(guidance, phase, phaseStart)
  ? guidance!
  : fallbackPhaseGuidance(phase);
