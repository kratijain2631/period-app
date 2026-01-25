# Cycle Companion Architecture

**Last Updated:** 2025-02-05  
**Purpose:** Comprehensive architecture documentation for Cycle Companion iOS app to aid AI coding agents and developers.

---

## 1. Premise & Product Overview

**Cycle Companion** is an iOS social period tracking app built with React Native (Expo). It serves as a **read-only social interpretation layer** on top of Apple Health menstrual tracking data.

### Core Value Proposition
- Users who already log menstrual flow, PMS signals, and symptoms in Apple Health get:
  1. **Daily snapshot** in the feed summarizing current phase, symptoms, and suggested social actions
  2. **Contextual friend notifications** when friends enter PMS/menstruation phases
  3. **Friend Sync** features showing cycle overlap and sync scores (with mutual consent)
  4. **Social interactions**: boops, reactions, posts, and recommendations
- **Privacy-first**: Data is read-only from HealthKit, never written back. All social data is privacy-controlled via Supabase Row-Level Security (RLS).

### Key Constraints
- **iOS only** (V0): Requires HealthKit and Sign in with Apple (SIWA)
- **Read-only HealthKit**: App never writes to Apple Health
- **No new logging inputs**: Users continue using Apple Health for data entry
- **No calendar views**: Focus on feed and social interactions

### User Personas
- **Reflective Tracker**: Needs up-to-date context without re-entering data
- **Social Supporter**: Wants quick cues on friends' states to time boops/reactions
- **New Joiner**: Requires clear onboarding explaining read-only permissions and friend sharing consent

---

## 2. File Structure

```
period-app/
├── app/                          # Main application code
│   ├── features/                 # Feature-based organization
│   │   ├── auth/
│   │   │   └── screens/
│   │   │       └── AuthScreen.tsx
│   │   ├── companion/
│   │   │   └── screens/
│   │   │       └── CompanionIntroScreen.tsx
│   │   ├── feed/
│   │   │   ├── components/
│   │   │   │   └── DailySummaryCard.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useCycleSnapshot.ts
│   │   │   └── screens/
│   │   │       └── FeedScreen.tsx
│   │   ├── friends/
│   │   │   ├── components/
│   │   │   │   └── FriendSyncButton.tsx
│   │   │   ├── screens/
│   │   │   │   ├── FriendsScreen.tsx
│   │   │   │   └── FriendSyncScreen.tsx
│   │   │   └── utils/
│   │   │       └── syncScore.ts
│   │   ├── home/
│   │   │   ├── __tests__/
│   │   │   ├── screens/
│   │   │   │   └── HomeScreen.tsx
│   │   │   └── utils/
│   │   │       └── reactionDoubleTap.ts
│   │   ├── notifications/
│   │   │   ├── components/
│   │   │   │   ├── NotificationsBell.tsx
│   │   │   │   └── NotificationsSheet.tsx
│   │   │   └── hooks/
│   │   │       └── useNotifications.ts
│   │   └── profile/
│   │       └── screens/
│   │           ├── AliasScreen.tsx
│   │           └── ProfileScreen.tsx
│   ├── navigation/
│   │   ├── AppNavigator.tsx      # Main navigation setup
│   │   └── navigationRef.ts      # Navigation ref for deep linking
│   ├── services/                 # Business logic & integrations
│   │   ├── auth/
│   │   │   └── appleAuth.ts      # Sign in with Apple
│   │   ├── boops/
│   │   │   └── useBoopQueueSync.ts
│   │   ├── healthkit/            # HealthKit integration
│   │   │   ├── backgroundSync.ts
│   │   │   ├── healthkitClient.ts
│   │   │   ├── permissions.ts
│   │   │   ├── syncHealthData.ts # Core sync logic
│   │   │   ├── syncStateStore.ts
│   │   │   └── useCycleSyncLifecycle.ts
│   │   ├── notifications/
│   │   │   └── usePushNotifications.ts
│   │   └── supabase/             # Supabase client & services
│   │       ├── __tests__/
│   │       ├── auth.ts
│   │       ├── boops.ts
│   │       ├── client.ts          # Supabase client initialization
│   │       ├── cycleEvents.ts
│   │       ├── cycleGuidance.ts
│   │       ├── cycleSnapshots.ts
│   │       ├── deviceTokens.ts
│   │       ├── eventReactions.ts
│   │       ├── friendRecommendations.ts
│   │       ├── friendRequests.ts
│   │       ├── friendSharing.ts
│   │       ├── notifications.ts
│   │       ├── postReactions.ts
│   │       ├── posts.ts
│   │       ├── rlsSmoke.ts
│   │       ├── syncScore.ts
│   │       ├── useProfileGate.ts
│   │       ├── users.ts
│   │       └── useSupabaseAuth.ts
│   ├── state/                     # Global state management
│   │   ├── connectionStore.ts     # Network connectivity state
│   │   └── sessionStore.ts        # Auth & session state (Zustand)
│   └── storage/                   # Local storage
│       └── sqlite/
│           ├── __tests__/
│           ├── boopQueueStore.ts  # Offline queue for boops
│           └── cycleSnapshotStore.ts
├── packages/                      # Shared domain logic
│   └── domain/
│       └── cycles/
│           └── models.ts          # Cycle types, phase estimation
├── supabase/                      # Backend (Supabase)
│   ├── functions/                 # Edge functions
│   │   ├── cycle-guidance/
│   │   ├── friend-recommendations/
│   │   └── notifications-handler/
│   ├── migrations/                # Database migrations
│   │   ├── 20251229213000_create-users.sql
│   │   ├── 20251229215000_cycle-companion-core.sql
│   │   ├── 20251230010000_boops.sql
│   │   └── ... (14 total migrations)
│   └── tests/
│       └── rls-cycle-companion.sql
├── thoughts/                      # Design docs & info dumps
│   └── shared/
│       ├── architecture/
│       ├── designs/
│       ├── features/
│       ├── handoffs/
│       ├── requirements/
│       └── tasks/
├── overall/                       # Single Source of Truth
│   └── 2025-11-11-cycle-companion-ssot.md
├── implementation-docs/            # Implementation plans
├── prompts/                       # AI prompt templates
├── reference/                     # Specs & wireframes
├── App.tsx                        # Root component
├── app.json                       # Expo configuration
├── package.json                   # Dependencies
└── tsconfig.json                  # TypeScript config
```

---

## 3. Overall Architecture

### 3.1 Architecture Layers

The app follows a **layered architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────┐
│         Presentation Layer (UI)                 │
│  Screens, Components, Navigation               │
├─────────────────────────────────────────────────┤
│         State Management Layer                  │
│  Zustand stores, React hooks, React Query       │
├─────────────────────────────────────────────────┤
│         Domain/Models Layer                     │
│  TypeScript types, business logic helpers       │
├─────────────────────────────────────────────────┤
│         Services Layer                          │
│  HealthKit, Supabase, Notifications, Auth       │
├─────────────────────────────────────────────────┤
│         Storage Layer                           │
│  SQLite (local cache), AsyncStorage (state)     │
└─────────────────────────────────────────────────┘
```

### 3.2 Key Architectural Patterns

1. **Feature-based organization**: Code organized by feature (`auth`, `feed`, `friends`, etc.)
2. **Service layer abstraction**: All external integrations (HealthKit, Supabase) abstracted behind service modules
3. **Offline-first**: Local SQLite cache with queue-based sync for offline actions
4. **State management**: Zustand for global state, React hooks for feature-level state
5. **Type safety**: Full TypeScript with strict mode enabled

### 3.3 Data Flow

#### Authentication Flow
1. User signs in with Apple (SIWA) via `appleAuth.ts`
2. Identity token exchanged with Supabase Auth → access/refresh tokens
3. Session stored in `sessionStore` (Zustand + AsyncStorage persistence)
4. `useSupabaseAuth` hook manages session lifecycle and rehydration

#### HealthKit Sync Flow
1. User grants HealthKit permissions (read-only for `HKCategoryTypeIdentifierMenstrualFlow`)
2. `syncHealthData.ts` queries HealthKit samples (90-day lookback, 400 limit)
3. Samples normalized to `CycleSample[]` via `normalizeFlowSamples()`
4. Phase estimated via `estimateCyclePhase()` (28-day cycle model)
5. `CycleSnapshot` derived and stored:
   - **Local**: SQLite `cycle_snapshots` table (via `cycleSnapshotStore.ts`)
   - **Remote**: Supabase `cycle_snapshots` and `cycle_events` tables
6. `CYCLE_SNAPSHOT_UPDATED` event emitted for UI invalidation
7. Phase transitions trigger `phase_transition` events in `cycle_events`

#### Feed Consumption Flow
1. `useCycleSnapshot` hook reads from SQLite cache
2. Checks TTL (24-hour staleness threshold)
3. Merges with React Query cache if available
4. `DailySummaryCard` displays phase, symptoms, CTAs
5. Stale data shows "Retry sync" banner

#### Notifications Flow
1. Supabase edge function `notifications-handler` watches `cycle_events` inserts
2. On friend phase transition (PMS/menstruation), creates `notifications` row
3. If device token exists, sends push notification
4. Client `useNotifications` hook subscribes to Supabase realtime channel
5. `NotificationsBell` badges and opens sheet with friend events
6. Tapping notification deep-links to feed entry with prefilled boop metadata

#### Friend Sync Flow
1. Mutual `friend_sharing.has_shared=true` consent required
2. `FriendSyncScreen` fetches user snapshot + friend snapshot
3. Supabase RPC `sync-score` calculates overlap timeline + dummy score
4. UI displays timeline, score, and recommendation chips
5. Without consent, shows explanatory empty state

#### Offline Queue Flow
1. User actions (boops, reactions) written to SQLite `boop_queue` table
2. `useBoopQueueSync` hook watches connectivity via `connectionStore`
3. On reconnect, queue flushes to Supabase preserving timestamps
4. UI shows "queued" feedback while offline

---

## 4. Key Technologies & Dependencies

### Core Framework
- **React Native**: 0.81.5
- **Expo**: ~54.0.30 (managed workflow with dev client)
- **TypeScript**: 5.9.2 (strict mode)

### Navigation
- **@react-navigation/native**: ^7.0.0-rc.21
- **@react-navigation/native-stack**: ^7.0.0-rc.30
- **@react-navigation/bottom-tabs**: ^7.9.0

### State Management
- **zustand**: ^4.4.7 (global state)
- **@react-native-async-storage/async-storage**: 2.2.0 (persistence)

### Backend & Data
- **@supabase/supabase-js**: ^2.56.1 (backend, auth, realtime)
- **expo-sqlite**: ~16.0.10 (local cache)
- **postgres**: ^3.4.7 (migration tooling)

### HealthKit Integration
- **@kingstinct/react-native-healthkit**: 10 (HealthKit bridge)

### Notifications
- **expo-notifications**: ~0.32.15 (push notifications)
- **expo-background-fetch**: ~14.0.7 (background sync)
- **expo-task-manager**: ~14.0.8

### Networking
- **@react-native-community/netinfo**: 11.4.1 (connectivity detection)

### Authentication
- **expo-apple-authentication**: ~8.0.8 (Sign in with Apple)

### Testing
- **jest**: ^29.7.0
- **jest-expo**: ~54.0.2

---

## 5. Data Models

### Domain Models (`packages/domain/cycles/models.ts`)

```typescript
// Core cycle types
type CyclePhase = 'unknown' | 'menstruation' | 'follicular' | 'ovulation' | 'luteal' | 'pms';

type CycleSample = {
  id: string;
  flowValue: CategoryValueMenstrualFlow;
  startDate: string;
  endDate: string;
  metadata?: Record<string, unknown>;
};

type CycleSnapshot = {
  syncedAt: string;
  samples: CycleSample[];
  currentPhase: CyclePhase;
  latestSampleStart?: string;
};
```

**Phase Estimation Logic:**
- 28-day cycle model with fixed phase windows:
  - Menstruation: Days 1-5
  - Follicular: Days 6-12
  - Ovulation: Days 13-15
  - Luteal: Days 16-23
  - PMS: Days 24-28
- Calculates days since last menstrual flow start, then maps to cycle day

### Session State (`app/state/sessionStore.ts`)

```typescript
type Session = {
  userId: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
};

type HealthPermissionsState = {
  granted: boolean;
  lastPromptedAt?: string;
};

type SessionState = {
  session: Session | null;
  hasSeenCompanionIntro: boolean;
  permissions: HealthPermissionsState;
  isHydrating: boolean;
  alias: string | null;
  isProfileHydrating: boolean;
  // ... actions
};
```

**Persistence:** Zustand with AsyncStorage (versioned migrations)

### Connection State (`app/state/connectionStore.ts`)

```typescript
type ConnectionState = {
  isOnline: boolean;
  isInternetReachable: boolean | null;
  lastChangedAt?: string;
};
```

---

## 6. Services & Integration Points

### 6.1 HealthKit Service (`app/services/healthkit/`)

**Key Files:**
- `healthkitClient.ts`: Wrapper around `@kingstinct/react-native-healthkit`
- `permissions.ts`: Permission request logic
- `syncHealthData.ts`: Core sync orchestration
- `useCycleSyncLifecycle.ts`: React hook managing sync lifecycle

**Sync Behavior:**
- Triggers: manual, foreground (app open), background (via `expo-background-fetch`)
- Lookback: 90 days
- Query limit: 400 samples
- De-duplication: By sample ID
- Phase change detection: Compares previous snapshot phase

**Event Emission:**
- `CYCLE_SNAPSHOT_UPDATED` event via `DeviceEventEmitter` for UI updates

### 6.2 Supabase Service (`app/services/supabase/`)

**Client Setup (`client.ts`):**
- Uses `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- AsyncStorage for auth persistence
- Auto-refresh tokens enabled

**Key Service Modules:**
- `auth.ts`: Sign in with Apple token exchange
- `cycleEvents.ts`: Upsert cycle events and snapshots
- `cycleSnapshots.ts`: Read friend snapshots (with RLS)
- `notifications.ts`: Realtime subscription for notifications
- `friendRequests.ts`: Friend request CRUD
- `friendSharing.ts`: Consent management
- `boops.ts`: Boop creation and retrieval
- `posts.ts`: Post creation and feed queries
- `syncScore.ts`: Friend sync score RPC call

**RLS (Row-Level Security):**
- Users can only read their own data
- Friend data requires mutual `friend_sharing.has_shared=true`
- All queries respect RLS policies

### 6.3 Notification Service (`app/services/notifications/`)

**Push Notifications:**
- `usePushNotifications.ts`: Registers device token, handles deep linking
- Token stored in Supabase `device_tokens` table
- Deep links route to feed entries with prefilled metadata

**In-App Notifications:**
- `useNotifications.ts`: Subscribes to Supabase realtime `notifications` channel
- Badge count managed in `NotificationsBell` component

### 6.4 Offline Queue Service (`app/services/boops/`)

**Boop Queue:**
- `useBoopQueueSync.ts`: Watches connectivity, flushes queue on reconnect
- SQLite `boop_queue` table stores pending actions
- Preserves original timestamps on sync

---

## 7. Storage & Offline Support

### 7.1 SQLite Storage (`app/storage/sqlite/`)

**Cycle Snapshots (`cycleSnapshotStore.ts`):**
- Table: `cycle_snapshots`
- Schema: `id`, `user_id`, `snapshot_json`, `last_synced_at`, `created_at`, `updated_at`
- TTL: 24 hours (stale threshold)
- Operations: `upsertCycleSnapshot`, `getLatestCycleSnapshot`, `clearCycleSnapshots`

**Boop Queue (`boopQueueStore.ts`):**
- Stores pending boops/reactions while offline
- Flushed to Supabase on reconnect

### 7.2 AsyncStorage (`app/state/`)

**Session Persistence:**
- Zustand persist middleware uses AsyncStorage
- Stores: `session`, `hasSeenCompanionIntro`, `permissions`, `alias`
- Versioned migrations for schema changes

### 7.3 Offline Behavior

**Connectivity Detection:**
- `connectionStore` uses NetInfo to track online/offline state
- `useConnectionWatcher` hook updates store on connectivity changes

**Offline UX:**
- Feed shows last cached snapshot with "Retry sync" banner
- Actions queue in SQLite
- Queue syncs automatically on reconnect
- UI shows "queued" feedback for pending actions

---

## 8. Navigation & Routing

### Navigation Structure (`app/navigation/AppNavigator.tsx`)

**Stack Navigator (Root):**
1. `AuthLoading` (during hydration)
2. `Auth` (if not authenticated)
3. `Alias` (if authenticated but no alias)
4. `CompanionIntro` (if hasn't seen intro or no permissions)
5. `MainTabs` (main app)
6. `FriendSync` (modal stack screen)

**Tab Navigator (MainTabs):**
- `Home`: Feed screen with daily summary
- `Friends`: Friends list and requests
- `Profile`: User profile and settings

**Navigation Guards:**
- `useProfileGate`: Ensures user has alias before accessing main app
- Session hydration check prevents flash of wrong screen

**Deep Linking:**
- Scheme: `cyclecompanion://`
- Used for push notification routing to specific feed entries

---

## 9. Key Features & Screens

### 9.1 Onboarding Flow

1. **AuthScreen**: Sign in with Apple
2. **AliasScreen**: Set display name/alias (required)
3. **CompanionIntroScreen**: Explains read-only promise, requests HealthKit permissions

### 9.2 Feed (`FeedScreen`)

- **DailySummaryCard**: Phase badge, timestamps, symptom chips, CTAs
- Hides if data >24h stale
- Shows "Retry sync" banner when stale

### 9.3 Notifications

- **NotificationsBell**: Badge count, opens sheet
- **NotificationsSheet**: Lists friend phase transitions
- Tapping routes to feed entry with prefilled boop metadata

### 9.4 Friend Sync (`FriendSyncScreen`)

- Overlap timeline visualization
- Sync score (dummy implementation)
- Recommendation chips
- Consent-gated: Shows empty state if no mutual consent

### 9.5 Profile (`ProfileScreen`)

- User phase summary
- Friend filters by phase (deep-link to Friend Sync)
- Add friend CTA
- Friend request management

---

## 10. Supabase Backend

### 10.1 Database Schema

**Core Tables:**
- `users`: Extended auth.users with profile data
- `cycle_events`: Menstrual flow events and phase transitions
- `cycle_snapshots`: Latest cycle snapshot per user (for friend sharing)
- `notifications`: In-app notification records
- `device_tokens`: Push notification tokens
- `friend_requests`: Friend request workflow
- `friend_sharing`: Mutual consent for friend data access
- `boops`: Boop interactions
- `posts`: User posts/updates
- `event_reactions`: Reactions to cycle events
- `post_reactions`: Reactions to posts

**Key Constraints:**
- Unique constraints prevent duplicate events
- Foreign keys cascade on user delete
- Indexes on frequently queried columns

### 10.2 Edge Functions

**notifications-handler:**
- Triggered on `cycle_events` insert
- Creates notifications for friends when phase transitions occur
- Sends push notifications if device tokens exist

**cycle-guidance:**
- Provides cycle guidance/insights

**friend-recommendations:**
- Generates friend recommendations

### 10.3 RPCs (Remote Procedure Calls)

- `sync-score`: Calculates friend sync score and overlap timeline

### 10.4 Row-Level Security (RLS)

- All tables have RLS policies
- Users can only read their own data
- Friend data requires mutual `friend_sharing` consent
- Policies tested in `supabase/tests/rls-cycle-companion.sql`

---

## 11. Development & Testing

### 11.1 Development Setup

**Prerequisites:**
- Node.js, npm
- EAS CLI (`eas login`, `eas build:configure`)
- Apple Developer account (for HealthKit entitlements)

**Dev Client Workflow:**
1. Build dev client once: `eas build --profile development --platform ios`
2. Install .ipa on device
3. Run Metro: `npx expo start --dev-client`
4. Scan QR code in dev client app

**Why Dev Client:**
- HealthKit and Sign in with Apple require native modules
- Expo Go doesn't support these features
- Dev client enables hot reload while maintaining native capabilities

### 11.2 Environment Variables

Required in `.env` or Expo config:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

### 11.3 Testing

**Test Structure:**
- Jest for unit tests
- Tests in `__tests__/` directories
- Test files: `*.test.ts` or `*.test.tsx`

**Key Test Files:**
- `app/services/supabase/__tests__/auth.test.ts`
- `app/services/supabase/__tests__/users.test.ts`
- `app/storage/sqlite/__tests__/cycleSnapshotStore.test.ts`
- `app/features/home/__tests__/reactionDoubleTap.test.ts`

### 11.4 Build Configuration

**app.json:**
- Bundle ID: `com.cadence.cycle`
- HealthKit entitlements enabled
- Sign in with Apple enabled
- Background modes: background fetch

**eas.json:**
- Development profile: Dev client builds
- Preview profile: Internal TestFlight builds

---

## 12. Key Design Decisions

### 12.1 Read-Only HealthKit

**Decision:** App never writes to Apple Health  
**Rationale:** Privacy assurance, users maintain control in Apple Health  
**Implementation:** Only uses read APIs from `@kingstinct/react-native-healthkit`

### 12.2 Offline-First Architecture

**Decision:** SQLite cache + queue-based sync  
**Rationale:** App must work offline, actions should queue and sync later  
**Implementation:** Local-first data access, connectivity-aware sync

### 12.3 Feature-Based Organization

**Decision:** Organize code by feature, not by type  
**Rationale:** Easier to find related code, better for feature development  
**Structure:** `app/features/{feature}/{screens|components|hooks|utils}`

### 12.4 Zustand for State

**Decision:** Zustand over Redux or Context  
**Rationale:** Simpler API, less boilerplate, good TypeScript support  
**Usage:** Global state (session, connection), local feature state in hooks

### 12.5 Supabase for Backend

**Decision:** Supabase over custom backend  
**Rationale:** Built-in auth, realtime, RLS, edge functions, PostgreSQL  
**Benefits:** Faster development, strong security model, scalable

---

## 13. Common Patterns & Conventions

### 13.1 Service Module Pattern

Each Supabase table has a corresponding service module:
- `{tableName}.ts` exports functions for CRUD operations
- Functions use typed Supabase client
- All queries respect RLS automatically

### 13.2 Hook Pattern

Feature-level hooks follow naming:
- `use{Feature}`: Main data hook
- `use{Feature}Sync`: Sync/background operations
- `use{Feature}Lifecycle`: Lifecycle management

### 13.3 Store Pattern

Zustand stores:
- Export `use{StoreName}` hook
- Export selectors: `select{Property}`
- Persist critical state to AsyncStorage

### 13.4 Error Handling

- Console logging for debugging: `[feature-name]` prefix
- User-facing errors via UI banners/toasts
- Offline errors queue actions instead of failing

---

## 14. Future Considerations

### Known Limitations (V0)
- iOS only (no Android/watchOS)
- No calendar views
- No new logging inputs (relies on Apple Health)
- Dummy sync score implementation

### Potential Enhancements
- Cycle prediction improvements
- More sophisticated phase estimation
- Enhanced friend recommendations
- Post reactions and comments
- Cycle guidance insights

---

## 15. Reference Documents

- **SSOT**: `overall/2025-11-11-cycle-companion-ssot.md` - Single source of truth for requirements
- **Implementation Docs**: `implementation-docs/` - Detailed implementation plans
- **Thoughts**: `thoughts/shared/` - Design docs, requirements, handoffs
- **Prompts**: `prompts/` - AI prompt templates for feature development

---

## 16. Quick Reference for AI Agents

### When Adding a Feature:
1. Check `overall/2025-11-11-cycle-companion-ssot.md` for requirements
2. Review similar features in `app/features/` for patterns
3. Create service module in `app/services/supabase/` if backend needed
4. Add migration in `supabase/migrations/` if schema change needed
5. Update RLS policies if new table/access pattern
6. Add tests in `__tests__/` directory

### When Debugging:
1. Check `sessionStore` state (hydration, permissions, session)
2. Check `connectionStore` for offline issues
3. Review SQLite cache via `cycleSnapshotStore`
4. Check Supabase dashboard for data consistency
5. Review Metro logs for `[feature-name]` prefixed messages

### When Modifying Sync:
1. Review `syncHealthData.ts` for sync logic
2. Check `useCycleSyncLifecycle.ts` for trigger points
3. Verify TTL logic in `cycleSnapshotStore.ts`
4. Test offline/online transitions

### When Adding Navigation:
1. Update `AppNavigator.tsx` for new screens
2. Add route params types if needed
3. Use `navigationRef` for programmatic navigation
4. Consider deep linking for push notifications

---

**End of Architecture Documentation**

