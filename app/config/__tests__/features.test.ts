import { isPhoneVerificationEnabled } from '../features';

describe('isPhoneVerificationEnabled', () => {
  it('is off unless the flag is exactly "true"', () => {
    expect(isPhoneVerificationEnabled(undefined)).toBe(false);
    expect(isPhoneVerificationEnabled('')).toBe(false);
    expect(isPhoneVerificationEnabled('false')).toBe(false);
    expect(isPhoneVerificationEnabled('1')).toBe(false);
  });

  it('is on when the flag is "true"', () => {
    expect(isPhoneVerificationEnabled('true')).toBe(true);
  });
});
