# Task 8 Implementation Plan - Offline & Reliability

## Plan
- [x] Add connection store with NetInfo monitoring.
- [x] Implement SQLite-backed boop queue and automatic flush on reconnect.
- [x] Surface offline banners in Home/Feed and queue feedback on boops.
- [x] Keep cached cycle snapshot visible with stale banner + retry sync CTA.

## Progress
- Added `connectionStore` + `useConnectionWatcher`, wired in `App.tsx`.
- Added boop queue store + flush hook and queue-aware `sendBoop`.
- Added offline banners in Home/Feed and queued boop states in Feed.
- Updated cycle snapshot hook + summary card to show stale data and retry sync.

## Key Decisions
- Cache retention keeps last snapshot even when stale; UI shows stale banner instead of hiding the card.
- Boops are queued only when offline, and flushed automatically when connectivity returns.

Path: `implementation-docs/task8-implementation.md`
