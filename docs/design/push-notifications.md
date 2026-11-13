# Push notifications

How something that happens in this app becomes a notification on someone's phone. Status per phase is at the end; per-build detail is in [RELEASE_NOTES.md](../RELEASE_NOTES.md).

## How it works

```
friend_requests ──trigger──┐
notifications ───trigger───┼─▶ push_outbox ──insert trigger (pg_net)──▶ send-push ──▶ Expo ──▶ APNs ──▶ phone
                           │        ▲                                      │
                           │        └── push-outbox-retry (every 5 min) ───┘
```

1. **Producers queue a push.** Database triggers call `enqueue_push`, which adds a row to `push_outbox`:
   - `notifications` inserts of type `post_reaction`, `event_reaction` and `boop` (those rows are themselves made by the engagement triggers, so the bell and the push stay in step).
   - `friend_requests`: a new pending request notifies the recipient (`friend_request`); pending → accepted notifies the sender (`friend_request_accepted`). Declining deletes the row and tells nobody.
   - `enqueue_push` skips self-actions and repeats from the same person inside a quiet window: one day for friend requests, 10 minutes for boops.
2. **The queue is server-only.** `push_outbox` has row-level security with no policies, so the app can't read it. That's also why friend requests go there rather than into `notifications`: older builds already build friend-request entries in the bell from `friend_requests`, and a `notifications` row would show them twice.
3. **Delivery.** Each new outbox row calls the `send-push` edge function through `pg_net`, with the vault's `publishable_key` (for the gateway) and `cron_secret` (which the function checks, see `_shared/cronAuth.ts`). If the vault isn't set up, as on a local database, the row waits for the retry job. Neither can block the original insert.
4. **`send-push`** calls `claim_pushes`, which marks rows so the immediate call and the retry job never send the same one, then for each row:
   - skips types it has no text for, and types the recipient turned off in `notification_preferences` (no row means the column defaults);
   - loads the recipient's `device_tokens`;
   - sends one message per device to Expo, with the badge set to unread notifications plus pending friend requests;
   - deletes tokens Expo reports as `DeviceNotRegistered`;
   - records the outcome in `push_outbox.result` and sets `sent_at`. HTTP failures leave `sent_at` empty, so the retry job (every 5 minutes) tries again, up to 3 attempts within a day.
5. A daily job deletes outbox rows older than 30 days.

## Rules

- **Lock-screen text is neutral.** It names who did something ("@ava reacted 💛 to your update") and never anyone's cycle phase. The text is written by the server in `send-push/messages.ts`, so it can change without an app build.
- **Tap data is ids only:** `type`, `outbox_id`, and where relevant `actor_id`, `notification_id`, `request_id`, `post_id`.
- **One token, one account.** `device_tokens.token` is unique, and the `device_tokens_claim` trigger moves a token to whoever registers it last, which also covers older builds. Signing out deletes the token first (`releaseStoredDeviceToken`), while row-level security still allows it.
- **Preferences:** iOS permission is the master switch. `notification_preferences` has one boolean per category (`friend_requests`, `reactions`, `boops`, `comments`, `phase_reminders`, `friend_cycle_updates`); all default on except friends' cycle updates.
- **Adding a push type:** queue it with `enqueue_push` from a trigger, add its text and category to `send-push/messages.ts`, and add a preference column if it's a new category.

## Setup per project

1. The migration (applied by the Database deploy workflow) creates everything in the database, including both cron jobs. It relies on the vault secrets `project_url`, `publishable_key` and `cron_secret`, which staging and production already have.
2. Deploy the function with gateway JWT checks off, because it checks the vault secret itself and refuses anyone else: `supabase functions deploy send-push --project-ref <ref> --no-verify-jwt`. Deploy to staging first.
3. Optional: if Expo's "enhanced push security" is turned on, set `EXPO_ACCESS_TOKEN` as a function secret.
4. The iOS app needs Apple push credentials in EAS (`eas credentials`); EAS normally sets these up during a build.

## Checking it

- `select type, attempts, sent_at, result from push_outbox order by created_at desc limit 20;` shows what was queued and what Expo said. `result.status` is `sent`, `failed` (every device rejected), `skipped` (with a reason) or `error` (will retry).
- On staging, personas have no real device tokens. Inserting a made-up `ExponentPushToken[...]` for a persona exercises the whole path, and Expo answers with an error ticket for it.
- Real delivery needs a build on a physical phone with notifications allowed. Simulators can't get Expo push tokens, though `xcrun simctl push` can test how a notification looks and what tapping does.

## Status

- **Staging (2026-11-13):** migration applied by the Database deploy workflow, `send-push` deployed (version 1, gateway JWT checks off). Callers without the secret get 401. With made-up tokens for ava, cleo and fay, the `cramps-thread` and `new-friend` scenarios each produced a delivery straight away. Expo answered `DeviceNotRegistered`, the function removed the token, and later rows were recorded as `skipped: no registered device`. A friend request repeated within the day wasn't queued again. Rows queued before the function existed were handled once by the first retry run (21:50 UTC).
- **Production (2026-11-13):** migration applied by the Database deploy workflow; `send-push` deployed (version 1, gateway JWT checks off) at the owner's request, and callers without the secret get 401. Nothing was queued at deploy time, so no late pushes went out. 4 users had registered tokens. No test activity was created on production; the first real friend request, reaction or boop is the first live send. Check it with the query under [Checking it](#checking-it).
- **Real phone (2026-11-13, ~22:17 UTC):** the owner sent a friend request on production and the recipient's iPhone showed "@shaan sent you a friend request" on the lock screen. The notification's app icon appeared as a blank white square, though the build's icon is correct (a single 1024×1024 opaque PNG). That's most likely iOS's icon cache after the icon changed on 2026-11-12; restarting the phone normally clears it.

## Phases

- **Phase 1 (this change):** token fixes, `push_outbox`, `notification_preferences` with defaults, triggers for friend requests, reactions and boops, `send-push`, retry and cleanup jobs.
- **Phase 2:** a screen explaining notifications before the iOS prompt (the prompt currently appears at sign-in), per-type toggles in Settings, routing taps by `type` (today every tap opens Home), and clearing the badge when the Notifications page opens.
- **Phase 3:** comment notifications (no trigger creates them yet), friends' cycle updates (opt-in; replaces the undeployed `notifications-handler`), moving `phase-change-reminder` onto the outbox, and checking Expo receipts for tokens that die later.
