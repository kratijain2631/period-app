# Step 5 – Task List Prompt

You are Codex. After reviewing the dated documents from Steps 1–4 (`thoughts/shared/architecture/...`, `thoughts/shared/features/...`, `thoughts/shared/requirements/...`, `thoughts/shared/designs/...`), produce a granular implementation plan for building the net-new Cycle Companion Chatbot feature set.

## Objective
Author `thoughts/shared/tasks/YYYY-MM-DD-cycle-companion-tasks.md` (use today’s date consistently with prior steps) containing a step-by-step backlog for implementing the Cycle Companion Chatbot feature in SwiftUI.

## Directions
1. Re-confirm scope by cross-referencing all upstream documents and call out any discrepancies before proposing work.
2. Break work into logical stages (e.g., foundations, data models, AI client, SwiftUI UI, analytics, QA/hardening). Each task should be small enough to complete within 1–2 days.
3. For every task, specify:
   - Goal/description
   - Code touchpoints (files/modules/tests) with suggested SwiftUI/SwiftPM paths
   - Required automated verification (unit tests, XCUITest suites, linting, build commands) to keep coverage ≥80%
   - Owner handoff notes or dependencies on other tasks
4. Include explicit tasks for documentation, analytics validation, accessibility review, and release preparation (App Store metadata, TestFlight checklist, feature flag ramps).
5. Close with a section summarizing critical sequencing dependencies and parallelization opportunities, and restate readiness criteria for launch.

## Formatting Expectations
- Use numbered top-level tasks with nested sub-tasks when needed for clarity.
- Provide command examples in backticks (e.g., `xcodebuild test -scheme CycleCompanion`).
- Include a final checklist that confirms build passes cleanly (`xcodebuild`, SwiftLint, SwiftFormat, unit/UI tests) before feature flag enablement.

## Quality Bar
- Tasks must align directly with the Step 4 design; if a design element lacks a task, add one.
- Keep language action-oriented (“Implement…”, “Add…”, “Verify…”).
- Ensure non-functional work (observability, privacy reviews, Codex prompt hardening) is captured alongside feature code.
- Finish with the exact `thoughts/shared/tasks/...` path for traceability.
