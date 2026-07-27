# Bugs

Known bugs to fix. This is for **open** bugs; problems we already diagnosed and fixed during setup are recorded in [TROUBLESHOOTING.md](TROUBLESHOOTING.md), and feature work lives in [FEATURES.md](FEATURES.md).

## Open

Found in the Beta 2 build (2026-07-23):

- [ ] **Can see other users' data without being friends / without consent.** There's already data in the app (e.g. Neha's) visible even though we aren't friends. Investigate: is the feed meant to be friends-only? This is likely the demo **seed data** (`seed-posts.sql`) showing to everyone — but check RLS on `posts` and whether any *cycle* data leaks. Possible privacy issue.
- [x] **Can't dismiss the keyboard** after typing in "what's on your mind" (post composer). Need tap-to-dismiss / a Done affordance / KeyboardAvoidingView fix. _(Fixed: feed drag-to-dismiss + Done return key.)_
- [x] **Boop / heart button states on your *own* post are backwards.** Boop buttons on self should look **disabled** (they don't/shouldn't work). The heart button is the opposite — it looks disabled on self but actually works, and shouldn't. Fix the enabled/disabled states so self-actions that don't apply look disabled. _(Fixed: heart disabled on self; both boop & heart use the disabled color on self.)_
- [x] **Selected mood inside "+ more" isn't shown outside "+ more".** When you pick a mood that lives under "+ more", it should also surface outside "+ more" (it's selected and will send). _(Fixed: selected moods are always added to the quick mood row.)_
- [ ] **Phase shows "unknown" despite Apple Health being synced earlier.** Unsure if a corrupted snapshot row or a real bug. Also: add a **"connected to Apple Health"** flag/wording somewhere so users know sync status.
- [ ] **Accepting a friend request doesn't result in a friendship.** Krati accepted Lukas's friend request, but they don't show as friends afterward. Investigate the accept flow (`respondToFriendRequest` → the `friend_requests` status update, `ensure_friend_sharing`, and the accepted-friends listing/query) — the acceptance isn't turning into a mutual friend relationship.
- [x] **New account floods the feed with backdated period posts.** On first HealthKit sync, every historical menstrual-flow sample in the 180-day lookback was auto-posted as a backdated `menstrual_flow` event. _(Fixed: `selectAutoPostedPeriodSamples` now takes a cutoff and `syncHealthData` only posts samples on/after the account-creation time from `session.createdAt`. Existing sessions need a re-login to populate `createdAt`.)_
- [x] **Deleting an account leaves data behind / errors with "Could not delete account right now."** The `delete-account` edge function **soft-deleted** the auth user (`deleteUser(uid, true)`) — the auth row stayed, so *no* cascade fired and app data survived; it also never cleared the non-cascading tables (`posts`, `post_reactions`, `event_reactions`, `boops`). _(Fixed in code: the edge function now best-effort-clears those non-cascading tables, then **hard-deletes** the auth user so cascades fire. **Must redeploy `delete-account`; also a one-time cleanup of already-orphaned rows.**)_

Onboarding / Apple Health feedback (Beta 2 testers):

- [x] **"Connect Apple Health" bullet points misaligned with their text.** The bullet dot sat below the line. _(Fixed: `featureItem` now aligns to `flex-start` in `CompanionIntroScreen`.)_
- [x] **Auto-post copy unclear** — "Pick what posts automatically" / "Choose what auto-posts" were confusing. _(Fixed: reworded to "Choose which updates post automatically" in `CompanionIntroScreen`.)_
- [ ] **"Cadence would like to connect and update your Apple Health data" is misleading — we never write to Apple Health** (read-only: `requestAuthorization([], cycleReadTypes)`). The "update" wording comes from the iOS permission sheet. Likely fix: remove the now-unneeded `NSHealthUpdateUsageDescription` from `app.config.ts` so iOS drops the write language — **needs a native rebuild and on-device verification** of the sheet text.

When adding a bug, note: what happens, steps to reproduce, and where it seems to originate if known.

## Fixed

Fixed bugs move to [RELEASE_NOTES.md](RELEASE_NOTES.md) under the build that fixed them.
