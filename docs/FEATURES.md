# Features

Planned and requested features — the product backlog. Pull an item from here into a build, then record what actually shipped in [RELEASE_NOTES.md](RELEASE_NOTES.md). Operational/shipping tasks live in [TODO.md](TODO.md); open bugs live in [BUGS.md](BUGS.md).

## Planned

### User notifications
Ask for notification permission first, then send a push notification on key events:
- a new **friend request**
- a **reaction** to your post
- (more events can be added later)

Infra partly exists already — `expo-notifications`, the `device_tokens` table, the `usePushNotifications` hook, and the `notifications-handler` Supabase edge function. This is mostly wiring those up to the events, plus adding the permission prompt.

## Ideas / later

_(none yet — add future feature ideas here)_
