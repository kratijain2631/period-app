# Contacts discovery rollout verification

Status: **open**. Code/native integration shipped in TestFlight **1.0.12 (33)**. Live database and automated service checks passed **2026-11-03**; physical iPhone checks are being collected separately below. Do not equate mocked permission responses with native permission verification.

## Verified backend and automated checks — 2026-11-03

- Linked project: `mmomoyszozclfjdvjbeb`. Live `users.discoverable_by_contacts` is a non-null boolean with default `false`; `contact_friend_matches(text[], integer)` matches the checked-in migration, including the opt-in filter, caller exclusion, normalized email hashing and result cap. The migration was already applied; nothing was reapplied.
- Anonymous callers lack EXECUTE; authenticated callers have EXECUTE. Profile SELECT/UPDATE policies are owner-scoped.
- Ran [the transactional SQL regression](../supabase/tests/contact-friend-discovery.sql) against the linked live database. Three synthetic accounts were created within one transaction and **all changes rolled back**. Assertions passed for new-account defaults, owner-only reads/writes, matching only opted-in accounts, searching while the caller remains undiscoverable, self exclusion, trimming/lowercasing, empty/zero/negative limits, opt-out on the next lookup and missing caller ID.
- Contacts service Jest checks cover limited/full/denied/undetermined response mapping, explicit permission requests, Settings-based limited-access management, hash-only payloads, empty selections, denied reads and independent account-toggle reads/writes/failures. Controller regression checks also cover foreground Settings recovery, stale/in-flight results after revocation/account changes, progress/timeouts and toggle failures. Full `npm test -- --runInBand`: **98 passed, 1 optional architecture test skipped**. `tsc --noEmit`: passed.

To repeat backend checks, run as the database owner with the authenticated CLI:

```sh
supabase db query --linked --file supabase/tests/contact-friend-discovery.sql
npm test -- --runInBand
npx tsc --noEmit
```

For migration history and deployments, follow [DB_PUSH.md](DB_PUSH.md). This verification requires no deployment.

## Recovery build

**1.0.14 (35)** native build finished successfully: [EAS build](https://expo.dev/accounts/kratijain26/projects/period-app/builds/bf9a1168-1a04-430f-b342-bc6128d92fd8); [automatic submission](https://expo.dev/accounts/kratijain26/projects/period-app/submissions/dbea0ad5-7488-4cef-a16d-cb238d5050a6) failed (`ERRORED`, `EAS_ASC_REQUIRED_AGREEMENTS_MISSING_OR_EXPIRED`; rechecked 2026-11-11). Source tag `v1.0.14-build35`, commit `a67b00dd`. TestFlight availability and new-build device checks are not yet confirmed.

## Verification update — 2026-11-12

Use TestFlight **1.0.16 (37)** for the retry when visible; it carries the 1.0.15 (36) contacts recovery and adds the offline alias fix. Build 36’s upload finished and the owner reported using build 36; build 37’s upload is also finished, with its install visibility still unconfirmed. Both contacts Jest suites passed (29 tests); their service, controller and test files match the build 36 tag and are unchanged in the build 37 tag (verified by source diff). Local full suite: 118 passed, one skipped. No tester accounts or address books were used. The production SQL result above is from November 3. A fresh query was unavailable because the database hostname did not resolve. CoreDevice and CoreSimulator were unavailable in this session. All physical results below retain their original build attribution.

## Physical iPhone test setup

Use iOS 18+ for Limited Access and TestFlight 1.0.16 (37) when available (1.0.15 / 36 also contains the contacts recovery). Record the exact app version/build and iOS version. Two tester accounts, A and B, are needed for visible match/opt-out checks. On A's phone, save B's **actual account email** in a contact. Sign in with Apple “Hide My Email” can make this different from B's usual email; the email-only builds do not match by phone. Avoid changing real contacts unnecessarily: use a dedicated test contact and remove it afterward.

B controls their own “Let contacts find me” switch. A's Contacts permission determines which local contacts A can search. A's own discoverability switch is independent of A's ability to search.

| Check | Action and expected result | Device result |
|---|---|---|
| No unsolicited access | Open Circle before tapping Find Contacts: no permission prompt. A new account's discoverability starts off. | Pending |
| Denied | Tap Find Contacts, deny access: show explanatory copy and Open Contacts Settings; no lookup/results from inaccessible contacts. | Pending |
| Settings recovery | Use Open Contacts Settings, allow access, return directly to Circle: button/permission state updates without switching tabs or restarting. | Pending; source risk below |
| Limited | Allow only a selected contact containing B's email, with B discoverable: B matches. A contact outside the selection does not match. | 1.0.12: FAIL; two selected contacts, flash/no visible outcome, including after restart |
| Choose more | New build: tap Choose more contacts in Settings; adjust selected contacts there, return and tap Find Contacts. No native in-app picker should open. Empty selection works without error. | 1.0.12: FAIL; new-build retest pending |
| Full | Give Full Access, tap Find Contacts: all eligible email contacts can match, including ones excluded from the earlier limited selection. | 1.0.12: empty-match response observed; positive match still pending |
| Revocation/reduction | After results load, change access to None or reduce the limited selection, return: previously permitted local names/results disappear, including after a slow lookup completes. | Pending; source risk below |
| Independent toggle | With Contacts denied, turn A's discoverability on: a second permitted tester can find A. Turn A off: their next lookup omits A. Granting Contacts access never opts A in. | Pending; backend independence passed |
| Search with own toggle off | Leave A undiscoverable, grant A limited/full Contacts access: A can still find opted-in B. | Pending; backend passed |
| Opt-out/persistence | B switches off: A's next Find Contacts excludes B. Relaunch B's app: switch stays off. Repeat on → relaunch → match. | Pending; backend opt-in/out passed |
| Friendship | From an eligible result, send a request and accept on the other tester; verify Friends/Requested state and no duplicate request. | Pending |

Owner reported installed app version **1.0.12**, **iOS 26.6.2**, with **two selected contacts** under Limited Access on 2026-11-03. Both buttons flash without a visible outcome. Restarting and using only Find Contacts still flashes. Changing to Full Access hides Choose more contacts and produces the empty-match message. Native build number is not independently confirmed. A second tester is available. Owner also tried Full Access with that tester saved in Contacts and saw no match; their actual account-email match and discoverability opt-in are not yet confirmed, so this is inconclusive. Positive matching and toggle checks remain pending.

## Recovery implementation; physical verification still required

The screen now delegates contacts state/actions to `app/features/friends/hooks/useContactDiscovery.ts`. The controller refreshes permission on navigation focus and foreground, clears results when leaving the foreground or starting another lookup, and rejects late responses from an earlier access/account context. Lookup progress includes permission checks, waits are bounded to 15 seconds, and messages are beside the action. Toggle writes verify the account ID and never request Contacts permission.

The native access picker is no longer invoked: selected-contact management opens Settings instead. Apple acknowledges a [contact-access-picker defect](https://developer.apple.com/forums/thread/814292), and [Expo maintainers classify it as upstream](https://github.com/expo/expo/issues/46977). It is consistent with the picker symptom, but **the separate limited-read failure has not been diagnosed conclusively**. Native recovery/limited-read behavior must be retested; passing mocked lifecycle tests does not close that finding.

Close the rollout only after the physical matrix passes and permission recovery/invalidation findings are resolved. For the new phone/email client, run the additional checks in [TESTING.md](TESTING.md).


## Owner retry — 1.0.16, 2026-11-12

Owner confirms build 37 installed, removes Shaan and cannot find him through contacts. His card initially had only a phone number; build 37 supports email-only matching. Owner then adds an email, relaunches and still sees no match with **Full Access**. Shaan’s actual account-email equality (including Apple private relay) and “Let contacts find me” preference remain unconfirmed. Do not call this a successful positive match or assume the email is correct. Removing a friend is not an exclusion in the legacy RPC or contact-results UI.

Staging check with two disposable JWT accounts: exact `contact_friend_matches` call used by build 37 matched an opted-in email before friendship, while accepted and after `remove_friend`; wrong email and opt-out returned no match. Accounts and cascading records were removed; no shared persona reset, production test data or real address book was used. This rules out a blanket removal exclusion in the tested backend path, not an iOS or account-configuration issue.

Phone/email matching and contact-detail verification are documented in the 1.0.17 candidate release notes and TESTING. They are not part of 1.0.16. The candidate passed staging synthetic lookup checks but its CI release stopped before EAS because `EXPO_TOKEN` was missing; actual SMS delivery and native checks remain pending.

## Requested follow-up QA - 2026-11-12

v2 matching, deduplication, opt-out/caller independence and changed confirmed identifier/readback checks passed with two new isolated staging JWT accounts. Confirmations were Admin-simulated; both accounts/data deleted, shared QA pair untouched. Thirty service/controller tests pass with mocked OS responses.

Real SMS/email confirmation and native permission/selection flows are not signed off. At the original check, hosted phone auth was disabled and a staging phone change returned HTTP 500. Staging subsequently enabled phone auth. Signup now supports skipping the number. Live SMS delivery for phone discovery still needs a device check. No simulator runtime is installed. See TESTING for results and short accessibility/Health steps.

For the owner case, target discoverability is now server-confirmed and profile/login email agree. Owner reports both access/toggle enabled and adding the actual account email after the initial mismatch. The device read/hash/match path remains unresolved. No private identifiers are recorded.
