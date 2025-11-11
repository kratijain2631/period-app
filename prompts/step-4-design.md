# Step 4 – Design Document Prompt

You are Codex. Study the greenfield planning artifacts generated in Steps 1–3 (`thoughts/shared/architecture/YYYY-MM-DD-architecture-from-spec.md`, `thoughts/shared/features/YYYY-MM-DD-cycle-companion-feature.md`, and `thoughts/shared/requirements/YYYY-MM-DD-cycle-companion-requirements.md` with today’s date) as well as the spec and wireframe in /references, and craft a deep design for delivering the Cycle Companion inside our React Native iOS codebase that syncs Apple Health data and persists to Supabase.

## Objective
Write a design document to `thoughts/shared/designs/YYYY-MM-DD-cycle-companion-design.md` (matching the same date stamp) that React Native engineers can implement without further clarification.

## Directions
1. Summarize the problem, constraints, and success criteria derived from the three source docs.
2. Describe the end-to-end solution architecture: React Native screens/components, state management (e.g., Zustand/Redux/Recoil), data models, networking, Supabase persistence strategy, and background refreshes.
3. Provide diagrams or structured descriptions for key flows. Textual “sequence diagram” tables are acceptable if visuals are unavailable.
4. Detail integration points with the Step 1 architecture: module boundaries, shared services, dependency injection, native module boundaries, error handling, caching, offline queueing, and privacy controls.
6. Include a Testing & Observability plan describing unit, snapshot, and UI tests; contract tests for AI clients; logging, metrics, and alerting hooks.
7. Wrap up with explicit trade-offs, alternatives considered.

## Required Sections
- Overview & Goals
- Inputs & Source Documents Summary
- Detailed Architecture (components, responsibilities, data flow)
- React Native UI/UX Design Notes
- Apple Health + Supabase Data, Privacy, and Security Considerations
- Testing & Observability Strategy
- Deployment
- Risks, Trade-offs, and Open Issues (should be resolvable before implementation)

## Quality Bar
- Use precise React Native + TypeScript terminology (e.g., `useState`, `useEffect`, `useFocusEffect`, TurboModules) and Swift/Objective-C specifics only when discussing Apple Health integration. Try to only expose JS and have packages handle as much of the Swift compilation as possible.
- Reference concrete files/modules suggested in the Step 1 architecture doc, or propose file paths when missing.
- Keep tone pragmatic, citing how each design decision enables maintainability, testability, and React Native best practices while meeting Apple Health + Supabase constraints.
- End with the exact `thoughts/shared/designs/...` path for reference.
