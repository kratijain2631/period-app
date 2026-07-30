# Features

The product roadmap. Vision and philosophy live in [PITCH.md](PITCH.md). Pull an item into a build, then record what shipped in [RELEASE_NOTES.md](RELEASE_NOTES.md). Operational/shipping tasks live in [TODO.md](TODO.md); open bugs in [BUGS.md](BUGS.md).

## Guiding idea

A period tracker that's **social** — going through your cycle *with* the friends you choose, and planning your life around it. Every feature should either (a) make personal cycle tracking genuinely useful, (b) deepen the supportive social layer, or (c) help you organize life around your cycle — and all of it in service of the mission: **women's empowerment**, making a hidden monthly experience visible, shared, and celebrated (see [PITCH.md](PITCH.md)). Keep it **warm, private, consent-first — and serious, not fluffy**.

## Already shipped (V0 baseline)

Auth (Sign in with Apple), read-only ingest of menstrual-flow data from Apple Health, friends (requests + sharing), a feed with posts/reactions/boops (including deleting your own posts), and a real computed sync score (`computeSyncScore`). The HealthKit data is read but barely used yet (see the cycle-model note below). See [RELEASE_NOTES.md](RELEASE_NOTES.md) and [SCHEMA.md](SCHEMA.md).

> **Note on "mutual-consent sharing":** the *schema* supports it, but the app currently **auto-grants** sharing both ways on friend-accept and has no revoke UI (see [BUGS.md](BUGS.md) — consent-model + dead-toggle bugs). The Privacy section below tracks closing that gap.

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

# The retention loop (running the Strava/Beli/Flighty playbook)

PITCH.md argues the moat is a *consent-based social layer* over a solo tracking habit. This section turns that thesis into the concrete in-product loop and names where today's code already helps or falls short. The loop we want:

**auto-logged cycle data → shows up in friends' feeds (consented) → friends react/boop/support → that pull makes you log & open the app more → better personal insights → repeat.**

The single biggest strategic point from studying the comparables: **the sticky ones minimize manual logging.** Strava has GPS, Flighty auto-imports flights — the content posts *itself*, so the feed is never empty and you get social reward for zero effort. This app has the same superpower latent in **Apple Health auto-ingest** — lean into it instead of leaning on manual text posts.

### 1. Make the feed auto-populate (Strava/Flighty's "it logs itself")
- **Consented auto-updates are the core content**, not manual posts. "Maya started her period," "you and Neha are both in luteal this week," "3 friends are in their fertile window." Infra exists (`AutoPostSettings`, cycle-event feed items) — expand the event vocabulary and make it the default feed material. *(Gate on the consent model — see Privacy below; don't ship auto-broadcast until revoke works.)*
- **Keeps the feed alive at low friction** — the failure mode of a social app is an empty feed; auto-events solve the cold-open.

### 2. Turn the sync score into the Beli-style comparative hook
- **Sync leaderboard** — "who am I most in sync with." The score is already computed per friend in `FriendsScreen`; rank and surface it. Beli's addictive core is *relative* standing, not absolute numbers.
- **Sync milestones & notifications** — "You and Priya synced up this month 🔴" is exactly the shareable, delightful moment the pitch describes.

### 3. Stats-flex & the shareable recap (Flighty Passport / Spotify Wrapped)
- **"Your cycle year"** — total days, average/most-variable cycle, most-synced friend, how travel shifted your cycle. A beautiful, screenshot-ready recap is the top word-of-mouth driver for Flighty/Wrapped. Highest-leverage *viral* feature; needs the design system first.
- **Home-screen widget & phase-as-identity status** (Flighty live activity / Strava) — current cycle day at a glance; optionally show your phase as a status your circle sees.

### 4. Lightweight, warm reactions — already the right instinct
- **Boops + emoji reactions = kudos.** Keep them frictionless (fix the double-tap-un-like bug in BUGS.md). Add **care actions** ("send a tiramisu / heat pad") for the emotional layer the fitness/dining apps *don't* have — this is the differentiator.

### 5. Gentle streaks & groups (Duolingo / Strava clubs) — later
- **Check-in streaks** to nudge logging *without* nagging (streaks on a health app must never shame — quiet, opt-in).
- **Friend groups** ("the group chat, in-app") — already on the roadmap under Social.

### The two things that will make or break the loop
- **Cold-start / network effects.** Like early Strava, the app is boring until *your* friends are on it. → invite-only + referral-gated growth (PITCH → Go-to-market), and a genuinely useful *solo* mode (cycle wheel + insights) so a lone user still gets value on day one.
- **Consent as a feature, not a blocker.** Unlike runs or restaurants, cycle data is intimate. The engagement mechanics above (auto-broadcast, leaderboards, status) are only acceptable if sharing is **explicit, granular, and revocable** — which today it isn't (BUGS.md). Fixing the consent model is a *prerequisite* for the social loop, not a side quest. Oura Circles / Whoop Teams prove sensitive data *does* get shared — but only inside a trusted, consent-gated circle.

---

# Reference: feature areas

## Design & aesthetics — highest leverage

The app works but looks utilitarian. A cohesive visual identity is the single biggest thing that will make it *feel* real. Ethos: **serious, not pink/girly/fluffy** — clean, considered, trustworthy; and **fast, low-friction period entry**.

- **Design system** — a **foundation already exists** (`app/theme/brand.ts` colors/type + `app/config/branding.ts`, imported by ~8 screens), but it's only a palette/type layer: screens still each define their own `StyleSheet.create` and there are **no shared UI components** yet. Next: extract shared components (buttons, cards, chips, empty/loading states) so the look is consistent and screens stop re-declaring styles. Ethos: a considered palette (not stereotypically "girly"), type scale, spacing.
- **App icon & splash** — branded, using the red-drop motif from the "Sisters by Blood" origin story (see PITCH.md).
- [x] **Branded launch/intro screen (requested 2026-07-27).** _(Done 2026-07-28.)_ On every app open, a short (~2.4s) animated intro shows the name + tagline (**"Cadence — where your cycle meets your circle"**) with a red-drop mark, then fades into the app. It's an overlay rendered on top of `AppInner`, so the real UI hydrates behind it and it never adds a loading wall. `app/components/brand/BrandSplash.tsx`, `App.tsx`, tagline in `app/config/branding.ts`. _Future polish: a matching native/OS splash so there's no seam before JS boots._
- **Cycle visualization** — a cycle wheel or calendar as the home-screen centerpiece.
- **Empty & loading states**, **micro-interactions + haptics** on boops/reactions, **dark mode**.
- **Icon polish** — the boop "hand/wave" icon doesn't read as a wave; try a "poke" or a clearer gesture icon.

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
- [~] **Find friends from contacts.** 🚧 (WIP — Codex, 2026-07-29) With explicit Contacts permission and privacy-conscious matching, show which contacts already use this app and make it easy to invite the rest.
- [x] **Make "Remove friend" discoverable.** _(Done 2026-07-27.)_ The capability already shipped (`remove_friend` RPC → `removeFriend` → `FriendsScreen`) and is **mutual** — the SECURITY DEFINER RPC sets `has_shared = false` on **both** sides and deletes the `friend_requests` row **both** directions, so either person removing ends the friendship for both (and it doesn't get resurrected by `ensure_friend_sharing`, since the accepted request is deleted). It was only reachable via a hidden **long-press**; then briefly a "Remove" button on each list row; and now (2026-07-28, per request) it lives on the **friend's sync page** — a "Remove friend" button below Boop, with a confirm dialog (mutual remove → back to the list) — and is **off the friends list** entirely. See [BUGS.md](BUGS.md) "Found in testing (2026-07-28)". Note: removing a friend is still the *only* way to stop sharing cycle data (see the consent-model item in [BUGS.md](BUGS.md)).
- **Friends overview** — see approved friends' current phases at a glance (consent-gated).
- **Calendar of friends** — who's PMSing on which day, visualized with memoji-like faces; collapse many into an iOS-group-chat-style stack to avoid clutter.
- **Feed** — chronological timeline of friends' events; react with emojis; "boop" a friend; delete your own posts _(shipped)_.
- **Edit your own posts.** Let authors update a post after publishing and display an **Edited** label on any changed post. Preserve ownership checks and update timestamps server-side.
- **Blended profile / sync score** — how "in sync" you and a friend are, with recommendations for what to do together. _(No longer dummy: `computeSyncScore` in `syncScore.ts` is a real model — phase alignment 45% + recent-flow timing 35% + 28-day flow overlap 20%, with a low/med/high confidence flag, highlights, a timeline, and a cycle-trend table.)_
- **Sync-score leaderboard — your top friends (signature feature).** Rank your friends by sync score and surface a **"most in sync" list (top 5)** — the Beli-style *relative* hook that drives engagement and sharing. Per-friend scores are already computed in `FriendsScreen`; this is about ranking + presenting them (leaderboard on the Circle screen, "you're most in sync with X" moments, monthly "who you synced with most"). See PITCH → "sync scores are the signature hook."
- **Phase-aware recommendations — do something *with* a friend.** Turn the sync score + both phases into a concrete suggestion for the pair: e.g. *"you're both high-energy this week — plan a workout together,"* or *"she's in her PMS phase — send her some love."* Builds on `fallbackRecommendations`/`cycle-guidance`; the point is the recommendation is **relational** (an action you take together / for each other), which is the app's differentiator over solo trackers. Ties into Care actions below.
- **PMS / phase notifications** — a heads-up when a friend (or partner) is PMSing — playful, opt-in.
- **Care actions** — send support when a friend is cramping/PMSing (e.g. "send some love," a "send a tiramisu / heat pad" gesture). The emotional layer fitness/dining apps don't have.
- **End-of-year recap** — how similar your cycle was to each friend, who you synced with most.
- **Granular sharing** — share your phase but not your symptoms, per friend.
- **Forum / Q&A** *(later)* — cluster responses by demographic / cycle data so answers come from people most similar to you.

## Engagement & notifications

- [ ] **Dedicated notifications page with a new/read distinction (requested 2026-07-30, owner).** Today notifications live in a **bottom sheet** (`NotificationsSheet`) opened from the bell, and everything is treated as "unread until dismissed" — the bell badge is just a raw count (`unreadCount = notifications + friendRequests + acceptances`) and opening/closing the sheet effectively clears the signal (e.g. `markAcceptancesSeen` on close), so notifications "all get cleared as soon as you open." Want instead: **(1) a full dedicated Notifications screen** (its own route, not a transient sheet) reachable from the bell; **(2) a genuine new-vs-read state** — new items highlighted, read items styled down, and the badge counting only *unread*; **(3) opening the page should not silently wipe everything** — mark items read intentionally (on view or per-item), keeping history visible. Approach options: a lightweight **client-side "seen" set** in AsyncStorage (mirrors the existing `seen-accepted-requests:<userId>` pattern — no migration) vs. a **`read_at` column** on the `notifications` table (survives across devices, needs a migration). Touches `useNotifications.ts`, `NotificationsSheet.tsx` (→ a new `NotificationsScreen`), `AppNavigator.tsx`, and the bell wiring in `HomeScreen.tsx`. Pairs with the push/realtime work below.
- **User notifications** *(next up — infra partly exists: `expo-notifications`, `device_tokens`, `usePushNotifications`, the `notifications-handler` edge function)* — ask permission, then notify on: a new friend request, a reaction to your post, a friend starting their period ("send support"), and cycle-sync events.
- **Notification strategy** — for a social app, *not being annoying* is a design problem in its own right: think frequency caps, batching, quiet hours, and per-type user controls.
- **Home-screen widget** — current cycle day at a glance.
- **Gentle check-in streaks** — encourage logging without nagging.

## Privacy & data controls

For menstrual data specifically, privacy is a **feature area**, not just a design principle:
- **Privacy/consent dashboard** — see and control exactly what each friend (or group) can see.
- **Data export** — let users download their own data.
- **Deletion** — account + data deletion (shipped) and clear, honest disclosure of what's stored and shared.
- **Biometric app lock — Face ID / Touch ID (requested 2026-07-27)** — gate opening the app (and/or re-auth for sensitive actions) behind Face ID / Touch ID via `expo-local-authentication`, opt-in in settings. Especially fitting for intimate cycle data. Note: this is *device-unlock*, separate from the account-level "Sign in with Face ID / passkey" auth path (which pairs with the "Sign in without Apple" TODO).
- **Expand the settings page (requested 2026-07-27, future task)** — the profile/settings screen needs more controls. Candidates: sharing/consent controls (ties into the consent-model fix), notification preferences (per-type toggles, quiet hours), the biometric lock toggle above, auto-post settings entry, data export/deletion, and account/name management. Scope as its own design pass.

## Profiles & identity

- **Scope and complete avatar setup/editing.** Avatar-generation infrastructure and profile avatar editing already exist, but define the intended user flow and states: adding an avatar for the first time, replacing/removing it, loading and failure handling, whether users can upload a photo versus generate one, and where avatars appear across profiles, the feed, and friend discovery.

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
