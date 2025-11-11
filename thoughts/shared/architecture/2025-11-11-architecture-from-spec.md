# Executive Summary
- Build **InSync**, an Expo-managed React Native iOS app that layers social features on top of read-only Apple Health menstrual data.
- First release priorities: Apple Sign in, HealthKit ingestion + Supabase persistence, and core social graph surfaces (friends, boops, reactions) across feed/profile.
- Architecture emphasizes modular features under `app/features/*`, typed shared domain models, and relying on the `@kingstinct/react-native-healthkit` JS API without bespoke Swift bridges, plus Supabase services.
- Data flows: HealthKit ➜ package-provided JS API ➜ sync service ➜ Supabase ➜ client cache ➜ UI; social inputs ➜ Supabase ➜ real-time subscriptions ➜ UI.
- Guardrails baked in from day one for privacy, offline resilience, accessibility, and future expansion to Android/notifications.

# Application Layers Overview
| Layer | Responsibilities | Representative Paths |
| --- | --- | --- |
| Presentation (React Native/Expo Router) | Screens, navigators, theming, components per feature (Feed, Friends/Profile). | `app/features/feed/screens/FeedScreen.tsx`, `app/navigation/AppNavigator.tsx`, `app/ui/components/*` |
| State & Data Access | Global auth/session, feature stores (Zustand + React Query), selectors, optimistic updates. | `app/state/sessionStore.ts`, `app/features/friends/stores/friendStore.ts` |
| Domain & Models | TypeScript models, validation, DTO mapping, shared logic (cycle phase computation, sync score placeholder). | `packages/domain/cycles/models.ts`, `packages/domain/social/syncScore.ts` |
| Services | HealthKit client wrapper, Supabase client, notifications, background jobs. | `app/services/healthkit/healthkitClient.ts`, `app/services/supabase/index.ts` |
| Native Bridges | Provided by `@kingstinct/react-native-healthkit`; ensure Expo config enables HealthKit entitlements without custom Swift. | (Managed by package) |
| Backend Integration | Supabase schema, row-level security, edge functions for aggregates, friend requests, placeholder sync score endpoints. | `supabase/migrations/*`, `supabase/functions/sync-score/index.ts` |
| Tooling & Infra | Fastlane, GitHub Actions CI, Expo config, TypeScript config, testing harness (Jest, Detox). | `fastlane/Fastfile`, `.github/workflows/ci.yml`, `app.json`, `tsconfig.json` |

# Data & State Flow
1. **Authentication**
   - User completes Sign in with Apple (`app/features/auth/screens/AuthScreen.tsx`) using Supabase Auth’s native SIWA support.
   - Successful auth stores the session in `app/state/sessionStore.ts` and rehydrates the Supabase client.
2. **Health Data Ingestion**
   - Permission flow uses the JS API exposed by `@kingstinct/react-native-healthkit` (`app/services/healthkit/permissions.ts`), which internally invokes the packaged Swift bridge.
   - Background delivery scheduled (HealthKit observer query) writes ingest events to RN via the package emitter; JS `app/services/healthkit/syncHealthData.ts` normalizes to domain models.
   - Synced records persisted locally in SQLite (via Expo `expo-sqlite` or WatermelonDB) under `app/storage/health.db` and pushed to Supabase (`supabase/functions/health-sync/index.ts`) using upsert APIs.
3. **Supabase Persistence & Real-time**
   - Supabase tables: `users`, `cycle_events`, `friends`, `friend_requests`, `reactions`, `boops`, `recommendations`.
   - `app/services/supabase/realtime.ts` subscribes to `cycle_events` & `friend_requests` channels to refresh caches in feature stores.
4. **Friend Graph & Feed**
   - `friendStore` holds friend list, requests, sync scores fetched via RPC (`supabase/functions/sync-score/index.ts` returning placeholder data).
   - Feed screen composes events by joining `cycle_events` and `reactions`, cached via React Query and hydrated offline from SQLite.
5. **Profile Views**
   - Profile uses domain helpers to compute current phase, friend count, and sync badges.
6. **Notifications**
   - Local notifications scheduled via Expo Notifications for reminders (phase tips, friend actions) once allowed by roadmap.

# Key Modules and Responsibilities
| Module/File | Purpose |
| --- | --- |
| `app/navigation/AppNavigator.tsx` | Defines tab stack (Feed, Profile) and deep links to friend sync screen. |
| `app/features/auth/*` | UI + logic for Apple Sign in, session bootstrap, linking identity to Supabase user row. |
| `app/features/feed/components/EventCard.tsx` | Renders combined cycle/friend actions with reactions/boops CTA. |
| `app/features/friends/screens/FriendSyncScreen.tsx` | Shows blended profile, sync score, boop action, recommendations. |
| `app/services/healthkit/healthkitClient.ts` | Wraps the `@kingstinct/react-native-healthkit` JS API for permissions, reads, and background delivery without custom native code. |
| `app/services/supabase/index.ts` | Singleton Supabase client, typed queries, RPC helpers, row-level security token management. |
| `app/state/sessionStore.ts` | Auth/session state (tokens, onboarding flags), hydration, selectors. |
| `packages/domain/*` | Shared types (`CycleEvent`, `Friend`, `Recommendation`), calculators (phase, sync). |
| `app/storage/sqlite/*` | Offline cache adapters mapping domain models to SQLite tables for feed data. |
| `supabase/functions/*` | Edge functions for placeholder sync score responses, boop/reaction aggregations. |
| `supabase/migrations/*` | Declarative schema (tables, RLS, policies) supporting social graph + cycle data. |

# External Services & Integrations
- **Apple Health / HealthKit**: via `@kingstinct/react-native-healthkit` JS surface (package supplies the Swift bridge); requires HealthKit entitlements and background delivery configuration in Expo.
- **Supabase**: Auth (Apple Sign in), Postgres DB, row-level security, real-time channels, Storage (avatars), Edge Functions (Deno).
- **Error Monitoring**: Sentry React Native integration, capturing native + JS stack traces.
- **Notifications**: Expo Notifications for local scheduling; APNs credentials configured for SIWA flows (future push support).

# Build, Tooling, and Testing Strategy
- **Runtime**: Expo SDK (latest LTS) with TypeScript, EAS Build for production binaries.
- **Package Mgmt**: `pnpm` or `yarn` with workspaces for `app` and `packages/`.
- **CI/CD**: GitHub Actions running lint (`eslint`), typecheck (`tsc --noEmit`), unit tests (`jest`), and Detox E2E (using iOS simulators). Fastlane orchestrates signing + submission.
- **Code Quality**: ESLint (Expo config), Prettier, Husky pre-commit hooking lint-staged.
- **Testing Pyramid**: Jest for domain/services, React Testing Library for components, Detox for auth + feed happy-path, Supabase edge functions covered by Deno tests.
- **Security/Secrets**: `.env` management via Expo Config Plugins + Supabase secrets; never store AI keys in client.
- **Observability**: Sentry for crashes, Supabase monitoring, log drains for edge functions.

# Risks, Constraints, and Assumptions
- **HealthKit Limitations**: App must stay read-only; ensure HK data types limited to menstrual flow + predictions; fallback UX if permissions denied.
- **Privacy & Compliance**: Sensitive cycle data requires encryption at rest (Supabase) and in transit; implement RLS so users only access own + accepted friends’ data.
- **Offline Support**: Need resilient caching for feed views to avoid blank states; plan background sync retries when connectivity restored.
- **Scalability**: Supabase free tier limits concurrent connections; plan connection pooling or caching for heavy friend graphs.
- **Auth Coverage**: Reliance on Apple Sign in means users without Apple ID cannot onboard; monitor demand for alternate auth later.
- **No Push in V0**: Architecture still reserves notification module; ensure toggles so features degrade gracefully.
- **iOS-first**: Android support optional; keep native bridge abstractions cross-platform-ready.
- **Assumed Services**: None beyond Supabase and Expo services already noted; wrap external interfaces to allow mocks if procurement changes.

# Opportunities for Codex Assistance
1. Generate initial file scaffolding (`app/features/*`, `packages/domain/*`, Supabase migration templates).
2. Author reusable hooks/stores for HealthKit syncing, Supabase real-time listeners, and offline cache adapters.
3. Draft Supabase SQL schema + edge functions (sync score placeholder, friend feed aggregates).
4. Implement automated permission/onboarding flow tests via Detox.
5. Produce documentation for security/privacy posture and HealthKit entitlement configuration.

**Created file:** `thoughts/shared/architecture/2025-11-11-architecture-from-spec.md`
