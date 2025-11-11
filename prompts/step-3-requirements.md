# Step 3 – Requirements Prompt

You are Codex. Using the material in `thoughts/shared/features/YYYY-MM-DD-cycle-companion-feature.md` (the Step 2 output for today’s date), produce an actionable set of requirements for the net-new Cycle Companion Chatbot using the EARS (Easy Approach to Requirements Syntax) methodology.

## Objective
Author `thoughts/shared/requirements/YYYY-MM-DD-cycle-companion-requirements.md` containing a complete, testable requirement set tailored to a SwiftUI iOS implementation. Use the same date stamp applied in Step 2.

## Directions
1. Re-read the Step 2 feature narrative end-to-end to confirm scope, actors, flows, and constraints.
2. Transform every promised behavior into an EARS-style requirement. Use the correct pattern (Ubiquitous, Event-driven, State-driven, Optional, etc.) and label each requirement with its pattern.
3. Group requirements by functional area: UI & Interaction, Data & State, AI/LLM Integration, Privacy & Compliance, Analytics, and Operational/Tooling.
4. Provide traceability by referencing the originating section or persona from the Step 2 document inside parentheses.
5. For each requirement, add an **Acceptance Evidence** note describing how engineers can validate it (unit tests in Swift, UI tests with XCUITest, manual QA script, telemetry dashboard, etc.).
6. Call out assumptions or unresolved items that blocked a concrete requirement and propose next steps to close the gap.

## Formatting Expectations
- Start with a short introduction that reiterates scope and references `thoughts/shared/features/YYYY-MM-DD-cycle-companion-feature.md`.
- Present requirements as numbered lists inside their respective subsections. Example syntax: “Ubiquitous: The system shall …”.
- Use tables when Acceptance Evidence benefits from multi-column detail (e.g., Requirement ID | Pattern | Validation).

## Quality Bar
- Requirements must be implementation-ready, unambiguous, and tailored for SwiftUI + Combine/async workflows.
- Include non-functional requirements covering performance (latency targets for Codex responses), accessibility (VoiceOver, Dynamic Type), localization, and telemetry.
- Ensure every requirement implicitly supports achieving ≥80% automated test coverage in subsequent steps.
- Close with the exact `thoughts/shared/requirements/...` path created for archival.
