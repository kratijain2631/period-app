jest.mock('@kingstinct/react-native-healthkit', () => ({
  isHealthDataAvailable: jest.fn(),
  requestAuthorization: jest.fn(),
  queryCategorySamples: jest.fn(),
  authorizationStatusFor: jest.fn(),
  AuthorizationStatus: {
    sharingAuthorized: 2,
  },
  CategoryValueMenstrualFlow: {
    none: 5,
  },
}));

import {
  BASAL_BODY_TEMPERATURE_IDENTIFIER,
  CERVICAL_MUCUS_IDENTIFIER,
  MENSTRUAL_FLOW_IDENTIFIER,
  OVULATION_TEST_IDENTIFIER,
  PROGESTERONE_TEST_IDENTIFIER,
  cycleReadTypes,
} from '../healthkitClient';

describe('healthkitClient cycle signal wiring', () => {
  it('includes all menstrual + optional signal identifiers in read permissions', () => {
    expect(cycleReadTypes).toEqual(
      expect.arrayContaining([
        MENSTRUAL_FLOW_IDENTIFIER,
        OVULATION_TEST_IDENTIFIER,
        PROGESTERONE_TEST_IDENTIFIER,
        CERVICAL_MUCUS_IDENTIFIER,
        BASAL_BODY_TEMPERATURE_IDENTIFIER,
      ]),
    );
    expect(new Set(cycleReadTypes).size).toBe(cycleReadTypes.length);
  });
});
