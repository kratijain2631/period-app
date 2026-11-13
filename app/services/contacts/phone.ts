import { isSupportedCountry, parsePhoneNumberFromString } from 'libphonenumber-js/min';

export function normalizeContactPhone(input: string, country?: string) {
  const region = country?.toUpperCase();
  const parsed = parsePhoneNumberFromString(input, {
    defaultCountry: region && isSupportedCountry(region) ? region : undefined,
    extract: false,
  });
  return parsed?.isPossible() ? parsed.number : undefined;
}

export function phoneFromFields(callingCode: string, national: string) {
  if (!/^\+?[1-9]\d{0,2}$/.test(callingCode) || !/^[\d\s().-]+$/.test(national)) return undefined;
  const digits = callingCode.replace(/^\+/, '');
  const parsed = parsePhoneNumberFromString('+' + digits + ' ' + national, { extract: false });
  return parsed?.countryCallingCode === digits && parsed.isPossible() ? parsed.number : undefined;
}
