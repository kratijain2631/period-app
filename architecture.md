# Cycle Companion Architecture

**Purpose:** High-level architecture guide for Cycle Companion iOS app to help AI agents and developers navigate the codebase.

---

## Premise

**Cycle Companion** is an iOS social period tracking app (React Native/Expo) that provides a **read-only social interpretation layer** on top of Apple Health menstrual data. Users get daily cycle snapshots, friend notifications, and social features (boops, reactions, posts) while maintaining privacy through read-only HealthKit access and Supabase Row-Level Security.

**Key Constraints:**
- iOS only (requires HealthKit + Sign in with Apple)
- Read-only HealthKit (never writes to Apple Health)
- Offline-first with SQLite cache and queue-based sync
- Feature-based code organization

---

## File Structure & Where to Look

```
app/
├── features/              # Feature-based UI code
│   ├── auth/             # Sign in with Apple
│   ├── companion/        # Onboarding & HealthKit permissions
│   ├── feed/             # Daily summary card & feed screen
│   ├── friends/          # Friend list, sync screen, requests
│   ├── home/             # Home screen
│   ├── notifications/    # Notification bell & sheet
│   └── profile/          # User profile & alias
│
├── navigation/           # AppNavigator.tsx (routing logic)
│
├── services/             # Business logic & integrations
│   ├── auth/             # Apple authentication
│   ├── healthkit/        # HealthKit sync (syncHealthData.ts is core)
│   ├── supabase/         # Backend services (one file per table/feature)
│   ├── notifications/    # Push notifications
│   └── boops/            # Offline queue sync
│
├── state/                # Global state (Zustand stores)
│   ├── sessionStore.ts   # Auth, permissions, onboarding state
│   └── connectionStore.ts # Network connectivity
│
└── storage/              # Local storage
    └── sqlite/           # SQLite stores (cycle snapshots, boop queue)

packages/domain/cycles/    # Domain models (CycleSnapshot, phase estimation)

supabase/
├── migrations/           # Database schema changes
├── functions/            # Edge functions (notifications-handler, etc.)
└── tests/                # RLS policy tests

overall/                  # SSOT: 2025-11-11-cycle-companion-ssot.md
thoughts/shared/          # Design docs, requirements, handoffs
```

### Task-Specific Locations

**Adding a new screen/feature:**
- UI: `app/features/{feature-name}/screens/`
- Components: `app/features/{feature-name}/components/`
- Hooks: `app/features/{feature-name}/hooks/`
- Navigation: Add route in `app/navigation/AppNavigator.tsx`

**Backend/database work:**
- Service: `app/services/supabase/{tableName}.ts`
- Migration: `supabase/migrations/YYYYMMDDHHMMSS_description.sql`
- Edge function: `supabase/functions/{function-name}/index.ts`
- RLS policies: Check existing migrations or `supabase/tests/`

**HealthKit sync:**
- Core logic: `app/services/healthkit/syncHealthData.ts`
- Lifecycle: `app/services/healthkit/useCycleSyncLifecycle.ts`
- Permissions: `app/services/healthkit/permissions.ts`

**State management:**
- Global state: `app/state/{storeName}.ts` (Zustand)
- Feature state: React hooks in feature directories

**Offline/queue:**
- Queue sync: `app/services/boops/useBoopQueueSync.ts`
- SQLite stores: `app/storage/sqlite/`
- Connectivity: `app/state/connectionStore.ts`

**Notifications:**
- Push: `app/services/notifications/usePushNotifications.ts`
- In-app: `app/services/supabase/notifications.ts` + `app/features/notifications/`
- Edge function: `supabase/functions/notifications-handler/`

---

## Architecture Overview

### Layers
1. **Presentation**: Screens/components in `app/features/`
2. **State**: Zustand stores + React hooks
3. **Services**: HealthKit, Supabase, Notifications abstractions
4. **Storage**: SQLite (cache) + AsyncStorage (state persistence)

### Key Patterns
- **Feature-based organization**: Code grouped by feature, not type
- **Service layer**: External integrations abstracted behind service modules
- **Offline-first**: SQLite cache with queue-based sync
- **Type safety**: Full TypeScript (strict mode)

### Data Flow (High-Level)
1. **Auth**: SIWA → Supabase Auth → session stored in Zustand
2. **Sync**: HealthKit → normalize → SQLite + Supabase → UI updates
3. **Feed**: SQLite cache (24h TTL) → React hooks → UI
4. **Notifications**: Supabase edge function → realtime channel → UI
5. **Offline**: Actions queue in SQLite → sync on reconnect

---

## Key Technologies

- **React Native 0.81.5** + **Expo ~54.0.30** (dev client required for HealthKit)
- **TypeScript 5.9.2** (strict mode)
- **Zustand** (state management)
- **Supabase** (backend: auth, database, realtime, edge functions)
- **@kingstinct/react-native-healthkit** (HealthKit bridge)
- **expo-sqlite** (local cache)
- **React Navigation** (routing)

---

## Common Patterns

**Service modules:** Each Supabase table has `app/services/supabase/{tableName}.ts` with CRUD functions

**Hooks:** `use{Feature}` for data, `use{Feature}Sync` for sync operations

**Stores:** Zustand stores export `use{StoreName}` hook and `select{Property}` selectors

**Error handling:** Console logs prefixed with `[feature-name]`, offline actions queue instead of failing

---

## Quick Reference

**Requirements:** Check `overall/2025-11-11-cycle-companion-ssot.md`

**Adding feature:** Review similar feature in `app/features/`, create service if needed, add migration if schema change

**Debugging:** Check `sessionStore`/`connectionStore`, review SQLite cache, check Supabase dashboard, review Metro logs

**Sync issues:** Check `syncHealthData.ts`, `useCycleSyncLifecycle.ts`, TTL in `cycleSnapshotStore.ts`

**Navigation:** Update `AppNavigator.tsx`, use `navigationRef` for programmatic nav

---

**Reference Docs:**
- SSOT: `overall/2025-11-11-cycle-companion-ssot.md`
- Implementation plans: `implementation-docs/`
- Design docs: `thoughts/shared/`
