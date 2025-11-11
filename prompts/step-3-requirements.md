# Step 3 – Requirements Prompt

You are Codex. Using the material in `thoughts/shared/features/YYYY-MM-DD-cycle-companion-feature.md` (the Step 2 output for today’s date), produce an actionable set of requirements for the net-new Cycle Companion, which runs in a React Native iOS app, syncs data from Apple Health, and persists to Supabase. Use the EARS (Easy Approach to Requirements Syntax) methodology.

## Objective
Author `thoughts/shared/requirements/YYYY-MM-DD-cycle-companion-requirements.md` containing a complete, testable requirement set tailored to a React Native iOS implementation with Supabase + Apple Health integration. Use the same date stamp applied in Step 2.

## Directions
1. Re-read the Step 2 feature narrative end-to-end to confirm scope, actors, flows, and constraints, paying special attention to Apple Health data ingestion and Supabase sync requirements.
2. Transform every promised behavior into an EARS-style requirement. Use the correct pattern (Ubiquitous, Event-driven, State-driven, Optional, etc.) and label each requirement with its pattern.
3. Group requirements by functional area: UI & Interaction (React Native), Data & State (including Apple Health + Supabase), Privacy & Compliance.
4. Provide traceability by referencing the originating section or persona from the Step 2 document inside parentheses.
5. For each requirement, add an **Acceptance Evidence** note describing how engineers can validate it (unit tests, etc.).
6. Call out assumptions or unresolved items that blocked a concrete requirement and propose next steps to close the gap.

## Formatting Expectations
- Start with a short introduction that reiterates scope and references `thoughts/shared/features/YYYY-MM-DD-cycle-companion-feature.md`.
- Present requirements as numbered lists inside their respective subsections. Example syntax: “Ubiquitous: The system shall …”.
- Use tables when Acceptance Evidence benefits from multi-column detail (e.g., Requirement ID | Pattern | Validation).

## Quality Bar
- Requirements must be implementation-ready, unambiguous, and tailored for React Native + TypeScript/JS workflows (plus necessary native modules).