# Cycle Companion Feature Narrative

## Overview & Problem Statement
People who already track menstrual health inside Apple Health want a place that translates their synced data—flow, PMS notes, cramps, mood swings, any symptom tied to their cycle—into daily guidance and social context without re-entering anything. Cycle Companion is the first-release anchor for InSync’s iOS app: it ingests read-only menstrual data, stores state in Supabase, and surfaces actionable summaries inside existing React Native views (feed, profile, friend sync) so users can understand their own cycle and show up for friends. The feed is literally composed of whatever a user logs in Apple Health about their cycle, remixed into social stories and friend-facing updates. The experience must reinforce that InSync is a social layer on top of Apple Health, not a replacement tracker, while keeping all flows compliant with Apple’s policies and Supabase privacy rules.

## Personas and Goals
- **Reflective Tracker:** Wants a trustworthy snapshot of today’s phase, symptoms, and what to focus on next, all sourced from Apple Health so there is no duplicate logging.
- **Social Supporter:** Checks the feed and blended profiles to see where friends are in their cycles, when to send a boop, or whether a reaction would be appreciated.
- **New Joiner:** Just signed in with Apple and needs clear permission requests, explanations of Supabase storage (instead of CloudKit), and a guided first journey into the friend graph.

Goals: (1) convert HealthKit ingestion into daily rituals that live inside the feed/profile surfaces, (2) keep social moments—friend requests, boops, reactions, sync scores—rooted in the same data, and (3) uphold privacy expectations so users feel safe sharing sensitive cycle context. Non-goals for V0 include writing data back to Apple Health, launching Android/watchOS clients, or adding new biometric inputs beyond menstrual flow and predictions.

## Experience Narrative & Interaction Flow
1. **Onboarding & Permissions (`AppNavigator` ➜ `app/features/companion/screens/CompanionIntroScreen.tsx`):** After Sign in with Apple, users land on an intro screen that explains the social read-only approach. The flow calls `app/services/healthkit/permissions.ts` for `HKCategoryTypeIdentifierMenstrualFlow`; denial exposes inline education plus a retry CTA.
2. **Daily Snapshot in Feed (`FeedScreen.tsx` + `DailySummaryCard.tsx`):** The Feed tab opens with a Cycle Companion card summarizing the latest Apple Health sync (phase, expected window, logged PMS symptoms, cramps, mood updates) alongside suggested actions like “Send a boop” or “Review friend sync score.” CTA buttons deep-link to `FriendSyncScreen.tsx` or the reactions composer. The card updates after each background ingestion so users never wonder if data is stale.
3. **Notifications & Social Hooks (`NotificationsBell.tsx`, `app/features/friends/components/BoopButton.tsx`):** When the system detects a friend entering PMS/menstruation, it raises a badge on the bell icon and pre-fills a boop suggestion. Selecting the notification takes the user to that friend’s event in the feed, where Cycle Companion highlights why support might matter today.
4. **Blended Profile Support (`app/features/friends/screens/FriendSyncScreen.tsx`):** Inside the friend sync view, Cycle Companion supplies overlap timelines, a dummy sync score (per V0 spec), and shared recommendations like “Plan rest night Thursday.” Actions remain the existing ones—boop, react, send a message, or adjust friend status—so the feature augments rather than invents flows.
5. **Profile & Friend List (`app/features/profile/screens/ProfileScreen.tsx`):** The profile shows the user’s current phase plus quick filters for friends grouped by phase. Tapping a friend opens the sync screen noted above; tapping “View my timeline” returns to the feed summary card for continuity.
6. **Fallback & Offline Handling:** If Apple Health data is unavailable or Supabase is offline, `DailySummaryCard.tsx` renders the last synced snapshot stored in `app/storage/health.db` and displays a banner with “Retry sync” plus a link to troubleshooting docs. Users can still send boops or react because those actions queue against Supabase when connectivity returns.
7. **Trust & Safety Guardrails:** Permission copy explains that InSync only reads menstrual data and never exposes a friend’s details without mutual consent enforced by Supabase RLS. Sensitive summaries avoid medical promises and always include a “Learn more” link to the curated `ResourcesSheet.tsx`. Any request to defriend or hide someone stays inside existing friend management flows—Cycle Companion merely points to them when relevant.

## Constraints, Dependencies, and Guardrails
- **Apple Health Permissions:** Read-only access to menstrual flow and prediction samples via `@kingstinct/react-native-healthkit`. UI must show native permission sheets in context and clearly state that data never writes back to Apple Health.
- **Supabase Privacy & Residency:** Store user sessions, friend graphs, and Companion summaries in Supabase with row-level security so users only view their own data plus accepted friends. Region selection must remain configurable for future EU data residency needs. Friend-specific insights only appear when both sides have explicitly opted into sharing cycle details.
- **Regulatory Requirements:** Apple developer regulations prohibit CloudKit for this use case; Sign in with Apple is mandatory.
- **Offline & Reliability:** Health data is cached locally in SQLite to keep feed cards populated; queued boops/reactions retry once Supabase reconnects. Background fetch jobs should avoid exceeding Apple limits.
- **Social Scope:** Cycle Companion can only reference shipped features (feed, friend sync, reactions, boops, profile lists). It must not introduce new modalities like calendar views or chatbots until those exist in the roadmap.
- **Data Freshness Window:** Cached feed summaries expire after 24 hours; beyond that we hide the card until a new HealthKit sync succeeds to avoid outdated guidance.

## Open Questions
1. What copy and visual assets are approved for the “Learn more” resources sheet so we avoid implying medical advice?

**Path:** `thoughts/shared/features/2025-11-11-cycle-companion-feature.md`
