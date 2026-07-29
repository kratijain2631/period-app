# Pitch

The vision, philosophy, and positioning for this app. (The name is not final — see [TODO.md](TODO.md); prototype names have included InSync, Cadence, Sync Sisters, Cycle Companion.)

## One-liner

**Where your cycle meets your circle.**

A social menstruation app: track your period, sync with friends, and plan your life around your cycle — turning hormonal health into a shared rhythm, not a private struggle.

## The pitch

This app turns menstrual tracking into a **social and empowering** experience, with the goal of making women's health **visible, shared, and celebrated**. By integrating with Apple Health (and, later, personal calendars), it provides **phase-based wellness insights** and lifestyle and professional recommendations tailored to hormonal rhythms.

The **social layer** lets users connect with friends, see when their cycles sync up, and get friendly updates on each other's phases — fostering awareness, empathy, and connection. Anonymized, opt-in, location-based data can fuel **new research** on hormonal trends and cycle syncing — bridging science, community, and empowerment.

## App Store / TestFlight description (live copy)

The current store-listing description (App Store Connect → App Information). Keep this in sync with what's live:

> **Cadence is where your cycle meets your circle** — cycle tracking you actually share with the friends you choose.
>
> Cadence reads your cycle data from Apple Health (read-only — it never writes anything back) to show you personalized insights. Accepting a friend request shares only core phase and calendar timing so you can see when you sync up; detailed Health data stays private. Posts and moods are visible when you choose to publish them, and removing a friend ends their access.
>
> Sign in with Apple, grant Apple Health access, add a friend or two, and see what it's like to go through your cycle together instead of alone.

## Why (philosophy)

- **Women's empowerment is the mission, not a feature.** The whole product exists to make women's health **visible, shared, and celebrated** — to take a monthly experience women are taught to hide and reframe it as a source of connection, self-knowledge, and even pride. Every design and feature decision should ladder up to this: reduce stigma and shame, give women language and data about their own bodies, and let them go through their cycle *supported by the friends they choose* instead of alone. This is also the brand's heart and its marketing story (the "Sisters by Blood" origin).
- **Plan life around the menstrual cycle to increase productivity** — organize work, fitness, and life around a woman's monthly cycle rather than a man's daily one (creative / planning / active weeks).
- **Social layer = empowerment & celebration** — surface and celebrate menstruation instead of hiding it as a private struggle. Reimagine your period as part of your identity, not something to conceal.
- **Sync scores are the signature hook** — see how "in sync" you are with each friend, and a **leaderboard of your most-synced friends** (your top 5). Relative, social, and genuinely delightful — the thing people screenshot and talk about.
- **Recommendations turn insight into action, together** — phase-aware nudges for what to do *with* a friend: "you're both high-energy this week — go work out together," or "she's in her PMS phase — send her some love." Advice that facilitates a supportive friendship, not just a solo dashboard.
- **It's fun** — knowing whether you're synced up with friends is genuinely delightful.
- **Useful research data** — opt-in location + cycle data can advance real research on cycle syncing and variation.
- **A logging flywheel** — the social layer motivates people to log more, which makes the personal insights more valuable to them.

## Positioning & design ethos

- **Serious, not fluffy.** Not pink / girly / overly colorful — clean, considered, trustworthy design.
- **Easy to use**, especially fast, low-friction period entry.
- Build a **community** around wellness and hormonal awareness.

## Market landscape & comparables

**Thesis:** the winning move in consumer tracking apps over the last decade has been to take a *solo logging habit* and wrap it in a *consent-based social layer*. That layer — not the tracking itself — is what drives **retention** (you come back for your friends, not the data), **virality** (invites + shareable stats), and a **logging flywheel** (a little social pull → more logging → better personal insights). No one has run this playbook for the **menstrual cycle**. That's the opening.

### The playbook, proven in adjacent niches

| App | Solo habit it made social | Social mechanic | What we borrow |
|---|---|---|---|
| **Strava** | Running / cycling | Activity feed, kudos, comments, segments & leaderboards, clubs | A feed + lightweight reactions ("boops"); friends turn a private metric into motivation |
| **Beli** | Eating out | Rank restaurants, friends' lists & recs, invite-gated growth | Referral-gated launch, friend recommendations, rankings/taste (we already cite this below) |
| **Flighty** | Flying | Share trips with friends/family, annual "Passport" recap | Premium design + a shareable, "wrapped"-style recap as word-of-mouth |
| **Letterboxd** | Watching films | Diary + reviews + following + lists | Identity/self-expression around logging; community |
| **Duolingo** | Learning a language | Streaks + friend leaderboards | Streaks and gentle accountability to drive daily logging |
| **Oura / Whoop** | Sleep / recovery (intimate biometrics) | Oura "Circles", Whoop "Teams" — share readiness with trusted people | Proof that even sensitive health data gets shared **when it's consent-gated to a trusted circle** — the closest analog to sharing cycle data |

**Common thread:** each turned a private number into a shared experience, and the social layer is what made it sticky and viral. The flip side — the risk we inherit — is **cold-start network effects**: like early Strava, the app is dull until your friends are on it. That's why invite-only + referral growth (below) matters.

### The period-tracking space specifically

The category is enormous, but its "social" is thin — almost always **anonymous forums** or **single-partner sharing**, never a real friend graph:

| App | Position | "Social" today |
|---|---|---|
| **Flo** | Category leader (largest by far) | Anonymous community ("Secret Chats") + 1:1 **partner mode** — no friend network |
| **Clue** | Science- / privacy-first | Solo |
| **Stardust** | Period + astrology, TikTok-viral, privacy-forward | Community vibe, but not friend-to-friend cycle sharing |
| **Natural Cycles** | FDA-cleared contraception | Solo / clinical |
| **Apple Health – Cycle Tracking** | Built-in default on iPhone | Solo (Health data can be shared 1:1, but it isn't a social product) |

**The white space:** a **friend-graph, consent-based social layer for cycles** — "Strava / Beli for your period." Everyone already tracks; nobody has made it social *with the friends you choose*. The bet is that the dynamic that made fitness, dining, and film logging social will work for cycle tracking too — with the added pull that going through your cycle *with* friends is genuinely supportive, not just gamified.

> **Caveat:** this is a founder-level scan, not verified market sizing. Before fundraising or launch, firm up per-competitor downloads/revenue and re-confirm each app's current feature set — they ship fast, and the "social" gaps above may narrow.

### The engagement loop (the actual bet)

The lesson from Strava and Flighty isn't "add a feed" — it's that **the content logs itself.** GPS and flight-imports mean the feed fills with zero effort and you get social reward for just living your life. This app has the same latent superpower in **Apple Health auto-ingest**: cycle events can post themselves to your circle, so the loop is *auto-logged data → friends react/support → you open the app more → better personal insights → repeat*. Manual text posts are the weak version of this; the auto-updates are the moat. Two hard parts gate it: **cold-start** (dull until your friends join → invite/referral growth + a useful solo mode) and **privacy clarity** (accepting a friend deliberately shares only the safe phase/calendar layer; detailed health observations remain private, and post settings control auto-publishing). See [FEATURES.md](FEATURES.md) → "The retention loop" for the concrete build order.

## Origin story

The logo nods to the little red-drop emoji from the founders' group chat, **"Sisters by Blood"** — connecting the app to the friendship that inspired it. (Worth fleshing this story out for marketing.)

## Monetization (early thoughts)

- **Affiliate / product recommendations tied to your phase** — iron supplements, hot-water packs, pain-management techniques, phase-appropriate workout classes, motivational content. Advice and products hand in hand.

## Go-to-market & growth

- **Referral system** (à la Beli) — unlock certain features after N successful referrals.
- **Invite-only** launch to build exclusivity and community.
- **Marketing & branding** — worth hiring a specialist; strong branding is core to this product.
- **Ad inspiration:** Meta's Instagram-for-teens ads — a commercial showing messages coming in from the app and how it connects people in all sorts of ways.

## Research angle (longer term)

Anonymized, opt-in, aggregate data could support research on: cycle syncing by proximity/location, cycle variation from travel and weather, workout data vs. cycle, and skin/beauty vs. ovulation. Always privacy-first and consent-based.
