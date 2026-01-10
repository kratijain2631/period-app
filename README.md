# Architecture

This document describes the high-level architecture of Cycle Companion. If you want to familiarize yourself with the codebase, you are just in the right place!

**See also:**
- [Single Source of Truth (SSOT)](./overall/2025-11-11-cycle-companion-ssot.md) - Complete requirements, implementation plan, and functional scope
- [Implementation Docs](./implementation-docs/) - Notes on specific implementation tasks
- [Thoughts & Planning](./thoughts/) - Architecture decisions, design docs, feature specs, and handoffs

## Bird's Eye View

On the highest level, Cycle Companion is a thing which reads menstrual cycle data from Apple Health and provides a social layer on top of it.

More specifically, the app accepts:
- **Input**: Apple Health menstrual flow data (read-only via HealthKit), user authentication (Sign in with Apple), and user-generated social content (posts, reactions, boops)
- **State**: All cycle data is cached locally in SQLite. Social data and cycle events are persisted in Supabase. The app maintains session state, permission state, and connection state in memory (with persistence for session).

The app produces:
- **Output**: A social feed showing cycle snapshots, friend updates, notifications, and interactive features (boops, reactions) that help users support each other through their cycles.

The underlying engine makes sure that:
- Cycle data syncs periodically from HealthKit and is cached locally
- Social actions work offline by queueing in SQLite
- Friend data access requires mutual consent enforced by Supabase RLS
- Data freshness is tracked (24-hour TTL) and stale data is clearly marked

**Architecture Invariant**: The app never writes data to Apple Health. All HealthKit operations are read-only. This is enforced by code (using only read APIs) and emphasized in all user-facing copy.

**Architecture Invariant**: Friend data access requires mutual consent. Both users must have `friend_sharing.has_shared = true` for each other. This is enforced by Supabase RLS policies checking both directions.

**Architecture Invariant**: All user actions (boops, reactions, posts) work offline. Actions are queued in SQLite and synced to Supabase when connectivity returns, preserving original timestamps.

## Code Map

This section talks briefly about various important directories and data structures. Pay attention to the Architecture Invariant sections. They often talk about things which are deliberately absent in the source code.

### App Entry Point

**App.tsx**

The root component that initializes the app. It sets up several global lifecycle hooks:
- `useConnectionWatcher()` - Monitors network connectivity state
- `useCycleSyncLifecycle()` - Manages HealthKit sync lifecycle
- `useSupabaseAuth()` - Handles authentication state
- `useProfileGate()` - Ensures user has profile/alias
- `usePushNotifications()` - Registers for push notifications
- `useBoopQueueSync()` - Flushes queued boops when online

**Architecture Invariant**: All global lifecycle hooks are initialized at the root level. Feature-specific hooks should not manage global app state.

### app/features/

Feature-based organization. Each feature lives in `app/features/{feature-name}/` with subdirectories for `screens/`, `components/`, and `hooks/`.

**app/features/auth/**

Authentication screens. Currently just `AuthScreen.tsx` for Sign in with Apple.

**app/features/companion/**

Onboarding flow. `CompanionIntroScreen.tsx` explains the read-only approach and requests HealthKit permissions.

**Architecture Invariant**: HealthKit permissions are only requested after the user has seen the intro screen explaining the read-only promise. The permissions state is persisted in `sessionStore` to avoid repeated prompts.

**app/features/feed/**

Main social feed. `FeedScreen.tsx` displays posts and cycle snapshots. `DailySummaryCard.tsx` shows the current cycle phase, symptoms, and suggested actions.

**app/features/friends/**

Friend sync view. `FriendSyncScreen.tsx` shows overlap timelines and sync scores for a specific friend.

**Architecture Invariant**: Friend sync data is only shown when mutual `friend_sharing.has_shared = true` exists. The UI shows an explanatory empty state when consent is missing.

**app/features/notifications/**

Notification UI. `NotificationsBell.tsx` shows a badge and `NotificationsSheet.tsx` displays the notification list. Notifications are received via Supabase realtime subscriptions.

**app/features/profile/**

User profile screens. `ProfileScreen.tsx` shows user info and friend filters. `AliasScreen.tsx` is shown before the main app if no alias is set.

### app/navigation/

**AppNavigator.tsx**

Main navigation setup using React Navigation. Handles conditional rendering based on:
- Authentication state (`session`)
- Onboarding completion (`hasSeenCompanionIntro`)
- Permission state (`permissions.granted`)
- Profile state (`alias`)

Navigation flow: `Auth` → `Alias` → `CompanionIntro` → `MainTabs` (Home/Feed/Profile)

**Architecture Invariant**: Navigation state is derived entirely from `sessionStore`. There is no separate navigation state stored.

### app/services/

Service layer that interfaces with external systems (HealthKit, Supabase) and manages background tasks.

**app/services/auth/**

**appleAuth.ts** - Sign in with Apple helpers. Exchanges Apple identity tokens with Supabase Auth.

**Architecture Invariant**: All authentication flows go through Supabase Auth. The app never stores Apple identity tokens directly, only Supabase session tokens.

**app/services/healthkit/**

HealthKit integration layer.

**healthkitClient.ts** - Wrapper around `@kingstinct/react-native-healthkit` JS API. Provides typed access to HealthKit samples.

**permissions.ts** - HealthKit permission requests. Only requests read access to `HKCategoryTypeIdentifierMenstrualFlow`.

**syncHealthData.ts** - Main sync logic. Queries HealthKit for menstrual flow samples (90-day lookback, 400 sample limit), normalizes to `CycleSample[]`, derives `CycleSnapshot`, caches in SQLite, and upserts to Supabase. Emits `CYCLE_SNAPSHOT_UPDATED` event on completion.

**backgroundSync.ts** - Registers background fetch tasks for periodic syncing. Tasks are unregistered when session/permissions are revoked.

**useCycleSyncLifecycle.ts** - Hook that manages sync lifecycle. Triggers sync on app start, app foreground, and periodically via background tasks.

**Architecture Invariant**: HealthKit sync only runs when both session and permissions are granted. The sync function itself handles authorization errors and updates permission state if revoked.

**Architecture Invariant**: Cycle sync queries are bounded (90 days, 400 samples) to avoid unbounded memory growth. The app does not attempt to sync the entire HealthKit history.

**Architecture Invariant**: Sync failures to Supabase are non-fatal. Local SQLite cache is always updated even if Supabase upsert fails.

**app/services/supabase/**

Supabase service modules. Each file provides typed access to a specific Supabase table or feature.

**client.ts** - Supabase client setup with AsyncStorage persistence. Handles missing configuration gracefully.

**auth.ts** - Auth helpers, including mapping Supabase sessions to app `Session` type.

**cycleEvents.ts** - Upsert cycle events to `cycle_events` table.

**cycleSnapshots.ts** - Upsert cycle snapshots to `cycle_snapshots` table.

**boops.ts** - Boop CRUD operations. Boops can be attached to cycle events or posts.

**posts.ts** - Post CRUD operations.

**postReactions.ts** - Post reaction (emoji) CRUD.

**friendRequests.ts** - Friend request management (create, accept, decline).

**friendSharing.ts** - Friend sharing consent management. Consent must be mutual.

**notifications.ts** - Notification queries and realtime subscriptions.

**syncScore.ts** - Friend sync score RPC. Currently returns dummy data (V0 requirement).

**users.ts** - User profile queries and search.

**deviceTokens.ts** - Push notification token management.

**useSupabaseAuth.ts** - Hook that subscribes to Supabase auth state changes and updates `sessionStore`.

**useProfileGate.ts** - Hook that ensures user has an alias set before accessing main app.

**Architecture Invariant**: All Supabase queries respect RLS policies. The client uses the user's auth session, so RLS automatically filters results. Service functions should not manually filter by `user_id` unless needed for performance.

**Architecture Invariant**: Supabase operations are typed but not wrapped in Result types. Errors are handled at the call site. This is acceptable because most Supabase errors should bubble up to UI for user feedback.

**Architecture Invariant**: Realtime subscriptions are managed per-hook. Each hook that needs realtime data sets up its own subscription and cleans up on unmount.

**app/services/boops/**

**useBoopQueueSync.ts** - Hook that monitors connection state and flushes queued boops from SQLite to Supabase when online.

**Architecture Invariant**: Boop queue sync preserves original timestamps. When flushing, the queue item's `created_at` is sent to Supabase, not the flush time.

**app/services/notifications/**

**usePushNotifications.ts** - Hook that requests push permission, registers device token with Supabase, and handles incoming push notifications.

**Architecture Invariant**: Push notifications are opt-in. The app does not request permission automatically. Users must explicitly enable notifications.

### app/state/

Global state management using Zustand with AsyncStorage persistence.

**sessionStore.ts** - Main app state store. Tracks:
- `session`: Auth session (userId, tokens)
- `hasSeenCompanionIntro`: Onboarding completion flag
- `permissions`: HealthKit permission state
- `alias`: User display name
- `isHydrating`: Initial load state
- `isProfileHydrating`: Profile fetch state

**Architecture Invariant**: `sessionStore` is the single source of truth for app-level state. Navigation and feature flags derive from this store.

**Architecture Invariant**: Session state is persisted to AsyncStorage. On app launch, `isHydrating` starts as `true` and becomes `false` after stored state is loaded. This prevents flash of wrong screen during hydration.

**connectionStore.ts** - Network connectivity state. Monitors network status via NetInfo and updates state. Used by offline queue sync hooks.

**Architecture Invariant**: Connection state is optimistic. The store starts with `isOnline: true` and updates when NetInfo provides actual state. This avoids blocking UI during initial network check.

### app/storage/sqlite/

Local SQLite storage for offline support and caching.

**cycleSnapshotStore.ts** - Cycle snapshot cache. Stores `CycleSnapshot` JSON with TTL tracking. Provides `isSnapshotStale()` helper (24-hour TTL).

**Architecture Invariant**: Cycle snapshots are stored per-user. The store uses `userId` as part of the primary key (`{userId}-latest`). This allows multi-user scenarios (if needed) without schema changes.

**Architecture Invariant**: Snapshot TTL is checked client-side. Supabase also has timestamps, but the app checks staleness before displaying data to avoid showing outdated cycle info.

**boopQueueStore.ts** - Offline boop queue. Stores boops that failed to send to Supabase. Queue is FIFO, flushed when connection returns.

**Architecture Invariant**: Boop queue is per-user. Queue operations require `userId` to ensure boops aren't sent from wrong account if user switches.

### packages/domain/

Domain models and business logic. These are pure TypeScript with no framework dependencies.

**packages/domain/cycles/models.ts** - Cycle domain models:
- `CycleSample` - Normalized menstrual flow sample
- `CycleSnapshot` - Derived snapshot with phase, latest sample, etc.
- `CyclePhase` - Phase enumeration (unknown, menstruation, follicular, ovulation, luteal, pms)
- `normalizeFlowSample()` - Maps HealthKit samples to domain models
- `deriveSnapshot()` - Creates snapshot from samples

**Architecture Invariant**: Domain models are framework-agnostic. They contain no React, Expo, or Supabase dependencies. This makes them testable and reusable.

**Architecture Invariant**: Phase computation is currently minimal (maps flow values to phases). Future enhancement can add cycle prediction logic here without affecting other layers.

### supabase/

Backend configuration, migrations, and edge functions.

**supabase/migrations/**

Database schema migrations. Applied in order by timestamp.

**20251229215000_cycle-companion-core.sql** - Core schema:
- `cycle_events` - Individual cycle events from HealthKit
- `cycle_snapshots` - Full snapshot JSON
- `notifications` - Friend notifications
- `device_tokens` - Push notification tokens
- `friend_requests` - Friend request state machine
- `friend_sharing` - Mutual consent tracking

All tables have RLS enabled with policies ensuring users can only access their own data or friend data (with mutual consent).

**Architecture Invariant**: RLS policies check mutual consent by verifying `friend_sharing` exists in both directions. The policies explicitly check:
```sql
exists (select 1 from friend_sharing where user_id = target_user and friend_id = current_user and has_shared = true)
and exists (select 1 from friend_sharing where user_id = current_user and friend_id = target_user and has_shared = true)
```

**Architecture Invariant**: Service role operations (like notification inserts from edge functions) bypass RLS using `auth.role() = 'service_role'` checks.

**supabase/functions/notifications-handler/**

Deno edge function triggered by database webhook on `cycle_events` insert. Creates notification records for mutual friends and sends push notifications.

**Architecture Invariant**: Edge function uses service role key to bypass RLS when creating notifications. The function itself validates mutual consent before creating records.

**Architecture Invariant**: Push notifications are best-effort. If Expo Push Notification service fails, the function still succeeds (notifications are created in DB, push is just a bonus).

### overall/

**2025-11-11-cycle-companion-ssot.md** - Single Source of Truth document containing complete requirements, implementation plan, and functional scope. This is the authoritative reference for what the app should do.

### thoughts/

Design and planning documents:
- `shared/architecture/` - Architecture decision records
- `shared/designs/` - UI/UX design documents
- `shared/features/` - Feature specifications
- `shared/handoffs/` - Engineering handoff documents
- `shared/requirements/` - Requirements documents
- `shared/tasks/` - Task breakdowns

### implementation-docs/

Implementation notes for specific tasks. These documents describe how particular features were implemented, including gotchas and design decisions.

## Cross-Cutting Concerns

This section talks about things which are everywhere and nowhere in particular.

### Offline Support

The app is designed to work offline with graceful degradation.

**Cycle Data**: When offline, the app displays the last cached snapshot from SQLite. The UI shows a "stale" banner if data is older than 24 hours.

**Social Actions**: Boops, reactions, and posts are queued in SQLite when offline. The `useBoopQueueSync` hook monitors connection state and flushes the queue when online.

**Architecture Invariant**: All user actions that modify server state should work offline. Actions are first attempted directly to Supabase. On network failure, they're queued in SQLite with original timestamps preserved.

**Architecture Invariant**: Offline queues are per-user. This ensures boops aren't sent from wrong account if user switches.

### Privacy & Consent

Friend data access requires explicit mutual consent.

**Consent Model**: Both users must have `friend_sharing.has_shared = true` for each other. This is enforced by Supabase RLS policies checking both directions.

**UI Behavior**: When consent is missing, friend sync views show explanatory empty states rather than error messages.

**Architecture Invariant**: All friend data queries go through Supabase RLS. The client never manually filters friend data. If RLS allows access, the UI can display it.

**Architecture Invariant**: Consent is opt-in, not opt-out. Users must explicitly accept friend requests before sharing data.

### Data Freshness

Cycle snapshots have a 24-hour TTL to ensure users see current data.

**Staleness Check**: `isSnapshotStale()` in `cycleSnapshotStore.ts` checks if snapshot is older than 24 hours.

**UI Behavior**: `DailySummaryCard` hides when snapshot is stale. The UI shows "Retry sync" button.

**Architecture Invariant**: Staleness is checked client-side before displaying data. Supabase also has timestamps, but client-side check avoids network delay.

**Architecture Invariant**: Sync failures don't clear cached data. If Supabase sync fails but HealthKit query succeeds, local cache is updated. This allows app to work with stale Supabase data.

### HealthKit Read-Only Guarantee

The app never writes to Apple Health.

**Code Enforcement**: Only HealthKit read APIs are used. The `@kingstinct/react-native-healthkit` package is configured with read-only identifiers.

**User Communication**: All permission prompts and feed footers explicitly state the app only reads data.

**Architecture Invariant**: There are no HealthKit write operations in the codebase. If a write operation is added, it should be rejected in code review.

### Testing

The app has unit tests for critical paths and Supabase RLS policies.

**Unit Tests**: Located in `__tests__/` directories. Test Supabase services and SQLite stores.

**RLS Tests**: `supabase/tests/rls-cycle-companion.sql` contains manual RLS policy tests.

**Architecture Invariant**: HealthKit sync requires physical device or configured simulator with Health data. Unit tests mock HealthKit client.

**Architecture Invariant**: Supabase RLS policies must be tested with different user contexts. Tests should verify mutual consent requirements.

### Error Handling

Errors are handled at appropriate boundaries.

**HealthKit Errors**: Authorization errors update permission state in `sessionStore`. Other errors are logged and sync fails gracefully.

**Supabase Errors**: Most errors bubble up to UI for user feedback. Network errors trigger offline queueing.

**Architecture Invariant**: Core domain logic (models, stores) doesn't throw. Errors are returned as part of result types or handled at service boundaries.

**Architecture Invariant**: Offline actions never fail from user perspective. They're queued and retried automatically.

### Background Sync

Cycle data syncs periodically in background and on app foreground.

**Background Tasks**: Registered via `expo-background-fetch`. Triggers `syncHealthData()` periodically.

**Foreground Sync**: App state listener triggers sync when app comes to foreground.

**Architecture Invariant**: Background tasks are unregistered when session/permissions are revoked to avoid unnecessary work.

**Architecture Invariant**: Sync is idempotent. Running multiple times with same HealthKit data produces same Supabase state.

### Navigation & Routing

Navigation state is derived from `sessionStore`.

**Navigation Gates**: `AppNavigator.tsx` conditionally renders screens based on:
- Authentication (`session`)
- Onboarding (`hasSeenCompanionIntro`)
- Permissions (`permissions.granted`)
- Profile (`alias`)

**Architecture Invariant**: Navigation state is not stored separately. It's computed from `sessionStore` on each render. This ensures navigation always reflects app state.

**Architecture Invariant**: Deep linking is handled via `navigationRef`. Push notifications can deep link to specific screens/entries.

### State Management

Global state uses Zustand with AsyncStorage persistence.

**Session Store**: Main app state persisted to AsyncStorage. Migrates between versions using Zustand's migrate function.

**Connection Store**: Network state in memory (not persisted). Resets on app launch.

**Architecture Invariant**: Only app-level state goes in global stores. Feature-specific state should use local React state or feature stores.

**Architecture Invariant**: Store migrations must handle missing fields gracefully. New fields should have defaults.

## Development Setup

See the [SSOT document](./overall/2025-11-11-cycle-companion-ssot.md) section 5 for detailed implementation plan and testing procedures.

### Prerequisites

- Node.js (LTS)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- EAS CLI (`npm install -g eas-cli`)
- Xcode (for iOS development)
- Apple Developer account (for HealthKit entitlements)
- Supabase project

### Environment Variables

```bash
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Running the App

**⚠️ Important**: HealthKit and Sign in with Apple require a custom dev client. Expo Go cannot run these features.

```bash
# Install dependencies
npm install

# Build dev client (one-time)
eas build --profile development --platform ios

# Start Metro bundler
npm run start
# Or: npx expo start --dev-client

# Open dev client app and scan QR code
```

### Supabase Setup

```bash
# Run migrations
supabase db push

# Deploy edge functions
supabase functions deploy notifications-handler
```

Configure database webhook to trigger `notifications-handler` on `cycle_events` insert.

### Building for Release

```bash
# TestFlight build
eas build --profile preview --platform ios

# Production build
eas build --profile production --platform ios
```

Ensure HealthKit capability is enabled for App ID in Apple Developer portal.
