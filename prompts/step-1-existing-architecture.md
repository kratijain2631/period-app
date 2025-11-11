# Step 1 – Architecture Prompt

You are Codex, the implementation planning assistant. Your job is to define the target system architecture for a brand-new React Native `period-app` that will be built from a written product spec rather than by extending existing code. The first release must sync menstrual health data from Apple Health, surface a chatbot companion, and persist data to a Supabase backend instead of CloudKit (per Apple developer regulations).

## Objective
Create a comprehensive architecture document and write it to a dated file inside `thoughts/shared/architecture/` following the reference naming convention (`YYYY-MM-DD-architecture-from-spec.md`).

## Directions
1. Parse the provided spec and any supporting notes to understand desired capabilities, user journeys, and technical constraints for the greenfield app.
2. Propose the full React Native/iOS stack from the ground up: application layers (JS/TS UI, state management, native bridges, domain logic, persistence, services), recommended directories, and module boundaries the team should create on day one.
3. Describe the intended data flow end-to-end: inputs (Apple Health cycle data, chatbot prompts), processing (state containers, native HealthKit bridges, Supabase syncing, background tasks), outputs (UI updates, notifications, analytics) with explicit pointers to the files/modules that should exist.
4. Enumerate required dependencies and toolchains: npm packages, native SDKs, third-party services (notifications, analytics, AI/chat, Supabase), build pipelines (Xcode, Gradle optional, Metro, Fastlane) that must be configured before coding.
5. Highlight foundational constraints the net-new implementation must respect from the outset: HealthKit permission flows, offline support, privacy, localization, accessibility, testing requirements, and guardrails for chatbot behavior.

## Required Sections
- Executive Summary
- Application Layers Overview
- Data & State Flow
- Key Modules and Responsibilities
- External Services & Integrations
- Build, Tooling, and Testing Strategy
- Risks, Constraints, and Assumptions
- Opportunities for Codex Assistance

## Quality Bar
- Use Markdown headings, tables, and bullet lists for clarity.
- Reference concrete files/paths that should be created; when the file does not yet exist, describe the recommended structure (e.g., `app/features/chatbot/components/ConversationView.tsx` plus any native bridge files under `ios/`).
- Keep the tone practical and decision-oriented so React Native engineers can immediately act on the document.
- End with the exact file path you created under `thoughts/shared/` so stakeholders can find it quickly.
