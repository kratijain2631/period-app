# Step 5 – Task List Prompt

You are Codex. After reviewing the dated documents from Steps 1–4 (`thoughts/shared/architecture/...`, `thoughts/shared/features/...`, `thoughts/shared/requirements/...`, `thoughts/shared/designs/...`) as well as the spec and wireframe in /references, produce a granular implementation plan for building the net-new Cycle Companion feature set in React Native with Apple Health ingestion and Supabase persistence.

## Objective
Author `thoughts/shared/tasks/YYYY-MM-DD-cycle-companion-tasks.md` (use today’s date consistently with prior steps) containing a step-by-step backlog for implementing the Cycle Companion feature in React Native + Supabase.

## Directions
1. Re-confirm scope by cross-referencing all upstream documents and call out any discrepancies before proposing work.
2. Break work into logical stages (e.g., foundations, Apple Health bridge, Supabase data layer, AI client, React Native UI, analytics, QA/hardening).
3. For every task, specify:
   - Goal/description
   - Code touchpoints (files/modules/tests) with suggested React Native/TypeScript paths
   - Owner handoff notes or dependencies on other tasks
4. Include explicit tasks for release preparation (e.g: App Store metadata).
5. Close with a section summarizing critical sequencing dependencies and parallelization opportunities, and restate readiness criteria for launch.

## Formatting Expectations
- Use numbered top-level tasks with nested sub-tasks when needed for clarity.
- Provide command examples in backticks.
- Include a final checklist that confirms build passes cleanly before feature flag enablement.

## Quality Bar
- Tasks must align directly with the Step 4 design; if a design element lacks a task, add one.
- Keep language action-oriented (“Implement…”, “Add…”, “Verify…”).
- Ensure non-functional work (observability, privacy reviews, Apple Health + Supabase compliance) is captured alongside feature code.
- Finish with the exact `thoughts/shared/tasks/...` path for traceability.
