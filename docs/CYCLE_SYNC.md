# Cycle sync, phases, posting & notifications — how it all works

Single source of truth for how this app figures out your cycle phase, when it syncs, how a phase change becomes a feed post, and every notification/background mechanism involved. (Individual bugs/history live in [BUGS.md](BUGS.md); what shipped when is in [RELEASE_NOTES.md](RELEASE_NOTES.md).)

There are **three layers** — keep them distinct:
1. **Detection** — how we notice what phase you're in / that it changed.
2. **Posting** — turning a phase change into a feed event.
3. **Notification** — alerting you (and your friends).

---

## 1. The phase model — where "your phase" comes from

All in [`packages/domain/cycles/models.ts`](../packages/domain/cycles/models.ts) (`resolveCyclePhase` → `deriveSnapshot`). It reads **your own Apple Health data** (menstrual-flow samples over the last 180 days, plus optional signals: ovulation tests, cervical mucus, progesterone, basal body temperature). It does **not** read Apple's own predictions — HealthKit doesn't expose them to third-party apps (there is no prediction API in the SDK), so we compute our own equivalent.

Each derived snapshot has a **`phaseSource`**:

- **`observed`** — from real, recent data: flow logged today → `menstruation`; positive ovulation test or peak cervical mucus → `ovulation`; recent progesterone or elevated BBT → `luteal`.
- **`estimated`** — no recent signal, so we compute it: days since your last period start, modulo your cycle length, mapped onto phase windows (`resolvePhaseWindow`) sized from your real `cycleLengthDays` / `periodLengthDays` / `lutealLengthDays`. This is effectively a prediction, grounded in your real period history.
- **`unknown`** — no usable data.

**Reality for a typical user** (who only logs period flow, no ovulation tests/BBT): during your period it's `observed`; the rest of the month it's `estimated`. So most of the cycle, the phase is our model's estimate.

The snapshot exposes: `currentPhase`, `phaseSource`, `cycleLengthDays`, `lutealLengthDays`, `periodLengthDays`, `latestSampleStart`, **`currentPhaseStart`** (estimated date the current phase began — used to date posts correctly), and **`nextPhaseStart` / `nextPhase`** (predicted next transition — used to schedule reminders).

---

## 2. When a sync runs — the four triggers

The sync ([`syncHealthData`](../app/services/healthkit/syncHealthData.ts)) is the only thing that reads HealthKit and derives a snapshot. It runs on four triggers, wired in [`useCycleSyncLifecycle`](../app/services/healthkit/useCycleSyncLifecycle.ts):

| Trigger | Fires when | Reliable? |
|---|---|---|
| `manual` | App launch / permissions granted | Yes (app is open) |
| `foreground` | App returns to the foreground (`AppState → active`) | Yes (app is open) |
| `background` (fetch) | `expo-background-fetch` task, ~every 30 min min-interval ([`backgroundSync.ts`](../app/services/healthkit/backgroundSync.ts)) | **iOS-throttled** — opportunistic, not guaranteed |
| `background` (HealthKit delivery) | iOS relaunches the app when **new menstrual-flow data is written**, via `enableBackgroundDelivery` + `subscribeToChanges` ([`backgroundDelivery.ts`](../app/services/healthkit/backgroundDelivery.ts)) | Only fires on a **data write**, and iOS controls timing |

**Key limitation:** HealthKit background delivery only wakes us when data is *written* (e.g. you log your period). Mid-cycle transitions (follicular→ovulation→luteal) involve **no data write** — they're just time passing — so **nothing wakes the app for them.** That's why predicted reminders (below) exist.

---

## 3. What a sync does

In order (`syncHealthData`):
1. Read menstrual-flow + signal samples from HealthKit.
2. `deriveSnapshot` → current phase + predictions. Compare to the **last snapshot** (local SQLite) → `phaseChanged`.
3. Save the snapshot locally (SQLite) and remotely (`cycle_snapshots` on Supabase — the whole snapshot as jsonb, so `nextPhaseStart`/`nextPhase` land server-side for the server reminder).
4. **Auto-post** to the feed (`cycle_events`), gated by the user's auto-post settings:
   - New **`menstrual_flow`** events for period samples **on/after account creation** (never backfills history).
   - A **`phase_transition`** event when `phaseChanged` and `postPhaseTransitions` is on — **dated at `currentPhaseStart`** (the real transition day), not app-open time.
5. If the phase changed **and** this was a `background` sync → fire an immediate **local notification** ("You've entered your luteal phase") via `schedulePhaseChangeNotification`.
6. Reschedule the **predicted local reminder** for the *next* transition (`scheduleUpcomingPhaseReminder`).
7. Emit `CYCLE_SNAPSHOT_UPDATED` so the UI (cycle ring, etc.) refreshes.

### What friends can read

Accepting a friend enables the core sharing experience. Current clients fetch a reduced cycle snapshot (phase, phase source, cycle length, luteal length, latest sample date, and date-only period samples with unspecified intensity) plus deliberately published cycle events. The RPC projections exclude raw HealthKit metadata, personal symptoms, flow intensity, and ovulation/BBT/cervical-mucus/progesterone signals. Mood/personal posts remain visible when the user deliberately posts them to the friend feed. _(The projection intentionally omits `periodLengthDays` and `nextPhase*` — no friend view consumes them today; see [TODO.md](TODO.md) for when to add them.)_

> **⚠️ Backward-compatibility (a deliberate break — read this before touching the friend read path).** This sanitized-RPC model is **not** backward-compatible with builds **≤1.0.10**, which read friends via direct `cycle_snapshots`/`cycle_events` SELECTs. The `20260729000000` migration locked those tables to **owner-only** (confirmed live 2026-08-07: `pg_policies` shows only `*_select_own`, no `*_select_own_or_friends`), so **pre-1.0.11 builds get empty friend data**. This is an intentional exception to [INSTRUCTIONS §12](INSTRUCTIONS.md), justified because closed-beta testers update together — **1.0.11 is the required minimum build.** If you ever need to un-break older builds temporarily, re-apply the `*_select_own_or_friends` read policy from `20260806000000_legacy-friend-cycle-read-compat.sql`, then re-lock with `20260806010000_remove-legacy-friend-cycle-read.sql` once everyone has upgraded.

---

## 4. The notification mechanisms

There are **four** ways you can be nudged about a phase change. They overlap on purpose — no single one covers every case (see the trilemma below).

### (a) On-device scheduled reminder — *the reliable default*
[`localCycleNotifications.ts`](../app/services/notifications/localCycleNotifications.ts) `scheduleUpcomingPhaseReminder`. On every sync we predict `nextPhaseStart` and schedule a **local notification** for 10am that day ("Your luteal phase is starting soon — open to share"). Scheduled local notifications fire **even if the app is closed** — no background execution needed — so this is dependable. Requires the app to have been opened at least once to schedule it. Covers **active users**.

### (b) Background-detected local notification — *data-driven*
When a `background` sync (HealthKit delivery) detects an actual phase change, it fires an immediate local notification (step 5 above). This is the accurate, real-data path — but only fires for **data-write** transitions (mainly period start) and only when iOS actually wakes us.

### (c) Server-side scheduled push — *reaches inactive users*
[`phase-change-reminder`](../supabase/functions/phase-change-reminder/index.ts) edge function + a daily pg_cron ([`20260802120000_phase-change-reminders.sql`](../supabase/migrations/20260802120000_phase-change-reminders.sql)). Each day it finds users whose uploaded `nextPhaseStart` is **today** and who **haven't synced in 2+ days** (i.e. the on-device reminder won't help them), and sends an Expo push. Targets **inactive users** specifically, so it doesn't double up with (a). Needs deploy + registered `device_tokens` (see [TODO.md](TODO.md)).

### (d) In-app notifications (a separate system) — friends' activity
The bell / [`NotificationsScreen`](../app/features/notifications/screens/NotificationsScreen.tsx) with a new/read distinction (`notifications.read_at`). Populated by:
- **DB triggers** ([`20260730130000`](../supabase/migrations/20260730130000_notification-triggers-engagement.sql)) that insert a `notifications` row when someone reacts to your post/event or boops you.
- A **realtime subscription** on `friend_requests` (instant friend-request/acceptance updates) + client-derived acceptances.
- (Deferred) [`notifications-handler`](../supabase/functions/notifications-handler/index.ts) — notifies your **friends** on your cycle events; undeployed (needs push tokens live).

---

## 5. Why this shape — the design rationale

**The trilemma:** for a phase-change notification you can pick only two of *{ reliable-without-the-phone, accurate, automatic }*:
- Accurate needs **fresh data**, which only reaches us when the phone runs (foreground or background wake).
- Reliable-without-the-phone means acting on a **prediction**, which can be wrong (cycle shifts).

**We deliberately do NOT silently auto-post predictions to friends.** Cycle data is intimate and social; broadcasting a wrong "she's ovulating" is worse than a slight delay. So phase-change delivery is **notify-to-confirm**: reminders nudge you to *open*, and opening is what posts (with fresh data, under the `postPhaseTransitions` opt-in). Auto-posting stays opt-in and, ideally, reserved for **confirmed** (data-driven) events.

**Why not just Apple's predictions?** Not available — HealthKit exposes raw data only.

**The real unlock (future):** the Strava model. Strava auto-posts because an activity is a *completed, real* event that lands on Strava's servers automatically. Our equivalent is **in-app period logging** (see [TODO.md](TODO.md) "Add Apple Health WRITE access" / "Manual cycle entry"): if users log in *our* app, it's a discrete event **on our server**, so our backend can post it instantly — no HealthKit round-trip, no phone background execution. That's the path to true, reliable auto-posting.

---

## 6. Status — built vs. needs deploy/verify

- ✅ **Built & shipping in build 1.0.8:** the phase model + predictions, real-transition dating, all four sync triggers, HealthKit background delivery, on-device scheduled reminder, background-detected local notification, in-app notifications page + reaction/boop triggers + realtime friend requests.
- ⏳ **Needs on-device verification** (background behavior can't be tested off-device): that iOS actually wakes the app on data writes, that the predicted reminder fires, and that `device_tokens` register.
- ⏳ **Needs deploy:** the server-side `phase-change-reminder` (apply migration + deploy function), and the older `notifications-handler` (for friend-facing pushes).
- 🚫 **Deliberately not built:** silent server-side auto-posting of predictions (see §5).
