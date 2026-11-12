// The attack matrix (supabase/security) runs against a real, seeded Supabase, so it's kept out
// of the normal `npm test` and run by `npm run test:security`.
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/supabase/security/**/*.test.ts'],
  transform: { '^.+\\.[jt]sx?$': 'babel-jest' },
  testTimeout: 30000,
  maxWorkers: 1,
};
