# Features

The product roadmap. Vision and philosophy live in [PITCH.md](PITCH.md). Pull an item into a build, then record what shipped in [RELEASE_NOTES.md](RELEASE_NOTES.md). Operational/shipping tasks live in [TODO.md](TODO.md); open bugs in [BUGS.md](BUGS.md).

## Guiding idea

A period tracker that's **social** — going through your cycle *with* the friends you choose, and planning your life around it. Every feature should either (a) make personal cycle tracking genuinely useful, (b) deepen the supportive social layer, or (c) help you organize life around your cycle. Keep it **warm, private, consent-first — and serious, not fluffy**.

## Already shipped (V0 baseline)

Auth (Sign in with Apple), read-only ingest of menstrual-flow data from Apple Health, friends (requests + mutual-consent sharing), a feed with posts/reactions/boops, and a (dummy) sync score. The HealthKit data is read but barely used yet (see the cycle-model note below). See [RELEASE_NOTES.md](RELEASE_NOTES.md) and [SCHEMA.md](SCHEMA.md).

---

# The plan (start here)

The sequencing below **is** the plan; the category sections after it are a reference library the plan pulls from.

> **Priority note:** design-first is right *right now* — you're about to put this in front of friend testers, and polish drives retention. But the **social layer + a real cycle/prediction model are the actual moat**, so keep them close behind, not deferred to "Later."

### Now — make it feel real & usable
- **Design system + app icon/splash** (§ Design)
- **Read Apple Health's cycle data + predictions and display them** — a cycle wheel/calendar and a clear "which phase you're in" (§ Cycle). Lean on Apple's predictions; don't build our own model yet.
- **Onboarding flow**: permissions → add a friend → see your data (§ Onboarding)
- **User notifications**, permission-gated (§ Engagement)

### Next — the moat
- **Richer cycle/calendar view** on Apple's data + predictions (§ Cycle)
- **Phase-based recommendations** (§ Cycle)
- **Friends overview + calendar-of-friends + a real sync score** (§ Social)
- **Groups** of friends (§ Social)
- **Privacy & data-controls dashboard** (§ Privacy)

### Later
Calendar/history view, care actions, end-of-year recap, richer feed, granular per-friend sharing, home-screen widget, forum/Q&A, check-in streaks, plus **accessibility** and **reliability/offline** polish.

### Bets
Cycle-based task planning, community/location extensions, and the research-data platform.

---

# Reference: feature areas

## Design & aesthetics — highest leverage

The app works but looks utilitarian. A cohesive visual identity is the single biggest thing that will make it *feel* real. Ethos: **serious, not pink/girly/fluffy** — clean, considered, trustworthy; and **fast, low-friction period entry**.

- **Design system** — a considered palette (not stereotypically "girly"), type scale, spacing, and shared components to replace the ad-hoc inline styles.
- **App icon & splash** — branded, using the red-drop motif from the "Sisters by Blood" origin story (see PITCH.md).
- **Cycle visualization** — a cycle wheel or calendar as the home-screen centerpiece.
- **Empty & loading states**, **micro-interactions + haptics** on boops/reactions, **dark mode**.

## Onboarding

First-run flow is make-or-break for a social health app:
- **Permission priming** — explain *why* before the system prompts (Apple Health, notifications), so people don't reflexively deny.
- **Guided first steps** — grant Health access → see your cycle → add your first friend.
- **Graceful states** — clear paths when permissions are denied or there's no cycle data yet.

## Cycle model & HealthKit — the substance

> **Read and display Apple's cycle data + predictions — don't build our own model (yet).** Today the app **reads** menstrual-flow data from Apple Health and stores it, but only derives a crude placeholder "current phase" and shows the phase name + a sample count. The near-term direction is to **lean on Apple Health's own cycle data and predictions** rather than compute them ourselves. Concrete next steps, in order:
> 1. **Read Apple's cycle data + predictions** — current phase, and predicted period / fertile / PMS days (whatever HealthKit exposes) — instead of computing them ourselves.
> 2. **Display it** — a **cycle wheel / calendar** view and a clear "which phase you're in" on the home screen, replacing the bare phase label.
> 3. **Calendar / history view** — past cycles + Apple's predictions.
> 4. **Read more HealthKit types** — symptoms, basal body temperature, etc., to enrich the display.
>
> *Building our own cycle/prediction model is deferred to **Later** — maybe in the future, but not now (it's a genuinely hard problem, and Apple already provides predictions).*

- **Phase-based recommendations & reminders** — what to do today based on your phase (nutrition, exercise, skincare, productivity, emotional support). Not just educate — *facilitate* a cycle-based lifestyle.
- **In-app logging** — mood, alcohol, diet, exercise, products used, habits, pain, flow. Pattern-match habits/products against outcomes (cycle length, variability, pain) and share aggregate insights across the community.
- **Phase as identity** — optionally display your current phase as a status / bio so friends know.
- **Calendar app sync** *(later)* — reflect cycle phases into a personal calendar.

## Social & support — the differentiator

- **Friends & groups** — friend/de-friend by Apple ID or phone; also **group** relations you can join/leave like an individual friend.
- **Friends overview** — see approved friends' current phases at a glance (consent-gated).
- **Calendar of friends** — who's PMSing on which day, visualized with memoji-like faces; collapse many into an iOS-group-chat-style stack to avoid clutter.
- **Feed** — chronological timeline of friends' events; react with emojis; "boop" a friend.
- **Blended profile / real sync score** — how "in sync" you and a friend are, with recommendations for what to do together (currently dummy data — make it real).
- **PMS / phase notifications** — a heads-up when a friend (or partner) is PMSing — playful, opt-in.
- **Care actions** — send support when a friend is cramping/PMSing (e.g. a "send a tiramisu" gesture).
- **End-of-year recap** — how similar your cycle was to each friend, who you synced with most.
- **Granular sharing** — share your phase but not your symptoms, per friend.
- **Forum / Q&A** *(later)* — cluster responses by demographic / cycle data so answers come from people most similar to you.

## Engagement & notifications

- **User notifications** *(next up — infra partly exists: `expo-notifications`, `device_tokens`, `usePushNotifications`, the `notifications-handler` edge function)* — ask permission, then notify on: a new friend request, a reaction to your post, a friend starting their period ("send support"), and cycle-sync events.
- **Notification strategy** — for a social app, *not being annoying* is a design problem in its own right: think frequency caps, batching, quiet hours, and per-type user controls.
- **Home-screen widget** — current cycle day at a glance.
- **Gentle check-in streaks** — encourage logging without nagging.

## Privacy & data controls

For menstrual data specifically, privacy is a **feature area**, not just a design principle:
- **Privacy/consent dashboard** — see and control exactly what each friend (or group) can see.
- **Data export** — let users download their own data.
- **Deletion** — account + data deletion (shipped) and clear, honest disclosure of what's stored and shared.

## Accessibility & reliability

Table stakes for a "real, good" app:
- **Accessibility** — VoiceOver labels, Dynamic Type, sufficient contrast, reduce-motion support.
- **Reliability** — robust offline handling (the boop queue is a start — extend the pattern), clear error/retry states, and no silent data loss.

## Lifestyle integration *(bets)*

- **Cycle-based task planning** — sync with to-do apps and distribute tasks across the weeks by phase (creative / planning / active).
- **Calendar integration** for the same.

## Community & location *(bets / research)*

- **Nearby supply sharing** — need a pad and can't find a store? See if anyone nearby has one. Generalizes to other needs.
- **Proximity & cycle-syncing** — location-based closeness tied to syncing data (research on whether proximity drives syncing); monthly/yearly "period compatibility" + time-together reports.
- **Research data** *(opt-in, anonymized)* — location + syncing, cycle variation from travel/weather, workout data vs. cycle, skin/beauty vs. ovulation. Always privacy-first. (See PITCH.md → research angle.)

## Levels (historical framing)

Early planning framed the roadmap as levels — largely superseded by the plan above, kept for reference:
- **Level 0 (MVP):** Apple Health sync, Apple ID accounts, private-by-default social (feed + sync score). *(shipped)*
- **Level 1:** blogs / advice.
- **Level 2:** other auth methods; in-app tracking (vs. read-only).

_(Add new ideas under the theme they fit, and pull them into "The plan" when prioritized.)_
