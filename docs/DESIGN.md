# Design

The design / branding / visual-identity track for this app. This is the "make it **premium, delightful, and beautiful**" work — the single biggest multiplier on whether people *love* the app (not just use it). It pulls from the design notes scattered in [FEATURES.md](FEATURES.md) (§ "Design & aesthetics", the "usable vs. likeable" teardown) and centralizes the **vision + the how**.

## The goal

A **polished, premium, sexy, delightful** health/lifestyle app that people *want* to open — on par with the apps we admire for design (Flighty's polish is *the* reason people love it). Today the app is functional but **utilitarian**; closing that gap is the highest-leverage "likeable" work (see the teardown in [FEATURES.md](FEATURES.md)).

Ethos (from FEATURES.md, keep consistent): **serious, warm, considered, trustworthy — not stereotypically pink/girly/fluffy.** A real design system, cohesive palette + type scale, branded icon/splash, avatars, and micro-interactions. Design it like a top-tier health/lifestyle app.

Scope of this track:
- **Visual identity / branding** — palette, type, logo, the red-drop motif (see the "Sisters by Blood" origin in [PITCH.md](PITCH.md)), app icon + splash.
- **Avatars** — branded avatar system (generation infra already exists; needs a defined flow — see [FEATURES.md](FEATURES.md) → Profiles & identity).
- **Design system** — shared UI components (buttons, cards, chips, empty/loading states) so screens stop re-declaring styles. A palette/type foundation already exists in `app/theme/brand.ts` + `app/config/branding.ts`.
- **Home screen as centerpiece** — the cycle wheel/calendar as a beautiful, delightful hero.
- **Micro-interactions, haptics, dark mode, empty/loading states.**

## The approach (owner's idea — worth trying)

> "I am really bad at visual design lol." — so lean on AI + market research instead of hand-designing from scratch.

1. **Market research / mood-board** — study health/lifestyle apps we find beautiful (Flighty, Oura, Whoop, Co-Star, Clue/Flo for the category, etc.); collect screens/themes we like as references.
2. **Generate mockups with an image model** — use an image-generation model (e.g. GPT Image / "gpt image 2" or similar) to generate sample UI images / themes / full mockups for the app's key screens, iterate on prompts until we have mocks we love.
3. **Pixel-for-pixel implementation loop** — feed the chosen mock to a coding model and have it **iterate in a loop to replicate the design pixel-for-pixel** (build screen → screenshot in simulator → diff against the mock → refine → repeat) until the live app matches the mock.
4. **Extract into the design system** — once a look is nailed, factor the recurring pieces into shared components/tokens so the whole app inherits the new look.

This turns "I can't design" into a tractable generate → pick → replicate pipeline.

## Status

- ✅ Palette/type foundation (`app/theme/brand.ts`, `app/config/branding.ts`), imported by ~8 screens.
- ✅ Branded animated launch/intro overlay (`BrandSplash.tsx`, tagline "Cadence — where your cycle meets your circle").
- ✅ Haptics on Home-feed boops/reactions.
- ⬜ Everything else above — this is the open work. **This is the top "likeable" priority** per the [FEATURES.md](FEATURES.md) teardown.

## Related

- [FEATURES.md](FEATURES.md) → "Design & aesthetics", "usable vs. likeable" teardown, "Profiles & identity" (avatars).
- [PITCH.md](PITCH.md) → the red-drop / "Sisters by Blood" origin for the branding motif.
- [TODO.md](TODO.md) → the actionable design task points here.
