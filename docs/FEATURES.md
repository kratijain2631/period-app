# Features

The product roadmap — planned features, design improvements, and ideas. Pull an item into a build, then record what shipped in [RELEASE_NOTES.md](RELEASE_NOTES.md). Operational/shipping tasks live in [TODO.md](TODO.md); open bugs in [BUGS.md](BUGS.md).

## Guiding idea

This app is a period tracker that's **social** — going through your cycle *with* the friends you choose. Every feature should either (a) make personal cycle tracking genuinely useful, or (b) deepen the supportive social layer. Keep it **warm, private, and consent-first**.

## 1. Design & aesthetics — highest leverage

The app works but looks utilitarian (ad-hoc inline styles, plain text screens). A cohesive visual identity is the single biggest thing that will make the app *feel* like a real product.

- **Design system** — a warm, calm palette (soft rose/plum, matching the brand), a type scale, consistent spacing, and a small set of styled components (buttons, cards, inputs, headers). Replace the scattered inline styles with shared components.
- **App icon & splash screen** — a real, branded app icon and launch screen (right now it's the default).
- **Cycle visualization** — a cycle wheel or calendar as the home-screen centerpiece: where you are in your cycle today, current phase, and predicted days.
- **Empty & loading states** — friendly copy + simple illustrations when there are no friends/posts; skeleton loaders instead of "Loading…".
- **Micro-interactions** — subtle animation and haptics on boops and reactions so the social moments feel good.
- **Dark mode.**

## 2. Core cycle features — make tracking genuinely valuable

- **Predictions & insights** — predict next period, fertile window, and PMS window from history; a daily "where you are in your cycle" summary.
- **Calendar view** — past cycles + predictions at a glance.
- **In-app logging** — log mood, symptoms, and notes directly in the app (complementing the Apple Health read).
- **Phase context** — short, non-preachy info about what each phase means.

## 3. Social & support — the part that makes this app different

- **Friends overview** — see approved friends' current phases at a glance (consent-gated).
- **Care actions** — send a supportive note or "care package" when a friend is on their period or in their PMS window.
- **Sync insights** — "you and Maya are in sync this month."
- **Richer feed** — mood tags, gentle prompts, satisfying reactions; maybe lightweight comments.
- **Granular sharing** — share your phase but not your symptoms, per friend.
- **Circles** — separate groups (close friends vs. a wider circle).

## 4. Engagement & notifications

- **User notifications** *(next up — infra partly exists: `expo-notifications`, `device_tokens`, `usePushNotifications`, the `notifications-handler` edge function)* — ask permission, then notify on: a new friend request, a reaction to your post, and a friend starting their period ("send some support"). Expandable to more events later.
- **Home-screen widget** — your current cycle day at a glance.
- **Gentle check-in streaks** — encourage logging without nagging.

## Rough sequencing

1. **Now** — design system + app icon/splash + a home-screen cycle visualization (the biggest "this feels real" jump), plus user notifications.
2. **Next** — predictions/insights + calendar view + friends overview.
3. **Later** — care actions, richer feed, granular sharing, widget, circles.

_(Add new ideas under the theme they fit. This is a living plan — reprioritize freely.)_
