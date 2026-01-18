# Friend Sync Compatibility & Recommendations

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

PLANS.md is not present in this repository. This plan follows the ExecPlan requirements provided in the task prompt and must be maintained accordingly.

## Purpose / Big Picture

After this change, a signed-in user can tap a friend in the Feed or the Friends list and open the Friend Sync screen to see a compatibility score derived from both users' cycle snapshots, plus actionable recommendations. The score and timeline are calculated from real cycle data (phase alignment, recent flow timing, overlap) and fall back to a preview mode when real data is missing so the UI remains demoable. Recommendations are fetched from a precomputed Supabase table that is refreshed on a cadence (for example, every three days) by an Edge Function that calls OpenAI; the UI uses a deterministic fallback when recommendations are unavailable.

## Progress

- [x] (2026-01-10 21:45Z) Create initial ExecPlan document.
- [x] (2026-01-10 21:57Z) Add local compatibility scoring utilities and wire them into Friend Sync data loading with preview mode and fallback recommendations.
- [x] (2026-01-10 21:57Z) Update Feed cards to open Friend Sync for a selected friend and refresh Friend Sync UI layout.
- [x] (2026-01-10 22:08Z) Add Home feed “View Sync” action on posts from other users.
- [x] (2026-01-10 21:57Z) Add Supabase schema for friend recommendations and client fetch helpers.
- [x] (2026-01-10 21:57Z) Add Edge Function to precompute recommendations with OpenAI and document secret handling + scheduling.
- [x] (2026-01-10 22:06Z) Validate preview-mode behavior in simulator and capture evidence.
- [ ] (2026-01-10 22:06Z) Configure nightly scheduling for `friend-recommendations` (Supabase dashboard/cron not available in CLI).
- [x] (2026-01-10 22:15Z) Switch Home/Feed navigation to tap friend identity (avatar/name) instead of extra buttons and refresh Friend Sync visual styling.
- [x] (2026-01-11 23:38Z) Apply HIG review updates: system palette, score pill + legend, cycle overlap timelines with overlap legend, and updated header typography; validated in simulator.
- [x] (2026-01-11 23:45Z) Cleaned Friend Sync header/preview labels, simplified match highlights, and adjusted recommendation bullet alignment + overlap visuals.
- [x] (2026-01-11 23:51Z) Gate preview mode behind __DEV__ route flag, add explicit "Select a Friend" empty state, and verify preview still renders in simulator.

## Surprises & Discoveries

- Observation: Supabase CLI 2.67.1 does not expose a scheduler command for Edge Functions.
  Evidence: `supabase functions --help` shows only delete/deploy/download/list/new/serve.

## Decision Log

- Decision: Weight the compatibility score as 45% phase alignment, 35% recent flow timing, and 20% 28-day overlap, then clamp to 0–100.
  Rationale: The snapshot model exposes phase and recent flow timing reliably; overlap provides a smaller stabilizing signal.
  Date/Author: 2026-01-10 21:57Z / Codex
- Decision: Refresh recommendations every 3 days when scheduled.
  Rationale: Nightly recomputation avoids stale guidance while limiting cost and latency.
  Date/Author: 2026-01-10 21:57Z / Codex
- Decision: Use preview mode with seeded snapshots when no friend is selected.
  Rationale: The simulator account has no friends, so a demoable UI is required without compromising real data paths.
  Date/Author: 2026-01-10 21:57Z / Codex
- Decision: Use the friend avatar/name as the primary navigation affordance instead of adding a dedicated “View Sync” button in Home/Feed.
  Rationale: Reduces visual clutter and aligns with iOS conventions of tapping identity elements.
  Date/Author: 2026-01-10 22:15Z / Codex
- Decision: Restyle the Friend Sync surface to a neutral iOS palette with animated score fill.
  Rationale: Matches the requested Apple-like UX and makes the score feel responsive to loading.
  Date/Author: 2026-01-10 22:15Z / Codex
- Decision: Animate the score number and color-code the score/timeline based on alignment.
  Rationale: Improves clarity and makes the compatibility signal feel alive while conveying meaning at a glance.
  Date/Author: 2026-01-11 22:51Z / Codex
- Decision: Use tappable identity elements for navigation and a chevron-style back button to align with iOS affordances.
  Rationale: Reduces clutter and conforms to HIG navigation expectations.
  Date/Author: 2026-01-11 22:51Z / Codex
- Decision: Replace the generic overlap list with a cycle-over-cycle overlap view and phase icons.
  Rationale: Provides a more narrative timeline and makes phases legible with iconography, per HIG emphasis on clarity.
  Date/Author: 2026-01-11 23:09Z / Codex
- Decision: Render cycle overlap as dual-row timeline bars with an explicit overlap legend and date ranges.
  Rationale: Makes the overlap relationship visible at a glance without relying solely on color or numeric labels.
  Date/Author: 2026-01-11 23:38Z / Codex
- Decision: Use iOS system palette values and adjust header typography to mirror standard navigation affordances.
  Rationale: Improves HIG alignment and visual harmony with the rest of the platform.
  Date/Author: 2026-01-11 23:38Z / Codex
- Decision: Remove the page title/preview labels in Friend Sync and keep context inside the content cards.
  Rationale: Reduces redundant chrome and keeps focus on the compatibility insights.
  Date/Author: 2026-01-11 23:45Z / Codex
- Decision: Require an explicit __DEV__ preview flag to enter preview mode.
  Rationale: Keeps demo-only content out of production while preserving a reliable simulator flow.
  Date/Author: 2026-01-11 23:51Z / Codex

## Outcomes & Retrospective

Not started.

## Context and Orientation

The Friend Sync screen lives at `app/features/friends/screens/FriendSyncScreen.tsx` and currently displays a mostly hard-coded score, timeline, and recommendation chips. Feed items are rendered in `app/features/feed/screens/FeedScreen.tsx`, and the friend list with “View Sync” actions is in `app/features/profile/screens/ProfileScreen.tsx`. The app is a React Native + Expo client that uses Supabase; its shared cycle data lives in the `cycle_snapshots` table (see `supabase/migrations/20251229215000_cycle-companion-core.sql`). Each snapshot is stored as JSON and typed in the app by `CycleSnapshot` from `packages/domain/cycles/models.ts`, which includes `currentPhase`, `latestSampleStart`, and a list of flow samples. Supabase Edge Functions live in `supabase/functions`, with `notifications-handler` as a reference implementation.

The goal is to compute a match score using locally available cycle snapshot data, then fetch LLM-generated recommendations from a new Supabase table. When data is missing (no friend snapshots, no mutual sharing, no recommendations), the UI should show a clear “preview” or fallback state that still renders a cohesive screen.

## Plan of Work

First, add a new compatibility scoring helper in `app/features/friends/utils/syncScore.ts` that accepts two `CycleSnapshot` objects and returns a structured score. The algorithm should be simple and explainable: it should compute a phase alignment score (distance between current phases), a flow timing score (difference in recent flow start dates), and a recent overlap ratio (shared flow days in a 28-day window). Combine these into a 0–100 score and expose the intermediate metrics so the UI can render a timeline and highlight rows. Also include a deterministic fallback recommendation list based on the phases when the LLM results are missing.

Next, update `FriendSyncScreen` to load the current user’s snapshot and the friend snapshot, compute the score using the helper, and render a richer UI: a score card, a short “match highlights” list, and a recommendations section that uses fetched recommendations when present. When there is no friendId or when snapshots are missing, switch to a “Preview mode” that uses seeded sample data and labels it clearly.

Then, update `FeedScreen` and `HomeScreen` so tapping a friend’s identity (avatar or name) navigates to the Friend Sync screen with the tapped friend’s ID, keeping the interface minimal and reducing extra buttons.

After the client changes, add a Supabase migration to create a `friend_recommendations` table with columns for `user_id`, `friend_id`, `recommendations` (JSON array of strings), `score`, and `generated_at`. Add RLS policies that allow authenticated users to read rows where `user_id = auth.uid()` and only allow service-role inserts/updates. Implement a new client helper `app/services/supabase/friendRecommendations.ts` that fetches the latest recommendations for a friend.

Finally, create a new Edge Function at `supabase/functions/friend-recommendations/index.ts` that uses the service role key to fetch mutual friend pairs, compute the same compatibility summary server-side, call OpenAI to generate 3–5 recommendations, and upsert the results into `friend_recommendations`. The function should skip pairs that were generated recently (for example, within the last 3 days). Document in the plan how to set `OPENAI_API_KEY` in Supabase secrets and how to schedule the function nightly. Do not hardcode the key in the repository.

## Concrete Steps

1. Create `app/features/friends/utils/syncScore.ts` and implement:
   - `computeSyncScore({ selfSnapshot, friendSnapshot, now }: { selfSnapshot: CycleSnapshot; friendSnapshot: CycleSnapshot; now?: Date })` returning `{ score, confidence, metrics, timelineItems, highlights }`.
   - `fallbackRecommendations({ selfPhase, friendPhase, score }): string[]` for deterministic local recommendations.
2. Update `app/features/friends/screens/FriendSyncScreen.tsx` to:
   - fetch both snapshots via `fetchCycleSnapshotByUserId` (new helper in `app/services/supabase/cycleSnapshots.ts`),
   - load friend profile name from `fetchFriendProfiles`,
   - compute score via `computeSyncScore`,
   - fetch recommendations via `fetchFriendRecommendations` and merge with fallback,
   - render a preview mode when `friendId` is missing and a consent-gated empty state when sharing is not mutual.
3. Update `app/features/feed/screens/FeedScreen.tsx` and `app/features/home/screens/HomeScreen.tsx` so the friend name/avatar is the tappable affordance for `navigation.navigate('FriendSync', { friendId })`.
4. Add `app/services/supabase/friendRecommendations.ts` to fetch recommendations from Supabase.
5. Add a migration file (new timestamped filename) in `supabase/migrations` that creates `friend_recommendations` and the associated policies.
6. Add `supabase/functions/friend-recommendations/index.ts` implementing OpenAI recommendation generation and upsert logic, with a guard for missing `OPENAI_API_KEY`.
7. Validate in the simulator by navigating to Feed or Profile, tapping “View Sync,” and verifying the score + recommendations render. If Supabase is not configured, verify the preview state still renders with mock data.

Commands (from repo root):

  - List relevant files: `rg -n "FriendSync" app`.
  - Run TypeScript checks if used by the project: `npm run lint` (if available).
  - Start the app for manual verification: `npm run ios` (or `npm run start` and open the simulator).

## Validation and Acceptance

A tester should be able to:

- Open the app, go to the Feed tab, and tap “View Sync” on a feed card. The Friend Sync screen should open and show the friend’s name, a computed score, and the highlights timeline without hard-coded values.
- Navigate to Profile > Friends and tap “View Sync”; the same screen should load with the selected friend.
- If no recommendations exist in Supabase, the screen should render fallback recommendations; once recommendations exist in `friend_recommendations`, the LLM suggestions should appear instead.
- When no friend is selected (or no data is available), the screen should show a clearly labeled preview state rather than a blank screen.

## Idempotence and Recovery

All steps are additive and safe to re-run. The migration uses `create table if not exists` and `create policy` statements so it can be applied multiple times. The Edge Function skips work when `OPENAI_API_KEY` is missing and does not delete data. If a step fails, re-run the failed command after fixing the error; no destructive operations are required.

## Artifacts and Notes

Expected Friend Sync UI elements after the change include:

  - A score card showing a percent and short label.
  - A highlights list with phase alignment, flow timing gap, and overlap days.
  - A recommendations section that either uses LLM output or shows a fallback list.

Example placeholder output from the Edge Function (shortened):

  - Inserted 6 recommendation rows, skipped 2 (fresh).

Validation screenshot:

  - Preview Friend Sync renders with score, highlights, timeline, and fallback recommendations (captured via simulator UI view on 2026-01-10).
  - Home feed navigation now relies on tapping the friend identity (avatar/name); re-capture after verifying the updated affordance.
  - Friend Sync preview shows the full-width compatibility hero and recommendation list after the Apple-style restyle (captured via simulator UI view on 2026-01-11).
  - Friend Sync preview shows animated score, phase chips, and color-coded score/timeline after HIG refinements (captured via simulator UI view on 2026-01-11).
  - Friend Sync preview shows phase icons and cycle-over-cycle overlap entries (captured via simulator UI view on 2026-01-11).
  - Friend Sync preview shows timeline bars with overlap highlight and refreshed system palette (captured via simulator UI view on 2026-01-11).

## Interfaces and Dependencies

- `app/features/friends/utils/syncScore.ts` must export:

  - `computeSyncScore(args: { selfSnapshot: CycleSnapshot; friendSnapshot: CycleSnapshot; now?: Date }): {
      score: number;
      confidence: 'low' | 'medium' | 'high';
      metrics: {
        phaseAlignment: number;
        flowTiming: number;
        overlapRatio: number;
        daysApart: number | null;
        overlapDays: number;
      };
      highlights: { label: string; value: string; detail?: string; kind?: 'phase' | 'timing' | 'overlap'; icon?: string; tone?: { color: string; background: string } }[];
      timelineItems: { label: string; date: string }[];
      cycleTrend: { label: string; selfStart: string; selfEnd: string; friendStart: string; friendEnd: string; daysApart: number | null; overlapDays: number; trend: 'closer' | 'further' | 'steady' | 'unknown' }[];
    }`.

- `app/services/supabase/friendRecommendations.ts` must export:

  - `fetchFriendRecommendations(friendId: string): Promise<{ recommendations: string[]; generated_at: string; score?: number } | null>`.

- `app/services/supabase/cycleSnapshots.ts` must export:

  - `fetchCycleSnapshotByUserId(userId: string): Promise<CycleSnapshotRow | null>`.

- `supabase/functions/friend-recommendations/index.ts` must define a `Deno.serve` handler that:

  - Reads `OPENAI_API_KEY`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` from environment variables.
  - Computes mutual friend pairs from `friend_sharing` where both `has_shared = true`.
  - Upserts rows into `friend_recommendations` keyed by `(user_id, friend_id)`.

- `supabase/migrations/<timestamp>_friend-recommendations.sql` must define:

  - Table `friend_recommendations` with columns: `user_id uuid`, `friend_id uuid`, `recommendations jsonb`, `score integer`, `generated_at timestamptz`.
  - RLS policies: select for `auth.uid() = user_id`, insert/update only for service role.

Change Log: 2026-01-10 21:45Z - Initial plan drafted.
Change Log: 2026-01-10 21:57Z - Updated progress, decision log, and concrete steps to reflect implemented scoring, preview mode, and recommendation pipeline.
Change Log: 2026-01-10 22:00Z - Added cycle snapshot helper to Interfaces section to match implemented API.
Change Log: 2026-01-10 22:06Z - Documented simulator validation and scheduling gap in progress and discoveries.
Change Log: 2026-01-10 22:08Z - Added Home screen Friend Sync navigation in progress and plan steps.
Change Log: 2026-01-10 22:09Z - Documented Home feed validation screenshot in artifacts.
Change Log: 2026-01-10 22:15Z - Updated navigation affordances and Friend Sync visual styling for Apple-like UX.
Change Log: 2026-01-11 22:42Z - Captured validation notes for the restyled Friend Sync preview.
Change Log: 2026-01-11 22:51Z - Added animated score number, score color cues, and HIG-aligned back button.
Change Log: 2026-01-11 22:55Z - Captured validation notes for animated score + phase chips in Friend Sync preview.
Change Log: 2026-01-11 23:09Z - Added cycle-over-cycle overlap visualization and phase iconography to Friend Sync.
Change Log: 2026-01-11 23:38Z - Applied HIG review refinements, including system palette, overlap legend, and timeline bar visuals.
Change Log: 2026-01-11 23:45Z - Simplified Friend Sync header/preview labels and match highlight subtext, adjusted bullet alignment, and removed overlap legend.
Change Log: 2026-01-11 23:51Z - Gated preview mode behind __DEV__ flag with a dedicated empty state for no selection.
