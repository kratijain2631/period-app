// Node stand-in for '@kingstinct/react-native-healthkit' used by the test-account
// scripts. Only the enum values the domain model reads are needed.
module.exports = {
  CategoryValueMenstrualFlow: {
    unspecified: 1,
    light: 2,
    medium: 3,
    heavy: 4,
    none: 5,
  },
  AuthorizationStatus: {
    notDetermined: 0,
    sharingDenied: 1,
    sharingAuthorized: 2,
  },
};
