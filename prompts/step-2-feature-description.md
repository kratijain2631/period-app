# Step 2 – Feature Description Prompt

You are Codex. Draft a rich feature narrative for the net-new in-app “Cycle Companion" that will anchor the first release of our React Native iOS period-tracking experience. This experience begins by syncing data from Apple Health, stores user state in Supabase (instead of CloudKit), and must comply with Apple’s developer regulations.

## Objective
Write a detailed feature description to `thoughts/shared/features/YYYY-MM-DD-cycle-companion-feature.md` (use today’s date) that explains what the feature does, why it matters, and how it behaves inside the React Native app.

## Directions
1. Frame the problem statement from the perspective of people tracking menstrual cycles who a social period tracking experience.
2. Describe the feature's role inside the iOS app: how it appears in React Native surfaces.
3. Capture target personas, goals, success metrics, and non-goals. Tie these to concrete user journeys (e.g., onboarding, daily check-in, escalation to healthcare provider resources).
4. Provide high-level interaction flows: entry points, fallback behaviors, trust & safety guardrails.
5. Enumerate constraints and enablers: Apple Health permission requirements, Supabase data residency, privacy/regulatory needs, AI response latency

## Suggested Structure
- Overview & Problem Statement
- Personas and Goals
- User Value & Success Metrics
- Experience Narrative & Interaction Flow
- Constraints, Dependencies, and Guardrails

## Quality Bar
- Use concise prose, user-centric language, and numbered flows when appropriate.
- Reference React Native surfaces (e.g., `ConversationView.tsx`, `DailySummaryCard.tsx`) to keep the feature grounded in implementation reality.
- Call out open questions explicitly so downstream steps can resolve them.
- End with the exact `thoughts/shared/features/...` path to aid discoverability.
