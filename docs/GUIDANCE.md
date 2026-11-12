# Phase Guide

The You page offers three dos and three don'ts as optional ideas. A phase is an estimate, not a prediction of someone's mood, energy, ability or symptoms. The copy should help someone choose what suits them today.

## Content

- Give each tip a short title and one practical detail, stored as `Title: Detail` so existing clients can still read the string arrays.
- Dos offer something to try. Don'ts name a pressure or habit to ease and offer a kind alternative. Avoid guilt, food rules, performance expectations and promises of hormone optimization.
- Menstruation: optional warmth, comfortable movement and a practical comfort plan.
- Follicular and ovulation: enjoyable movement, manageable plans and connecting with friends, without assuming an energy peak.
- Luteal and PMS: sleep, regular balanced meals, noticing personal patterns and asking for support, without assuming symptoms or a drop in capability.
- With no phase available, offer general check-ins and flexible plans.
- Do not diagnose or recommend medication, supplements, fertility decisions or restrictive diets/exercise. Do not normalize pain or symptoms that disrupt daily life.

The local tips are editorial suggestions, not individually personalized health advice. The AI receives only the estimated phase and up to three accepted friends' IDs, display names and matching phases; no raw HealthKit samples, personal symptoms or emails are included. It follows the same content rules. The interface describes AI output as ideas for an estimated phase rather than claiming medical personalization.

## Sources and limits

Reviewed 2026-11-03:

- [NHS: Period pain](https://www.nhs.uk/symptoms/period-pain/) supports optional heat and gentle movement and seeking help when pain interferes with daily activities.
- [NHS: PMS](https://www.nhs.uk/conditions/pre-menstrual-syndrome/) supports regular exercise, balanced meals, sleep, stress reduction and recording symptoms across cycles. Symptoms vary between people and months.

The social/planning ideas are product suggestions. These sources do not establish a phase-based productivity or workout schedule. AI output is generated, not individually reviewed or guaranteed to follow this editorial guidance.

## Presentation and rollout

Advice is visible on full-width cards with short headings, readable detail and no line limit. Green plus and terracotta minus marks distinguish dos and don'ts without relying only on color. There is no flip interaction or hidden advice. Older single-sentence cached tips are shown once, without repeating a made-up heading.

The native implementation lives in `app/features/profile/components/PhaseGuide.tsx`; fallback content and string parsing live in `packages/domain/cycles/guidance.ts`. Deployment and device verification steps are in [TROUBLESHOOTING.md](TROUBLESHOOTING.md#on-demand-cycle-guidance-backend-deployed-2026-11-03-device-verification-pending).


## Explicit refresh (backend deployed 2026-11-11; native rollout pending)

Normal page opens continue to reuse valid advice. **Refresh tips** requests new AI suggestions even when a current cache exists. It does not delete or blank the old tips: a failed, unavailable or rate-limited request leaves the guide useful. A two-minute account-scoped cooldown applies after successful generation and failed/in-flight claims. The button disables while loading or when signed out/no phase is known; feedback explains loading, failure, cooldown or a request already being prepared.

The presenter (`PhaseGuide.tsx`) receives only tip arrays, context and the optional `onRefresh`, `refreshing`, `refreshDisabled` and `message` props. It does no fetching. `usePhaseGuidance` owns focus/account/phase lifetime, double-tap protection and result/message state; the service coalesces explicit requests and the server remains the authority for leases/cooldown. A response after leaving the page or changing account/phase cannot replace current advice. The fallback and editorial policy above are unchanged.

The additive `claim_cycle_guidance_refresh(text,text)` RPC bypasses a valid cache but checks the current server snapshot, shares `cycle_guidance_requests` with normal generation and rate-limits by saved `generated_at`. Existing claim/complete RPC signatures remain unchanged. The edge handler accepts an optional boolean `refresh`; clients without it retain the old behavior. `refreshLimited` explains a denied explicit claim without spending on AI.

**Scheduling (verified 2026-11-12):** PR #83 removed `nightly-cycle-guidance` through Database deploy run 43274996960 after owner-confirmed 1.0.15 adoption and refresh success. Both projects now have no nightly guidance job and retain the active daily notification job. Saved advice, tables, functions and RPCs remain. New clients generate on demand; <=1.0.12 cannot generate replacements and should update for fresh advice.

**Delivery:** [Database deploy run 43154655774](https://github.com/kratijain2631/period-app/actions/runs/43154655774) applied `20261111210000_manual-guidance-refresh.sql` to staging, passed all 75 staging access checks, then applied it to production on 2026-11-11. The updated handler was deployed to staging, authenticated API checks passed using an isolated synthetic account (deleted afterward), then the handler was deployed to production (ACTIVE, version 3). Staging checks covered cache reads, refresh claim/save, duplicate suppression, HTTP cooldown and authorization; no AI call or existing persona reset occurred. The button is included in built/uploaded 1.0.15 (36); tester availability, VoiceOver/Dynamic Type, HealthKit and real-phone lifecycle checks remain pending. See [TROUBLESHOOTING.md](TROUBLESHOOTING.md#manual-phase-guide-refresh-2026-11-11--backend-deployed-native-rollout-pending).

**Refresh release status (rechecked 2026-11-12):** 1.0.15 (36) from `v1.0.15-build36` / `b3b3b493` has a finished EAS build and successful Apple upload. Owner confirms important users updated, Refresh tips success and in-session offline retention. Remaining native checks and offline cold-start retest are in TODO; the alias fix is built/uploaded as 1.0.16 (37); physical cold-start retest remains pending.

## Testing the released client

Install 1.0.15 (36) from TestFlight if it is visible to your tester account, sign in and open You. Built-in tips should appear immediately; with a known synced phase, valid saved advice is reused or missing advice is generated on demand. Tap Refresh tips to request replacements. Current tips stay visible during the request. Success shows “Tips refreshed.”; rapid repeats show a two-minute cooldown; failure keeps the current tips and shows retry feedback. Unknown phase disables AI refresh until cycle sync supplies a phase.

Phone checks still required: successful AI replacement, offline retention, account/phase changes, HealthKit sync, VoiceOver/Dynamic Type and two-device concurrency. Backend deployment and automated checks are complete. The legacy nightly job was retired after owner-confirmed adoption (merged PR #83, 2026-11-12); saved advice remains.

Build 1.0.13 (34) already contained on-demand AI and fallback, but its recorded Apple upload failed over required agreements; it had no Refresh tips button. This is a delivery failure, not evidence of AI malfunction in an installed 1.0.13. If an actual 1.0.13 install fails, capture its visible error separately.

**Owner phone results (2026-11-12, 1.0.15):** Refresh tips succeeds and in-session airplane-mode refresh retains advice with an error. All important users are reported updated. Offline cold start exposed a separate profile/alias bug; its fix and pending delivery are tracked in BUGS/TODO. VoiceOver, phase/account changes and two-device concurrency are still open.

**Follicular activity wording:** low-key options are intentional choices, not a prediction that follicular means low energy. The generator sees an estimated phase, not today’s reported energy. It should offer varied enjoyable options without prescribing intensity; no content change was made in response to the owner’s question. [Office on Women’s Health: physical activity and the menstrual cycle](https://womenshealth.gov/getting-active/physical-activity-menstrual-cycle) describes individual variation.
