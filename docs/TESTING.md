# Testing

Read this guide alongside [INSTRUCTIONS.md](INSTRUCTIONS.md). Update it when the testing workflow changes.

## Local checks

Run `npm test` for the Jest suite and `npx tsc --noEmit` for TypeScript. For a user-visible change, also exercise the affected flow in the iOS simulator on staging. Record device-only checks separately if they are still pending.

## Staging and test accounts

Follow the [staging persona runbook](TEST_ACCOUNTS.md#testing-as-an-ai-agent) for environment setup, simulator launch, sign-in, and backend verification. It also lists the test accounts, their relationships, and their cycle histories. Use staging personas and synthetic health data for these checks. Verify the backend target before running any command that writes data.

| Task | Command |
| --- | --- |
| Restore the shared staging personas to their seeded state | `npm run test-accounts:seed` |
| Start Metro against staging with fake Health data | `npm run start:staging` |
| List actors and scenarios for multi-account tests | `npm run test-accounts:actors -- list` |
| Verify row-level security after access-rule changes | `npm run test-accounts:rls` |

Seeding resets all personas. Coordinate with anyone using them before resetting an in-progress scenario. For migration checks and deployment status, follow [DB_PUSH.md](DB_PUSH.md).

## Recording changes and results

When a persona, fixture, or setup step changes, update the [persona runbook](TEST_ACCOUNTS.md) and any affected steps above. Add a dated entry to [RELEASE_NOTES.md](RELEASE_NOTES.md) under `Unreleased` for staging or test-account changes, including changes made in a dashboard. Record the environment, build or commit, persona aliases, checks run, observed outcome, and pending checks. Link unresolved failures in [BUGS.md](BUGS.md) and follow-up work in [TODO.md](TODO.md). Use secret names when documenting access setup.
