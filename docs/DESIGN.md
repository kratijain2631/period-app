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

## Image-generation prompt (for step 2)

Paste into an image model (GPT Image / Midjourney / Nano Banana / etc.) to generate sample mockups for the key screens. Generate several variations, pick the ones we love, then feed the winners into the pixel-for-pixel loop (step 3). The **master prompt** carries the brand; append **one screen block** per generation. Tweak freely — this is for inspiration, not a spec.

### Master prompt (prepend to every generation)

> A high-fidelity iOS app UI mockup, rendered as a single iPhone screen (portrait, modern iPhone with rounded corners, status bar, home indicator). This is **Cadence**, a premium social menstrual-cycle app — *"where your cycle meets your circle."* Design ethos: **serious, warm, considered, trustworthy, and delightful — NOT stereotypically pink, girly, or fluffy.** Think the polish of Flighty, Oura, and Co-Star applied to women's health.
>
> **Palette:** warm off-white / bone backgrounds (#FFFFFF, #F7F5F2), soft warm-neutral fills (#EDE9E3), deep warm charcoal text (#2D2A26) with muted taupe secondary text (#8A857E). Signature accent is a **terracotta / clay red (#C4654A)** — the brand's "red drop" motif — used sparingly for emphasis. Cycle phases each have a calm, sophisticated tone: **menstruation = terracotta (#C4654A), follicular = sage green (#7BA68F), ovulation = warm gold (#D4A252), luteal = dusty blue (#6B8DB5), PMS = muted mauve (#B56E9D)** — desaturated, earthy, never neon.
>
> **Typography:** a warm rounded sans for headings/display (Nunito-like, friendly but grown-up), a clean neutral sans for body (Inter-like). Generous spacing, clear hierarchy.
>
> **Form language:** soft rounded cards (18–28px radius), very soft low-contrast shadows, pill-shaped chips and buttons, roomy padding, calm negative space. Subtle, refined micro-detail. A small **red teardrop mark** appears as the brand icon. Cohesive, editorial, premium. No lorem-ipsum clutter, no stock-photo faces, no rainbow gradients, no cutesy clip-art.

### Screen blocks (append one at a time)

- **Home (hero / centerpiece):** The home screen centered on a beautiful **cycle wheel** — a circular ring visualization of the ~28-day cycle, current day marked, the ring segmented/gradated by phase color, with the current phase named in the center ("Follicular · Day 9"). Below: a card or two of phase-based insights ("energy is rising — good week for planning") and a subtle CTA. Warm, calm, hero-worthy.
- **Circle / sync leaderboard (signature hook):** A "Circle" screen with a **"Most in sync 🔴" top-5 leaderboard** — ranked rows of friends, each with a circular avatar tinted by their current phase color, their name, and a sync-score percentage; medal/badge accents on the top 3. Below the leaderboard, the rest of the friends list. Social, relative, screenshot-worthy — the delightful competitive moment.
- **Feed:** A social feed of cycle "moments" from friends — clean cards, each with a small phase-tinted avatar, a friendly auto-generated update ("Maya just started her follicular phase"), and lightweight reactions (a boop / red-drop react). Warm, low-friction, never clinical.
- **"Your cycle year" recap (Wrapped-style, shareable):** A gorgeous full-bleed **shareable recap card** — Spotify-Wrapped energy but calm and editorial. Big friendly stats (total cycle days, average cycle length, most-in-sync friend), phase-colored data viz, the Cadence red-drop mark. Designed to be screenshotted and shared.
- **Avatar system:** A set of branded profile **avatars** — soft, warm, abstract/illustrative (not photoreal, not cartoonish), each tintable by cycle-phase color, cohesive as a family. Show ~6 on a bone background.
- **App icon + splash:** An **app icon** exploration built on the red-teardrop motif — minimal, premium, recognizable at small size on warm/neutral and dark grounds; plus a matching launch/splash treatment with the wordmark "Cadence" and tagline.

### Tips

- Vary one axis at a time (layout, warmth of the neutrals, how boldly the terracotta is used, wheel vs. calendar for Home) so comparisons stay honest.
- Ask for **light and dark** variants of the winners — dark mode is on the roadmap.
- Keep real copy short and plausible so the mock reads like the real product, not filler.

### Which tool to generate with

For **UI mockups with legible text**, the image models rank roughly:

| Tool | Good for | Watch out |
|---|---|---|
| **ChatGPT (GPT Image)** ⭐ primary | Best all-rounder — follows long detailed prompts, renders legible text/labels, coherent screen layouts. Paste the prompt straight in. | Softens exact hex colors; treat the palette as a guide, not pixel-exact. |
| **Google Gemini ("Nano Banana" image)** ⭐ | As strong for UI, and excellent at consistency/editing — great for "same style, now the Feed screen" and iterating on one image. | Same text-rendering caveats. |
| **Midjourney** | Gorgeous aesthetic/mood, best pure look-and-feel. | Weakest at legible UI text and precise layout — better for vibe/color exploration than literal mockups. |
| **Claude** | ❌ Can't generate images. Claude's role is **step 3** — feed a chosen mock into code and replicate it pixel-for-pixel. |

**Recommended flow:** start in **ChatGPT**, generate 3–4 of the Home prompt; when you like a look, switch that image into **Gemini** to spin tight variants.

**Alternative — skip the image step:** tools like **v0 (Vercel)** or **Lovable** generate real, editable UI *code* from the same prompt. Tradeoff: they're web/React-oriented, so output isn't native RN and leans more "generic web app" than our warm editorial mood. For *inspiration* (this track's goal), the image models give a stronger aesthetic to aim at; revisit these if we ever want a code-first starting point.

## Status

- ✅ Palette/type foundation (`app/theme/brand.ts`, `app/config/branding.ts`), imported by ~8 screens.
- ✅ Branded animated launch/intro overlay (`BrandSplash.tsx`, tagline "Cadence — where your cycle meets your circle").
- ✅ Haptics on Home-feed boops/reactions.
- ⬜ Everything else above — this is the open work. **This is the top "likeable" priority** per the [FEATURES.md](FEATURES.md) teardown.

## Related

- [FEATURES.md](FEATURES.md) → "Design & aesthetics", "usable vs. likeable" teardown, "Profiles & identity" (avatars).
- [PITCH.md](PITCH.md) → the red-drop / "Sisters by Blood" origin for the branding motif.
- [TODO.md](TODO.md) → the actionable design task points here.
