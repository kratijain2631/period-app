import { isSupportedCountry, parsePhoneNumberFromString } from 'libphonenumber-js/min';

export function normalizeContactPhone(input: string, country?: string) {
  const region = country?.toUpperCase();
  const parsed = parsePhoneNumberFromString(input, {
    defaultCountry: region && isSupportedCountry(region) ? region : undefined,
    extract: false,
  });
  return parsed?.isPossible() ? parsed.number : undefined;
}
