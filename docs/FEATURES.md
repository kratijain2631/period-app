# Features

The product roadmap — planned features, design improvements, and ideas. Vision and philosophy live in [PITCH.md](PITCH.md). Pull an item into a build, then record what shipped in [RELEASE_NOTES.md](RELEASE_NOTES.md). Operational/shipping tasks live in [TODO.md](TODO.md); open bugs in [BUGS.md](BUGS.md).

## Guiding idea

A period tracker that's **social** — going through your cycle *with* the friends you choose, and planning your life around it. Every feature should either (a) make personal cycle tracking genuinely useful, (b) deepen the supportive social layer, or (c) help you organize life around your cycle. Keep it **warm, private, consent-first — and serious, not fluffy**.

## Already shipped (V0 baseline)

Auth (Sign in with Apple), read-only ingest of menstrual data from Apple Health, friends (requests + mutual-consent sharing), a feed with posts/reactions/boops, and a (dummy) sync score. See [RELEASE_NOTES.md](RELEASE_NOTES.md) and [SCHEMA.md](SCHEMA.md).

## 1. Design & aesthetics — highest leverage

The app works but looks utilitarian. A cohesive visual identity is the single biggest thing that will make the app *feel* real. Design ethos: **serious, not pink/girly/fluffy** — clean, considered, trustworthy; and **fast, low-friction period entry**.

- **Design system** — a considered palette (not stereotypically "girly"), type scale, spacing, and shared components to replace the ad-hoc inline styles.
- **App icon & splash** — branded, using the red-drop motif from the "Sisters by Blood" origin story (see PITCH.md).
- **Cycle visualization** — a cycle wheel or calendar as the home-screen centerpiece.
- **Empty & loading states**, **micro-interactions + haptics** on boops/reactions, **dark mode**.

## 2. Core cycle features — make tracking genuinely valuable

- **Predictions from Apple Health** — ingest and display predicted days (next period, fertile window, PMS); push notifications for them.
- **Phase-based recommendations & reminders** — what to do today based on your phase (nutrition, exercise, skincare, productivity, emotional support). Not just educate — *facilitate* a cycle-based lifestyle.
- **Daily state summary** — "where you are in your cycle" at a glance.
- **Calendar view** — your cycle month by month; past + predictions.
- **In-app logging** — mood, alcohol, diet, exercise, products used, habits, pain, flow. Pattern-match habits/products against outcomes (cycle length, variability, pain) and share aggregate insights across the community.
- **Phase as identity** — optionally display your current phase as a status / bio so friends know.
- **Calendar app sync** *(later)* — reflect cycle phases into a personal calendar.

## 3. Social & support — the part that makes this app different

- **Friends & groups** — friend/de-friend by Apple ID or phone; also **group** relations you can join/leave like an individual friend.
- **Friends overview** — see approved friends' current phases at a glance (consent-gated).
- **Calendar of friends** — who's PMSing on which day, visualized with memoji-like faces; collapse many into an iOS-group-chat-style stack to avoid clutter.
- **Feed** — chronological timeline of friends' events; react with emojis; "boop" a friend.
- **Blended profile / sync score** — how "in sync" you and a friend are, with recommendations for what to do together that day (V0 can use dummy data).
- **PMS / phase notifications** — get a heads-up when a friend (or partner) is PMSing — playful, opt-in.
- **Care actions** — send support when a friend is cramping/PMSing (e.g. a "send a tiramisu" gesture).
- **End-of-year recap** — how similar your cycle was to each friend, who you synced with most, top fitness overlaps.
- **Granular sharing** — share your phase but not your symptoms, per friend.
- **Forum / Q&A** *(later)* — cluster responses by demographic / cycle data so people see answers from those most similar to them.

## 4. Engagement & notifications

- **User notifications** *(next up — infra partly exists: `expo-notifications`, `device_tokens`, `usePushNotifications`, the `notifications-handler` edge function)* — ask permission, then notify on: a new friend request, a reaction to your post, a friend starting their period ("send support"), and cycle-sync events. Expandable later.
- **Home-screen widget** — current cycle day at a glance.
- **Gentle check-in streaks** — encourage logging without nagging.

## 5. Lifestyle integration *(bigger bets)*

- **Cycle-based task planning** — sync with to-do apps and distribute tasks across the weeks by phase (creative / planning / active), so you do things when you're best placed to.
- **Calendar integration** for the same.

## 6. Community & location *(extensions / research)*

- **Nearby supply sharing** — need a pad and can't find a store? See if anyone nearby has one. Generalizes to other supplies/needs.
- **Proximity & cycle-syncing** — location-based closeness tied to cycle-syncing data (research on whether proximity drives syncing); monthly/yearly "period compatibility" + time-together reports.
- **Research data** *(opt-in, anonymized)* — location + syncing, cycle variation from travel/weather, Apple workout data vs. cycle, skin/beauty vs. ovulation. Always privacy-first. (See PITCH.md → research angle.)

## Rough sequencing

1. **Now** — design system + app icon/splash + a home-screen cycle visualization, plus user notifications. (Biggest "this feels real" jump.)
2. **Next** — predictions/insights + phase recommendations + calendar view + friends overview + groups.
3. **Later** — care actions, richer feed, granular sharing, end-of-year recap, widget, forum, lifestyle/calendar integration.
4. **Bets** — community/location extensions and the research data platform.

## Levels (from early planning)

- **Level 0 (MVP):** Apple Health sync, Apple ID accounts, private-by-default social (feed + friend/sync score). *(largely shipped)*
- **Level 1:** blogs / advice.
- **Level 2:** other auth methods; in-app tracking (vs. read-only).

_(Add new ideas under the theme they fit. This is a living plan — reprioritize freely.)_
