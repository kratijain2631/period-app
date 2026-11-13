import type { CyclePhase } from '../../../../packages/domain/cycles/models';

export const phaseLabels: Record<CyclePhase, string> = {
  menstruation: 'Menstruation', follicular: 'Follicular', ovulation: 'Ovulation', luteal: 'Luteal', pms: 'PMS', unknown: 'Your cycle',
};
