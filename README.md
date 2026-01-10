# Cycle Companion

**Where your cycle meets your circle.**

Cycle Companion is an iOS social period tracking app that provides a read-only social layer on top of Apple Health. Users can friend each other, post updates, react to posts, send "boops" (supportive gestures), and see friend cycle data when mutual sharing consent exists.

---

## Table of Contents

- [Project Overview & Premise](#project-overview--premise)
- [Architecture Overview](#architecture-overview)
- [File Structure](#file-structure)
- [Tech Stack & Dependencies](#tech-stack--dependencies)
- [Data Flow & Services](#data-flow--services)
- [Backend Schema (Supabase)](#backend-schema-supabase)
- [Key Concepts & Patterns](#key-concepts--patterns)
- [Development Setup](#development-setup)
- [Important Notes for AI Agents](#important-notes-for-ai-agents)

---

## Project Overview & Premise

### Core Concept

Cycle Companion is a **React Native iOS app** that acts as a **social read-only layer on top of Apple Health**. The app:

- **Reads** menstrual cycle data from Apple Health (never writes back)
- Provides **daily cycle snapshots** in a feed showing phase, symptoms, and suggested social actions
- Enables **friendship connections** with mutual sharing consent
- Supports **social interactions**: posts, reactions (emoji), and "boops" (supportive gestures)
- Shows **friend sync views** with overlap timelines and sync scores (dummy data for V0)
- Sends **notifications** when friends enter PMS/menstruation phases
- Works **offline** with queued actions that sync when connectivity returns

### Key Principles

1. **Read-Only**: Never writes data to Apple Health - all copy and UX emphasizes this
2. **Privacy-First**: Row-level security (RLS) in Supabase, mutual consent required for friend data access
3. **Offline-First**: Local SQLite caching, action queuing, graceful degradation
4. **Data Freshness**: 24-hour TTL for cycle snapshots with stale indicators
5. **V0 Scope**: No calendar views, no Android/watchOS, placeholder sync scores acceptable

### User Personas

- **Reflective Tracker**: Needs up-to-date context without re-entering data, plus transparent freshness indicators
- **Social Supporter**: Wants quick cues on friends' states (PMS, menstruation) to time boops/reactions
- **New Joiner**: Requires clear onboarding explaining read-only permissions, Supabase storage, and friend sharing consent

---

## Architecture Overview

### Application Layers

```
┌─────────────────────────────────────────────────────────┐
│  Presentation Layer (React Native/Expo)                 │
│  - Screens, Navigation, Components                       │
│  - Feature-based organization under app/features/        │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  State Management (Zustand + React Query)               │
│  - Session store, connection store                       │
│  - Feature hooks, optimistic updates                    │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  Domain & Models (TypeScript)                           │
│  - Cycle models, phase computation                      │
│  - Shared types and helpers                             │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  Services Layer                                         │
│  - HealthKit client, Supabase client                    │
│  - Background sync, notifications, boop queue           │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  Storage Layer (SQLite)                                 │
│  - Cycle snapshots cache                                │
│  - Boop queue for offline actions                       │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  Backend (Supabase)                                     │
│  - PostgreSQL with RLS                                  │
│  - Edge functions for notifications                     │
│  - Realtime subscriptions                               │
└─────────────────────────────────────────────────────────┘
```

### Navigation Flow

```
App Launch
  ↓
AuthScreen (if no session)
  ↓
Sign in with Apple (SIWA)
  ↓
AliasScreen (if no alias set)
  ↓
CompanionIntroScreen (if not seen or no permissions)
  ↓
Grant HealthKit permissions
  ↓
MainTabs (Home, Feed, Profile)
  ├─ HomeScreen
  ├─ FeedScreen (with DailySummaryCard)
  └─ ProfileScreen
      └─ FriendSyncScreen (modal)
```

### Main Entry Point

The app initializes in `App.tsx` with several lifecycle hooks:
- `useConnectionWatcher()` - Monitors network connectivity
- `useCycleSyncLifecycle()` - Manages HealthKit sync on app state changes
- `useSupabaseAuth()` - Handles authentication state
- `useProfileGate()` - Ensures user has profile/alias
- `usePushNotifications()` - Registers for push notifications
- `useBoopQueueSync()` - Flushes queued boops when online

---

## File Structure

```
period-app/
├── app/                          # Main application code
│   ├── features/                 # Feature-based organization
│   │   ├── auth/
│   │   │   └── screens/
│   │   │       └── AuthScreen.tsx          # Sign in with Apple
│   │   ├── companion/
│   │   │   └── screens/
│   │   │       └── CompanionIntroScreen.tsx # Onboarding & permissions
│   │   ├── feed/
│   │   │   ├── components/
│   │   │   │   └── DailySummaryCard.tsx    # Daily cycle snapshot card
│   │   │   ├── hooks/
│   │   │   │   └── useCycleSnapshot.ts     # Feed data hook
│   │   │   └── screens/
│   │   │       └── FeedScreen.tsx          # Main feed with posts
│   │   ├── friends/
│   │   │   ├── components/
│   │   │   │   └── FriendSyncButton.tsx
│   │   │   └── screens/
│   │   │       └── FriendSyncScreen.tsx    # Friend sync view with overlap
│   │   ├── home/
│   │   │   └── screens/
│   │   │       └── HomeScreen.tsx
│   │   ├── notifications/
│   │   │   ├── components/
│   │   │   │   ├── NotificationsBell.tsx   # Badge icon
│   │   │   │   └── NotificationsSheet.tsx  # Notification list
│   │   │   └── hooks/
│   │   │       └── useNotifications.ts     # Realtime notifications
│   │   └── profile/
│   │       └── screens/
│   │           ├── AliasScreen.tsx         # Set display alias
│   │           └── ProfileScreen.tsx       # User profile & friend filters
│   │
│   ├── navigation/
│   │   ├── AppNavigator.tsx                # Main navigation setup
│   │   └── navigationRef.ts                # Navigation ref for deep links
│   │
│   ├── services/                           # Service layer
│   │   ├── auth/
│   │   │   └── appleAuth.ts                # Apple Sign in helpers
│   │   ├── boops/
│   │   │   └── useBoopQueueSync.ts         # Sync queued boops to Supabase
│   │   ├── healthkit/
│   │   │   ├── backgroundSync.ts           # Background task registration
│   │   │   ├── healthkitClient.ts          # HealthKit JS API wrapper
│   │   │   ├── permissions.ts              # Permission requests
│   │   │   ├── syncHealthData.ts           # Main sync logic
│   │   │   ├── syncStateStore.ts           # Sync state management
│   │   │   └── useCycleSyncLifecycle.ts    # Sync lifecycle hook
│   │   ├── notifications/
│   │   │   └── usePushNotifications.ts     # Push notification setup
│   │   └── supabase/                       # Supabase service modules
│   │       ├── __tests__/                  # Unit tests
│   │       ├── auth.ts                     # Auth helpers
│   │       ├── boops.ts                    # Boop CRUD
│   │       ├── client.ts                   # Supabase client setup
│   │       ├── cycleEvents.ts              # Cycle event upserts
│   │       ├── cycleSnapshots.ts           # Snapshot sync
│   │       ├── deviceTokens.ts             # Push token management
│   │       ├── friendRequests.ts           # Friend request management
│   │       ├── friendSharing.ts            # Friend sharing consent
│   │       ├── notifications.ts            # Notification queries
│   │       ├── postReactions.ts            # Post reaction CRUD
│   │       ├── posts.ts                    # Post CRUD
│   │       ├── syncScore.ts                # Friend sync score RPC
│   │       ├── users.ts                    # User profile queries
│   │       ├── useProfileGate.ts           # Profile requirement hook
│   │       └── useSupabaseAuth.ts          # Auth state hook
│   │
│   ├── state/                              # Global state management
│   │   ├── connectionStore.ts              # Network connectivity state
│   │   └── sessionStore.ts                 # Auth session & app state
│   │
│   └── storage/                            # Local storage (SQLite)
│       └── sqlite/
│           ├── __tests__/
│           ├── boopQueueStore.ts           # Offline boop queue
│           └── cycleSnapshotStore.ts       # Cycle snapshot cache
│
├── packages/                               # Shared packages
│   └── domain/
│       └── cycles/
│           └── models.ts                   # Cycle domain models
│
├── supabase/                               # Backend configuration
│   ├── functions/                          # Edge functions
│   │   └── notifications-handler/
│   │       └── index.ts                    # Push notification trigger
│   ├── migrations/                         # Database migrations
│   │   ├── 20251229213000_create-users.sql
│   │   ├── 20251229215000_cycle-companion-core.sql  # Core schema
│   │   ├── 20251230010000_boops.sql
│   │   ├── 20251230024000_posts-and-alias.sql
│   │   ├── 20251230024500_seed-posts.sql
│   │   ├── 20251230030000_user-search.sql
│   │   ├── 20251230031000_friend-request-profiles.sql
│   │   └── 20251230032000_friend-sharing-helpers.sql
│   └── tests/
│       └── rls-cycle-companion.sql         # RLS policy tests
│
├── overall/                                # Single Source of Truth docs
│   └── 2025-11-11-cycle-companion-ssot.md # Complete requirements SSOT
│
├── thoughts/                               # Design & planning docs
│   └── shared/
│       ├── architecture/                   # Architecture decisions
│       ├── designs/                        # Design docs
│       ├── features/                       # Feature specs
│       ├── handoffs/                       # Engineering handoffs
│       ├── requirements/                   # Requirements docs
│       └── tasks/                          # Task breakdowns
│
├── implementation-docs/                    # Implementation notes
│   ├── phase3-implementation.md
│   ├── task2-implementation.md            # Permissions & sync
│   ├── task4-implementation.md            # Local storage & TTL
│   ├── task5-implementation.md            # Supabase layer
│   ├── task6-implementation.md            # Feed & notifications
│   ├── task7-implementation.md            # Profile & friend sync
│   └── task8-implementation.md            # Offline & reliability
│
├── prompts/                                # AI prompt templates
│   └── useful-prompts/
│
├── reference/                              # Reference materials
│   ├── spec.md                            # Original product spec
│   └── wireframes.jpeg
│
├── App.tsx                                 # Root component
├── app.json                                # Expo configuration
├── package.json                            # Dependencies
├── tsconfig.json                           # TypeScript config
└── README.md                               # This file
```

---

## Tech Stack & Dependencies

### Core Framework
- **Expo** (~54.0.30) - React Native framework with managed workflow
- **React** (19.1.0) & **React Native** (0.81.5)
- **TypeScript** (~5.9.2) - Strict type checking enabled

### Navigation
- **@react-navigation/native** (^7.0.0-rc.21) - Navigation library
- **@react-navigation/native-stack** (^7.0.0-rc.30) - Stack navigator
- **@react-navigation/bottom-tabs** (^7.9.0) - Tab navigator

### State Management
- **zustand** (^4.4.7) - Lightweight state management
- **@react-native-async-storage/async-storage** (2.2.0) - Persistent storage for Zustand

### HealthKit Integration
- **@kingstinct/react-native-healthkit** (10) - HealthKit JS API wrapper

### Backend & Database
- **@supabase/supabase-js** (^2.56.1) - Supabase client
- **expo-sqlite** (~16.0.10) - Local SQLite database

### Authentication
- **expo-apple-authentication** (~8.0.8) - Sign in with Apple

### Notifications
- **expo-notifications** (~0.32.15) - Push notifications
- **expo-background-fetch** (~14.0.7) - Background tasks
- **expo-task-manager** (~14.0.8) - Task management

### Connectivity
- **@react-native-community/netinfo** (11.4.1) - Network state detection

### Development Tools
- **jest** (^29.7.0) - Testing framework
- **expo-dev-client** (~6.0.17) - Custom dev client (required for HealthKit)

### Key Expo Plugins
- `expo-build-properties` - iOS deployment target (15.1), New Architecture enabled
- `@kingstinct/react-native-healthkit` - HealthKit entitlements & usage strings
- `expo-sqlite` - SQLite support
- `expo-notifications` - Push notification support

---

## Data Flow & Services

### Authentication Flow

```
1. User taps "Sign in with Apple" (AuthScreen)
   ↓
2. Apple authentication via expo-apple-authentication
   ↓
3. Identity token exchanged with Supabase Auth (useSupabaseAuth)
   ↓
4. Session stored in sessionStore (Zustand + AsyncStorage)
   ↓
5. Navigation gated by session state (AppNavigator)
   ↓
6. Profile check (useProfileGate) ensures alias is set
   ↓
7. Companion intro shown if permissions not granted
```

### HealthKit Sync Flow

```
1. User grants HealthKit permissions (CompanionIntroScreen)
   ↓
2. Permissions stored in sessionStore
   ↓
3. useCycleSyncLifecycle hook triggers syncHealthData()
   ↓
4. healthkitClient queries HKCategoryTypeIdentifierMenstrualFlow
   - Lookback: 90 days
   - Limit: 400 samples
   ↓
5. Raw samples normalized to CycleSample[] (domain/models.ts)
   ↓
6. CycleSnapshot derived (phase, latest sample, etc.)
   ↓
7. Snapshot cached locally (SQLite cycleSnapshotStore)
   ↓
8. Snapshot upserted to Supabase (cycle_snapshots table)
   ↓
9. Individual events upserted to Supabase (cycle_events table)
   ↓
10. DeviceEventEmitter.emit('companion/snapshotUpdated')
    ↓
11. UI components (DailySummaryCard) react to event
```

### Background Sync

- Registered via `registerCompanionBackgroundSync()` on app start
- Triggers `syncHealthData({ trigger: 'background' })` periodically
- Also triggers on app foreground (AppState 'active')
- Unregistered when session/permissions revoked

### Notification Flow

```
1. User's cycle_events row inserted (via syncHealthData)
   ↓
2. Supabase database trigger → notifications-handler edge function
   ↓
3. Edge function queries friend_sharing for mutual consent
   ↓
4. Creates notification records for mutual friends
   ↓
5. Fetches device tokens for those friends
   ↓
6. Sends push notifications via Expo Push Notification service
   ↓
7. Client receives push (usePushNotifications hook)
   ↓
8. Realtime subscription (useNotifications) updates notification list
   ↓
9. NotificationsBell badge updates, NotificationsSheet shows list
```

### Boop Queue Flow (Offline Support)

```
1. User sends boop (online)
   ↓
2. Direct insert to Supabase boops table
   
   OR (offline)
   ↓
2. Boop enqueued in SQLite boopQueueStore
   ↓
3. Connection state monitored (connectionStore)
   ↓
4. When online, useBoopQueueSync flushes queue
   ↓
5. Queued boops sent to Supabase with original timestamps
   ↓
6. Queue entries removed after successful sync
```

### Friend Sharing Flow

```
1. User searches for friend (ProfileScreen)
   ↓
2. Friend request created (friend_requests table)
   ↓
3. Recipient sees request, accepts/declines
   ↓
4. On acceptance, friend_sharing row created (mutual required)
   ↓
5. RLS policies check friend_sharing.has_shared = true (both directions)
   ↓
6. Friend data visible in FriendSyncScreen, notifications enabled
```

---

## Backend Schema (Supabase)

### Core Tables

#### `users` (extends Supabase auth.users)
- `id` (uuid, PK) - References auth.users.id
- `alias` (text) - Display name
- `full_name` (text) - From Apple Sign in
- `email` (text) - From Apple Sign in

#### `cycle_events`
- `id` (uuid, PK)
- `user_id` (uuid, FK → auth.users)
- `event_type` (text) - e.g., 'menstrual_flow'
- `phase` (text) - 'menstruation', 'pms', 'ovulation', etc.
- `symptoms` (jsonb) - Metadata from HealthKit
- `starts_at` (timestamptz)
- `created_at` (timestamptz)

**RLS**: Users can read own events or friends' events (if mutual `friend_sharing.has_shared = true`)

#### `cycle_snapshots`
- `id` (uuid, PK)
- `user_id` (uuid, FK → auth.users, unique)
- `last_synced_at` (timestamptz)
- `snapshot` (jsonb) - Full CycleSnapshot JSON
- `created_at` (timestamptz)

**RLS**: Same as cycle_events (own or mutual friends)

#### `notifications`
- `id` (uuid, PK)
- `user_id` (uuid, FK → auth.users) - Recipient
- `friend_id` (uuid, FK → auth.users) - Sender
- `event_id` (uuid, FK → cycle_events)
- `payload` (jsonb) - Event metadata
- `created_at` (timestamptz)

**RLS**: Users can only read their own notifications

#### `device_tokens`
- `id` (uuid, PK)
- `user_id` (uuid, FK → auth.users)
- `token` (text) - Expo push token
- `platform` (text) - 'ios'
- `created_at`, `updated_at` (timestamptz)

**RLS**: Users can manage only their own tokens

#### `friend_requests`
- `id` (uuid, PK)
- `from_user_id` (uuid, FK → auth.users)
- `to_user_id` (uuid, FK → auth.users)
- `status` (text) - 'pending', 'accepted', 'declined'
- `created_at`, `updated_at` (timestamptz)
- Unique constraint: (from_user_id, to_user_id)

**RLS**: Participants can read/update requests they're part of

#### `friend_sharing`
- `user_id` (uuid, FK → auth.users)
- `friend_id` (uuid, FK → auth.users)
- `has_shared` (boolean) - Consent flag
- `created_at`, `updated_at` (timestamptz)
- Primary key: (user_id, friend_id)

**RLS**: Participants can read/update their own consent rows

#### `posts`
- `id` (uuid, PK)
- `user_id` (uuid, FK → auth.users)
- `alias` (text) - Populated via trigger from users.alias
- `body` (text) - Post content
- `mood_tag` (text) - Optional mood
- `created_at` (timestamptz)

**RLS**: Authenticated users can read all posts, users can only modify own posts

#### `post_reactions`
- `id` (uuid, PK)
- `post_id` (uuid, FK → posts)
- `user_id` (uuid, FK → auth.users)
- `emoji` (text) - Reaction emoji
- `created_at` (timestamptz)
- Unique constraint: (post_id, user_id, emoji)

**RLS**: Authenticated users can read all reactions, users can only manage own reactions

#### `boops`
- `id` (uuid, PK)
- `from_user_id` (uuid, FK → auth.users)
- `to_user_id` (uuid, FK → auth.users)
- `event_id` (uuid, FK → cycle_events, nullable)
- `post_id` (uuid, FK → posts, nullable)
- `created_at` (timestamptz)

**RLS**: Participants can read boops they're involved in, users can only create boops as sender

### Edge Functions

#### `notifications-handler` (Deno)
- Triggered by database webhook on `cycle_events` insert
- Queries mutual friends via `friend_sharing`
- Creates notification records
- Sends push notifications via Expo Push Notification service
- Returns counts of inserted notifications and sent pushes

### Row-Level Security (RLS)

All tables have RLS enabled. Key patterns:
- **Own data**: `auth.uid() = user_id`
- **Friend data**: Requires mutual `friend_sharing.has_shared = true` (both directions checked)
- **Service role**: Some inserts (notifications) require `auth.role() = 'service_role'`

See `supabase/migrations/20251229215000_cycle-companion-core.sql` for complete RLS policies.

---

## Key Concepts & Patterns

### Cycle Phase Computation

Currently minimal: `phaseFromFlowValue()` in `packages/domain/cycles/models.ts` maps HealthKit flow values to phases:
- `CategoryValueMenstrualFlow.none` → `'unknown'`
- Other values → `'menstruation'`

Future enhancement: More sophisticated phase prediction based on cycle history.

### Staleness & TTL

- Cycle snapshots have a **24-hour TTL** (`STALE_AFTER_MS = 24 * 60 * 60 * 1000`)
- `isSnapshotStale()` helper checks if data is outdated
- `DailySummaryCard` hides if snapshot is stale
- UI shows "Retry sync" banner when stale

### Offline Queue Pattern

1. Actions (boops, reactions) are always attempted directly to Supabase
2. On failure (network error), action is queued in SQLite
3. `useBoopQueueSync` hook monitors connection state
4. When online, queue is flushed with original timestamps preserved
5. Queue entries removed after successful sync

### Session State Management

`sessionStore` (Zustand with persistence) tracks:
- `session`: Auth session (userId, tokens)
- `hasSeenCompanionIntro`: Onboarding completion
- `permissions`: HealthKit permission state
- `alias`: User display name
- `isHydrating`: Initial load state
- `isProfileHydrating`: Profile fetch state

Navigation logic gates screens based on these flags.

### Feature-Based Organization

Features are organized under `app/features/{feature-name}/`:
- `screens/` - Screen components
- `components/` - Feature-specific components
- `hooks/` - Feature-specific hooks
- `stores/` - Feature-specific state (if needed)

Services are shared under `app/services/`.

### Domain Models

Domain models live in `packages/domain/`:
- `cycles/models.ts` - Cycle types, normalization, snapshot derivation

These are pure TypeScript with no framework dependencies, making them testable and reusable.

### Event-Driven Updates

- `DeviceEventEmitter` used for cycle snapshot updates (`CYCLE_SNAPSHOT_UPDATED`)
- Components subscribe to events to react to sync completion
- Alternative: Could use React Query for more sophisticated caching

### Supabase Realtime

- Used for notifications: `useNotifications` subscribes to `notifications` table changes
- Real-time updates when friends trigger cycle events
- Badge counts update automatically

---

## Development Setup

### Prerequisites

- Node.js (LTS version recommended)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- EAS CLI (`npm install -g eas-cli`)
- Xcode (for iOS development)
- Apple Developer account (for HealthKit entitlements)
- Supabase project (for backend)

### Environment Variables

Create `.env` file (or use Expo's environment variable system):

```bash
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

For edge functions:
```bash
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
EXPO_PUSH_ACCESS_TOKEN=your_expo_access_token  # Optional
```

### Initial Setup

```bash
# Install dependencies
npm install

# Set up EAS credentials (one-time)
eas login
eas build:configure
```

### Running the App

**⚠️ Important**: HealthKit and Sign in with Apple require a **custom dev client**. Expo Go cannot run these features.

#### Build Dev Client (One-Time)

```bash
# Build the dev client (installs native HealthKit/SIWA deps)
eas build --profile development --platform ios

# Install the .ipa from the EAS build page on your device
# Or use TestFlight for internal distribution
```

#### Start Development Server

```bash
# Start Metro bundler for the dev client (hot reloads JS)
npm run start
# Or: npx expo start --dev-client

# If LAN is blocked, use tunnel mode
npx expo start --dev-client --tunnel
```

Open the dev client app on your device and scan the QR code from the Metro terminal.

#### Direct iOS Run (Alternative)

```bash
# Build and run directly on iOS simulator/device
npm run ios
# Or: npx expo run:ios
```

### Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm test -- --watch
```

### Supabase Setup

1. Create a Supabase project
2. Run migrations:
   ```bash
   supabase db push
   # Or apply migrations manually via Supabase dashboard
   ```
3. Set up edge function:
   ```bash
   supabase functions deploy notifications-handler
   ```
4. Configure database webhook to trigger `notifications-handler` on `cycle_events` insert

### Building for Release

```bash
# Build preview build (TestFlight)
eas build --profile preview --platform ios

# Build production build
eas build --profile production --platform ios
```

Before building, ensure:
- `app.json` has correct `ios.bundleIdentifier` tied to your Apple Developer account
- HealthKit capability enabled for that App ID in Apple Developer portal
- All environment variables set in EAS secrets (if needed)

---

## Important Notes for AI Agents

### Critical Constraints

1. **Read-Only HealthKit**: The app NEVER writes to Apple Health. All code should enforce this. Copy in UI must emphasize this.

2. **Privacy & Consent**: Friend data access requires **mutual consent** (`friend_sharing.has_shared = true` for both directions). Always check RLS policies before querying friend data.

3. **Offline Support**: All user actions (boops, reactions, posts) should gracefully handle offline scenarios by queueing in SQLite.

4. **Data Freshness**: Cycle snapshots expire after 24 hours. Always check staleness before displaying data.

5. **V0 Scope**: Do not implement:
   - Calendar views
   - Android/watchOS support
   - Real sync score calculations (use dummy data)
   - Writing to Apple Health

### Common Patterns

#### Adding a New Feature

1. Create feature directory: `app/features/{feature-name}/`
2. Add screens/components/hooks as needed
3. Create Supabase service if backend needed: `app/services/supabase/{service}.ts`
4. Add migration if schema change needed: `supabase/migrations/{timestamp}_{description}.sql`
5. Update navigation: `app/navigation/AppNavigator.tsx`
6. Add RLS policies if new table created
7. Test offline behavior
8. Update this README if architecture changes

#### Modifying HealthKit Sync

- Main sync logic: `app/services/healthkit/syncHealthData.ts`
- Permission handling: `app/services/healthkit/permissions.ts`
- Background sync: `app/services/healthkit/backgroundSync.ts`
- Lifecycle management: `app/services/healthkit/useCycleSyncLifecycle.ts`

#### Modifying Supabase Schema

1. Create migration file: `supabase/migrations/{timestamp}_{description}.sql`
2. Include RLS policies (enable RLS, create policies)
3. Test RLS policies: `supabase/tests/rls-cycle-companion.sql`
4. Deploy: `supabase db push` or apply manually
5. Update TypeScript types if needed (consider code generation)

#### Adding Notifications

1. Create notification record in Supabase
2. Edge function (`notifications-handler`) handles push if triggered by DB webhook
3. Client receives via `usePushNotifications` hook
4. Realtime subscription (`useNotifications`) updates UI
5. Deep linking handled in notification handler

### Testing Considerations

- HealthKit requires physical device or configured simulator with Health data
- Supabase RLS policies must be tested with different user contexts
- Offline scenarios: Use airplane mode or network simulation
- Background sync: Test app state transitions
- Push notifications: Test with Expo Push Notification tool

### Code Style

- TypeScript strict mode enabled
- Feature-based organization preferred
- Domain models in `packages/domain/` are framework-agnostic
- Use Zustand for global state, React Query for server state (when adopted)
- Prefer hooks over direct service calls in components

### Documentation Locations

- **Requirements SSOT**: `overall/2025-11-11-cycle-companion-ssot.md`
- **Architecture decisions**: `thoughts/shared/architecture/`
- **Implementation notes**: `implementation-docs/`
- **Original spec**: `reference/spec.md`

### When Adding Features

Always ask:
1. Does this require HealthKit permissions? (Probably not if it's social-only)
2. Does this need friend data? (Check mutual consent)
3. Does this work offline? (Should queue if modifying data)
4. Does this respect 24h TTL? (Check snapshot freshness)
5. Does this write to HealthKit? (Should not)

---

## Additional Resources

- **Single Source of Truth**: `overall/2025-11-11-cycle-companion-ssot.md` - Complete requirements and implementation plan
- **Expo Documentation**: https://docs.expo.dev
- **Supabase Documentation**: https://supabase.com/docs
- **HealthKit Documentation**: https://developer.apple.com/documentation/healthkit
- **React Navigation**: https://reactnavigation.org

---

**Last Updated**: 2025-01-XX (Update this when making significant changes to the README)
