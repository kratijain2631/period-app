# Step 4 – Design Document Prompt

You are Codex. Study the greenfield planning artifacts generated in Steps 1–3 (`thoughts/shared/architecture/YYYY-MM-DD-architecture-from-spec.md`, `thoughts/shared/features/YYYY-MM-DD-cycle-companion-feature.md`, and `thoughts/shared/requirements/YYYY-MM-DD-cycle-companion-requirements.md` with today’s date) and craft a deep design for delivering the Cycle Companion Chatbot inside our SwiftUI iOS codebase.

## Objective
Write a design document to `thoughts/shared/designs/YYYY-MM-DD-cycle-companion-design.md` (matching the same date stamp) that engineers can implement without further clarification.

## Directions
1. Summarize the problem, constraints, and success criteria derived from the three source docs.
2. Describe the end-to-end solution architecture: SwiftUI views, view models (ObservableObjects/StateObjects), data models, networking/LLM orchestration, persistence strategy, and background refreshes.
3. Provide diagrams or structured descriptions for key flows (e.g., message dispatch, streaming Codex responses, analytics logging). Textual “sequence diagram” tables are acceptable if visuals are unavailable.
4. Detail integration points with the Step 1 architecture: module boundaries, shared services, dependency injection, error handling, caching, offline queueing, and privacy controls.
5. Specify how Codex-generated code or automations will be used during development (scaffolding new views, generating tests, updating documentation) and any safeguards required.
6. Include a Testing & Observability plan describing unit, snapshot, and UI tests; contract tests for AI clients; logging, metrics, and alerting hooks.
7. Wrap up with explicit trade-offs, alternatives considered, and rollout strategy (feature flags, staged rollout, kill switches).

## Required Sections
- Overview & Goals
- Inputs & Source Documents Summary
- Detailed Architecture (components, responsibilities, data flow)
- SwiftUI UI/UX Design Notes
- AI/Codex Integration Plan
- Data, Privacy, and Security Considerations
- Testing & Observability Strategy
- Deployment, Rollout, and Migration Plan
- Risks, Trade-offs, and Open Issues (should be resolvable before implementation)

## Quality Bar
- Use precise Swift terminology (e.g., `@State`, `Task`, `async/await`, `AppStorage`).
- Reference concrete files/modules suggested in the Step 1 architecture doc, or propose file paths when missing.
- Keep tone pragmatic, citing how each design decision enables maintainability, testability, and SwiftUI best practices.
- End with the exact `thoughts/shared/designs/...` path for reference.
