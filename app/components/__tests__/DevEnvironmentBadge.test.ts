import { devEnvironmentLabel } from '../DevEnvironmentBadge';

describe('devEnvironmentLabel', () => {
  it('never shows in release builds', () => {
    expect(devEnvironmentLabel(false, 'staging', 'true')).toBeNull();
  });

  it('labels staging and fake Health in dev builds', () => {
    expect(devEnvironmentLabel(true, 'staging', 'true')).toBe('STAGING · FAKE HEALTH');
    expect(devEnvironmentLabel(true, 'staging', undefined)).toBe('STAGING');
    expect(devEnvironmentLabel(true, undefined, 'true')).toBe('FAKE HEALTH');
  });

  it('shows nothing for a plain dev build on the default backend', () => {
    expect(devEnvironmentLabel(true, undefined, undefined)).toBeNull();
    expect(devEnvironmentLabel(true, 'production', 'false')).toBeNull();
  });
});
