# Step 2 – Feature Description Prompt

You are Codex. Draft a rich feature narrative for the net-new in-app “Cycle Companion Chatbot” that will anchor the first release of our SwiftUI iOS period-tracking experience. This document should enable designers, product managers, and engineers to share the same mental model before any implementation begins.

## Objective
Write a detailed feature description to `thoughts/shared/features/YYYY-MM-DD-cycle-companion-feature.md` (use today’s date) that explains what the chatbot does, why it matters, and how it behaves inside the SwiftUI app.

## Directions
1. Frame the problem statement from the perspective of people tracking menstrual cycles who want personalized guidance, emotional support, and actionable insights.
2. Describe the chatbot’s role inside the iOS app: how it appears in SwiftUI views, how it leverages Codex to draft responses, and how it augments existing tracking flows (logging symptoms, predicting phases, sharing educational content).
3. Capture target personas, goals, success metrics, and non-goals. Tie these to concrete user journeys (e.g., onboarding, daily check-in, escalation to healthcare provider resources).
4. Provide high-level interaction flows: entry points, conversation stages, fallback behaviors, trust & safety guardrails, offline messaging strategy.
5. Enumerate constraints and enablers: privacy/regulatory requirements, AI response latency, multilingual needs, watchOS/iPad considerations, and how Codex tools accelerate iteration.
6. Include instrumentation expectations (analytics events, A/B hooks) and rollout strategy (feature flags, staged rollout, experimentation plan).

## Suggested Structure
- Overview & Problem Statement
- Personas and Goals
- User Value & Success Metrics
- Experience Narrative & Interaction Flow
- Constraints, Dependencies, and Guardrails
- Instrumentation & Rollout Plan
- How Codex Supports the Team

## Quality Bar
- Use concise prose, user-centric language, and numbered flows when appropriate.
- Reference SwiftUI surfaces (e.g., `ConversationView`, `DailySummaryCard`) to keep the feature grounded in implementation reality.
- Call out open questions explicitly so downstream steps can resolve them.
- End with the exact `thoughts/shared/features/...` path to aid discoverability.
