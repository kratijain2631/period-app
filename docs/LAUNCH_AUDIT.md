# Launch audit (2026-11-13)

What stands between this app and a public App Store release, from a review of the docs and code on `main` at 1.0.23 (build 45). TypeScript and all Jest tests passed at the time of the audit.

Use this as the launch tracker. Claim an item the same way as in [BUGS.md](BUGS.md) (`- [~]` plus `🚧 (WIP — <name>, <date>)`) and mark it `- [x]` when done, with a line in [RELEASE_NOTES.md](RELEASE_NOTES.md). Items that already have a full entry in BUGS, FEATURES or TODO link there; keep the detail in that one place. Don't delete items without approval.

## Must-haves before a public release

- [ ] **Report and block.** Posts, comments, aliases and the community Top 10 are user-generated content, and there is no way to report content or block a person. Apple requires both, plus a published contact (App Review guideline 1.2). Needs tables, RLS, a report destination someone actually reads, and UI on posts, comments and profiles.
- [ ] **Privacy policy and support contact in the app.** Settings has no privacy link or contact. The policy is hosted on a temporary artifact ([TODO.md → Privacy policy](TODO.md#privacy-policy)). Also: App Privacy labels and age rating in App Store Connect, and a legal review of the policy.
- [ ] **Medical disclaimer and minimum age.** Phases are estimates; nothing in the app says it isn't medical advice or contraception. Decide the minimum age (a period app will attract teens) and how it's enforced.
- [ ] **Manual period logging.** The app depends entirely on Apple Health, so anyone who tracks elsewhere sees an empty app. See [TODO.md → Manual cycle entry](TODO.md) and the write-back item.
- [ ] **Server push notifications.** `notifications-handler` is not deployed (needs an Expo access token) and token registration is unverified. See [FEATURES.md → Engagement & notifications](FEATURES.md#engagement--notifications).
- [ ] **SMS delivery for optional phone verification.** Signup works with a verified email and alias. Staging reports phone auth enabled. Real SMS receipt and confirmation on a device remain open. The last documented production check showed phone auth disabled. See the SMS item at the top of [BUGS.md](BUGS.md).
- [ ] **Crash reporting and basic analytics.** Neither exists. Add a crash reporter (for example Sentry) before strangers use the app.
- [ ] **Final name and identifiers.** Display name "Cadence" vs bundle id `com.syncsisters.cycle`. Decide before launch; see [IDENTIFIERS.md](IDENTIFIERS.md).

## Nice to have in v1

- [ ] Opt-in Face ID / Touch ID app lock.
- [ ] Calendar / history of past cycles; read more HealthKit types (symptoms).
- [ ] Data export.
- [ ] Notification preferences: per-type switches, quiet hours.
- [ ] Care actions ("send a heat pad").
- [ ] "Your cycle year" shareable recap; Instagram Stories share.
- [ ] Edit your own posts.
- [ ] Home-screen widget.
- [ ] Accessibility pass (VoiceOver, Dynamic Type, contrast) and dark mode.
- [ ] EAS Update for over-the-air JS fixes.

## Bugs

### Wrong data shown or shared (fix first)

- [x] **A late period restarts the cycle.** _(Fixed in source 2026-11-13; see BUGS.md.)_ The cycle day and estimated phase use `daysSinceStart % cycleLength`, so day 30 of a 28-day cycle with no new period reads as day 3, menstruation, and the next sync can auto-post "Entered menstruation" to friends. `packages/domain/cycles/models.ts` (`resolveCyclePhase`, `getCycleDay`).
- [x] **A Health sync with no samples replaces the snapshot friends see.** _(Fixed in source 2026-11-13; see BUGS.md.)_ [BUGS.md](BUGS.md) → "A sync with zero Health samples still uploads an empty snapshot".
- [x] **No-data users see made-up numbers.** _(Fixed in source 2026-11-13; see BUGS.md.)_ [BUGS.md](BUGS.md) → "No-data users see made-up numbers".

### Friends and social

- [x] Email friend request shows no confirmation (`FriendsScreen.tsx`, notice only renders for non-email queries). _(Already fixed in the live screen, `DiscoverMembers`; the unused old `FriendsScreen.tsx` has been removed. Confirmed on staging 2026-11-13; see BUGS.md.)_
- [x] Circle doesn't refresh after an accept; new posts need pull-to-refresh; the bell can lag about a minute. _(2026-11-13: the Circle part was already fixed. Posts and notifications now arrive over realtime, verified on staging after the migration deployed; see BUGS.md.)_
- [x] Two-way pending requests leave a stale row. _(Fixed 2026-11-13 and verified on staging after deploy; see BUGS.md.)_
- [x] Re-check "Deleting an accepted request directly leaves sharing on" against the 2026-11-11 friend-rule migration; it may be fixed. _(Still open on re-check, now fixed in source 2026-11-13; see BUGS.md.)_
- [ ] "Check Incoming Requests" points to a screen that doesn't exist.
- [ ] An expired session shows "Choose your alias" instead of sign-in.
- [ ] Contacts: Limited Access fails; owner can't find Shaan with Full Access. Physical iPhone checks in [CONTACT_DISCOVERY_ROLLOUT.md](CONTACT_DISCOVERY_ROLLOUT.md).

### Display and model accuracy

- [ ] Pair comparison draws a fixed 28-day ring.
- [ ] Friend Sync "Cycle History" seems to list consecutive days as cycles.
- [ ] Feed can label a mid-period day as day 1.
- [ ] `friend-recommendations` dates cycles from the last flow day.
- [ ] "Pms" instead of "PMS".

### Needs a physical iPhone

- [ ] Background posting and the predicted phase reminder.
- [ ] Push token registration.
- [ ] Friend accept end to end with two real accounts.

## Stale docs found

- [ ] The test suite now runs in seconds. Close the "Test suite is slow" bug in BUGS.md and the "fast smoke test" item in TODO.md.
