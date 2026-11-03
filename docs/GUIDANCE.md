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
