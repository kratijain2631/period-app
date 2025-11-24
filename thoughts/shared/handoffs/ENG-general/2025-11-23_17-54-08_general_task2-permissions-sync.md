---
date: 2025-11-23T17:54:08.031082-08:00
researcher: Codex
git_commit: 9e0f2f8ed5a4a43d30ce33706cc9e20c8fe27dc0
branch: lfrei/task2
repository: period-app
topic: "Task 2 HealthKit permissions & sync"
tags: [implementation, strategy, healthkit, permissions, sync]
status: complete
last_updated: 2025-11-23
last_updated_by: Codex
type: implementation_strategy
---

# Handoff: ENG-general healthkit-permissions-sync

## Task(s)
- Task 2 from `overall/2025-11-11-cycle-companion-ssot.md` / `implementation-docs/task2-implementation.md`: build Companion intro, HealthKit permissions, sync service, navigation gating, and basic feed. Navigation, intro, permissions, sync lifecycle, and feed wiring are implemented; native deps installed and validated via dev client; SIWA hooked client-side. Remaining gaps: tests (permissions/sync/intro), HealthKit mocks, domain enum helpers, README QA details, privacy copy note.

## Critical References
- overall/2025-11-11-cycle-companion-ssot.md
- implementation-docs/task2-implementation.md
- app/services/healthkit/ (permissions, sync, background)

## Recent changes
- App.tsx: uses AppNavigator with sync lifecycle hook.
- app/navigation/AppNavigator.tsx: stack gating Auth → Intro → Home using session + permissions.
- app/features/auth/screens/AuthScreen.tsx: real SIWA via `expo-apple-authentication`.
- app/features/companion/screens/CompanionIntroScreen.tsx: CTA to request HealthKit, debug HK status, Not now/Learn more/Health settings link.
- app/features/home/screens/HomeScreen.tsx: shows synced samples, refreshed UI labels.
- app/services/healthkit/healthkitClient.ts, permissions.ts, syncHealthData.ts, backgroundSync.ts, useCycleSyncLifecycle.ts: wrapped HK client, permission helpers, sync (90-day window, dedupe, logging), background task registration, snapshot store.
- packages/domain/cycles/models.ts: cycle sample/snapshot models and helpers.
- tsconfig.json: path aliases + packages include; types stub for `expo-apple-authentication`.
- README.md: dev client workflow.

## Learnings
- HealthKit status can report `authorizationStatus=1` even when prompt is accepted; trusting prompt plus query error handling works better. Removing cursor and fetching full window avoids dropped samples across runs.
- Expo Go cannot handle HealthKit/SIWA; must use dev client/TestFlight. Apple Health permissions must be toggled in Health app → Profile → Apps → Cycle Companion → Menstrual Flow.
- SIWA is client-only right now; backend token exchange still needed for real auth/RLS.

## Artifacts
- implementation-docs/task2-implementation.md (updated checklist)
- overall/2025-11-11-cycle-companion-ssot.md
- README.md (dev client run instructions)
- app/services/healthkit/* (permissions, sync, background, HK client)
- app/features/companion/screens/CompanionIntroScreen.tsx
- app/features/home/screens/HomeScreen.tsx
- app/navigation/AppNavigator.tsx
- packages/domain/cycles/models.ts
- types/expo-apple-authentication.d.ts

## Action Items & Next Steps
- Add Jest + RNTL tests for permissions/sync/intro; add HealthKit mock under `app/services/healthkit/__mocks__`.
- Flesh out domain enums/helpers and related tests.
- Document QA steps (Health data entry, background fetch verification) and privacy copy note; update README accordingly.
- Implement backend SIWA token exchange for real sessions/RLS; remove use of `identityToken` as session.
- Decide on cursor vs full-window strategy; currently full 90-day fetch every sync.

## Other Notes
- Build/run via dev client: `eas build --profile development --platform ios`, install .ipa, then `npx expo start --dev-client` (use `--tunnel` if needed). HealthKit requires physical device; simulators may not expose Menstrual Flow. Logged HK status appears on intro screen for debugging. Basic feed now lives on Home. 
