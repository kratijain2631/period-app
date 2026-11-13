# Home, Feed, Circle and You widget preview

This preview renders the **actual React Native presenters** used by Home through React Native Web. All data is labeled example data; its actions are local simulations, with no authentication, HealthKit, Supabase, notifications or rewards side effects. The production app still starts at `App.tsx`.

From the repository root:

```sh
EXPO_OFFLINE=1 npx expo start --localhost --port 8084
```

Then open <http://localhost:8084/home-widgets.html>. `public/home-widgets.html` links to this directory’s `index.html`; Metro serves both the bundle and fonts on the same origin. Do not serve the HTML on another port: Expo’s font loader requires the assets on the same origin. This is a local development preview, not a published site.

Open Controls for the theme, 320/390/480 px widths and ready, empty, loading, error, stale or offline fixture states. The bottom tabs stay visible while scrolling. Drafts and reactions persist across tabs and themes. Reloading resets sample edits.

| Page | Try in the preview |
| --- | --- |
| [Home](http://localhost:8084/home-widgets.html?screen=home) | Tap the phase strip, tip, transition, top sync match or latest update to open its full destination. |
| [Feed](http://localhost:8084/home-widgets.html?screen=feed) | Share an update, choose a reaction, send a boop or open the author's profile. |
| [Circle](http://localhost:8084/home-widgets.html?screen=circle) | Open the [sync leaderboard](http://localhost:8084/home-widgets.html?screen=circle#leaderboard), select a friend to view their profile, or switch ranking tabs. Tap **Add Friends** beside the directory to open discovery and requests. |
| [Add friends](http://localhost:8084/home-widgets.html?screen=add-friends) | Respond to a request, discover someone or share/copy the invite link. Discover friends accepts the synthetic name Tess, alias tesslane, exact email tess@example.com or phone +1 202-555-0142. Find from contacts has a scrollable sample address book. Select up to five eligible people, send, accept or decline incoming requests, and use Controls to simulate a pending contact accepting.  |
| [You](http://localhost:8084/home-widgets.html?screen=you) | Edit the sample profile, view your outward profile, press or hover over the cycle wheel, read the recap, review [My updates](http://localhost:8084/home-widgets.html?screen=you#my-updates) or open the [inline Phase Guide](http://localhost:8084/home-widgets.html?screen=you#phase-guide). |
| [Member profile](http://localhost:8084/home-widgets.html?screen=profile&person=maya) | Identity, bio, relationship, eligible sync and the person's shared updates. |
| [Notifications](http://localhost:8084/home-widgets.html?screen=notifications) | Read notifications in arrival order, open the sender’s profile, and accept or decline requests inline. |

The [page directory and widget assignments](../../docs/UI_ARCHITECTURE.md#page-directory) cover the current design and proposed roadmap placements. The native app implements these four tabs and secondary pages with actual account-scoped services. Physical iOS accessibility, Dynamic Type and signed-in API interactions require device verification.
