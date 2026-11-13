# First-time account setup handoff · November 13, 2026

Continue on `feature/apple-email-signup-code`. The worktree on this Mac is `/private/tmp/period-phone-contact-form`. The unfinished change is intended for review in a draft PR. The main checkout contains edits from other chats.

## Product decisions

- A member keeps one verified account email. Apple remains their sign-in provider after they change that email. Friends can look up the verified address when the member opts in to contact discovery. Apple’s private relay can remain part of the Apple identity.
- Allow email changes only during initial setup. Send **one code to the new address**. Keep the existing address until confirmation succeeds. Settings displays the verified email after setup. Phone is optional at signup and can be changed in Settings.
- Show the current address in its own card with the relay explanation underneath. Use the same outlined action for **Use a different email** and **Add phone number**.
- Hold TestFlight until Krati explicitly approves a build.

## Current implementation and checks

- The draft updates the real signup screen, the shared email components and the repository widget preview. Apple sign-in uses the verified Auth address when it refreshes the app profile.
- Migration `20261114010000_setup_account_email.sql` keeps the existing account-email guard. It lets a recently signed-in member authorize one destination during setup, checks it again at confirmation, and closes eligibility when the member first saves an alias. Clearing the alias later cannot reopen eligibility. Confirmation updates legacy contact lookup in the same transaction. Cancel revokes the pending codes.
- Both hosted Auth configurations had single-inbox confirmation, mail autoconfirm off and custom SMTP at the time of the check. Updated the **staging** email-change template to include the OTP and read it back. Production already included the OTP. This verifies configuration, not delivery of a message.
- All 221 app tests and the native/preview TypeScript check passed. The browser walkthrough passed at 320 and 390 px for address separation, cancellation, wrong code, a single new-inbox code, and continuing under the replacement address. [Interactive relay preview](http://localhost:8096/setup-tour.html?design=email) uses `654321` for email. This is a local sample server. The reproducible repository preview is `home-widgets.html?screen=setup` on the draft branch. [Preview instructions](../design-mocks/home-widgets/README.md).

## Next session

1. Check the draft PR’s security job. It exercises the migration on a disposable database, including stale sessions, an unauthorized destination, cancellation and confirmations attempted after setup. Review the request and confirmation paths before merging. The draft migration has not been deployed. The normal merge workflow promotes the migration from staging to production after staging access checks.
2. Verify real delivery with a controlled staging inbox and an authorized Apple test account on an iPhone. Choose Hide My Email, start a change, and confirm using only the new inbox. Verify the Auth user ID and linked Apple provider before and after. Sign out and sign back in with the same Apple ID. Check that the replacement address persists. The browser simulates Apple and mail, so this is the outstanding identity and delivery check.
3. With a second staging member, check opt-in discovery at each step. The old address should match until confirmation. After confirmation only the new address should match. Turn discovery off and confirm neither address matches. Check Settings is read-only and an older client cannot change the account email after setup. Use staging personas or disposable accounts per [Testing](TESTING.md).
4. Record the staging results in Testing and Release notes. Keep the build hold in effect.
