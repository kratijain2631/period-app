// Feature switches read at build time from EXPO_PUBLIC_* variables.
//
// Phone verification needs an SMS provider configured in the target Supabase
// Auth project (see docs/TESTING.md → "Phone and email discovery"). Until that
// is set up and tested on production, keep it off: new accounts then finish
// setup with only an alias, and the phone section is hidden in contact details.
// Turn it on for a build by setting EXPO_PUBLIC_PHONE_VERIFICATION=true.
export function isPhoneVerificationEnabled(
  flag: string | undefined = process.env.EXPO_PUBLIC_PHONE_VERIFICATION,
): boolean {
  return flag === 'true';
}

export const PHONE_VERIFICATION_ENABLED = isPhoneVerificationEnabled();
