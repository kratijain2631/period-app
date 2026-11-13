import { formatPhaseName } from '../phaseName';

describe('formatPhaseName', () => {
  it('capitalizes phase names', () => {
    expect(formatPhaseName('follicular')).toBe('Follicular');
    expect(formatPhaseName('menstrual_flow')).toBe('Menstrual flow');
  });

  it('writes PMS as an acronym', () => {
    expect(formatPhaseName('pms')).toBe('PMS');
  });
});
