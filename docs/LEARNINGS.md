# Learnings & context

Background, decisions and their rationale, and reusable concepts from building this app — the "why" and the history behind the state of this repo. Things that don't fit in TROUBLESHOOTING (issues/fixes), IDENTIFIERS (names), TODO (open work), or INSTRUCTIONS (conventions) live here.

## Project background

- Cadence started as **"Cycle Companion"**, built with a collaborator (**Lukas**). Much of the original setup — the Apple App ID (`com.cadence.cycle`), the EAS project, and the Supabase project — lived under **Lukas's accounts**.
- This session **migrated the whole app onto Krati's own accounts** (Apple Developer, Expo/EAS, Supabase) so it can ship independently, and **renamed it to Cadence**.
- There is a **separate, related app called "Sync Sisters"** that lives in **"Newly"** — a cloud AI dev tool/platform (not on the local machine). Sync Sisters uses bundle id `com.syncsisters.app`. Its build failed because its `app.json` had accidentally inherited *this* project's EAS `projectId`; the fix (run `eas init --force` inside Newly) is on that side, not here. Don't confuse the two apps.
- Whether Lukas remains involved on the data/ownership side was left open — worth clarifying for the privacy policy (currently it names only Krati Jain as operator).

## Key decisions & rationale

- **Kept the iOS bundle id `com.syncsisters.cycle`** even after renaming to Cadence. It's invisible to users, and changing it means re-registering the App ID, regenerating credentials, and reconfiguring the Supabase Apple provider. Not worth it for zero user-facing benefit. (`com.cadence.cycle` is also unavailable — it's Lukas's.)
- **Stood up our own Supabase** rather than staying on Lukas's — needed for independence, and required anyway to add the new bundle id to the Apple provider.
- **Chose external TestFlight over internal** for friends: internal testers must be *users on the App Store Connect account* (they get account access), which is wrong for casual friends. External gates by *person invited* via a public link — no account access, no per-device UDID. Cost: a one-time Beta App Review.
- **Made only the display name modular** (`APP_NAME` in `app.config.ts`). The other identifiers (bundle id, slug, npm name, repo) are genuinely different things and were left as-is but documented — see IDENTIFIERS.md. Aligning them is tracked as an optional pre-launch todo.
- **Name "Cadence" is not final.** It's a common word with trademark/uniqueness risk (Cadence Design Systems), likely taken as an App Store name and domain. Alternatives floated: **Cirql** (cycle+circle, ownable — the strongest), **Orbit**, **Coven**. Decision deferred (in TODO.md).

- **Friend-cycle privacy RPC (1.0.11) — a security fix that deliberately broke backward-compat, and how it *should* have shipped.** Neha's PR #64 locked raw `cycle_snapshots`/`cycle_events` to owner-only and moved friend reads to sanitized `security definer` RPCs (`friend_cycle_summaries` / `shared_cycle_events`). The **goal was right** and closes a real gap (a friend could read raw HealthKit symptoms/BBT/flow at the API level, even though the UI never showed it). But the **rollout broke [§12](INSTRUCTIONS.md) backward-compat**: dropping the `*_select_own_or_friends` RLS policy immediately made friend reads return empty on every shipped build ≤1.0.10, and the DB migration (2026-07-29) landed *before* the RPC-using client (1.0.11, 2026-08-06) — the worst ordering. **The backward-compatible way is expand/contract (parallel change):** (1) add the new RPCs *alongside* the old policy so both paths work; (2) ship the client that prefers the RPC; (3) wait for adoption; (4) *then* drop the old policy. That closes the leak without a breakage window. The break here is defensible only because it's a closed beta (testers update together) **and** the old path was itself a privacy leak worth closing fast — but even then the lockdown should have shipped *after* the client, not before. **Right call now:** keep the lockdown (don't reopen the leak), make 1.0.11 the required minimum, get everyone onto it. General rule: when a change drops a read/write path a shipped build depends on, use expand/contract and gate the drop on client adoption; break it early only for a security hole, and even then ship the fixed client first.

## Reusable concepts (how the moving parts work)

- **Why a custom dev build, not Expo Go:** the app uses HealthKit and Sign in with Apple, which need native entitlements Expo Go doesn't include. So it requires a **custom development build** (a native shell built by EAS) that loads JS from Metro.
- **Dev build vs production build:** a dev build downloads its JavaScript from **Metro on your laptop** (laptop must be on; over the tunnel, proximity doesn't matter). A **production/TestFlight build bakes the JS in** — fully standalone, no laptop, works anywhere. This is why the dev build can't be handed to friends.
- **Two different QR codes:** the **Metro URL** (`…exp.direct`) only tells an *already-installed* dev client where to load JS. The **EAS install link** (on the build page) actually installs the app. Scanning the wrong one is a common trap.
- **Metro reloads vs rebuilds:** JS changes → just reload. Native/config changes (name, entitlements, bundle id, native libs) → require a full rebuild.
- **Certificate vs provisioning profile:** a **certificate** proves it's you signing (free, but limited to ~2 distribution certs — reuse them). A **provisioning profile** ties {App ID + capabilities + cert + allowed devices} together (free and unlimited — regenerate freely). Both are Apple-side.
- **App ID capability ≠ profile contents:** enabling a capability (e.g. Sign in with Apple) on the App ID does *not* retroactively add it to an already-generated provisioning profile. The profile is a point-in-time snapshot; regenerate it to pick up the capability.
- **EAS `projectId` vs Apple bundle id:** two different IDs from two different companies. The `projectId` (a UUID) identifies your project on **Expo's** servers; the bundle id (reverse-DNS) identifies the app to **Apple**. `app.json`/`app.config.ts` holds both — that's the only place the two worlds meet.
- **EAS slug must match the server:** the `slug` in the config must match the slug registered for that `projectId` on Expo's servers, or builds fail with a mismatch error.
- **Ad-hoc/internal distribution is device-locked:** the provisioning profile embeds a fixed list of allowed device UDIDs at build time. A friend can't just install via a link unless their UDID was registered *before* that build. TestFlight avoids this (person-gated, not device-gated).
- **Supabase native Sign in with Apple only needs Client IDs:** for the native `signInWithIdToken` flow, Supabase's Apple provider just needs the bundle id in its **Client IDs** field to validate the token audience. The Services ID / `.p8` secret key is only for the *web* OAuth redirect flow, which this app doesn't use.
- **`EXPO_PUBLIC_*` and cloud builds:** `.env` is gitignored, so EAS cloud builds don't see it. Runtime public vars must also be set as EAS environment variables. (Details in TROUBLESHOOTING.md.)

## App architecture notes (non-obvious bits)

- **Sign in with Apple nonce:** the app generates a raw nonce, passes `sha256(rawNonce)` to Apple, and the raw nonce to Supabase — Supabase re-hashes and compares. Correct per the standard native flow.
- **Friendship is the sharing boundary:** by owner decision, accepting a friend enables two-way cycle sharing; removing the friend is the mutual revoke. Clients read cycle data only through sanitized projection RPCs: friends receive useful phase/calendar fields and deliberately published feed events, not raw HealthKit metadata, personal symptoms, intensity, or signal samples. Raw cycle tables remain owner-only; dev testers update together, so no legacy fallback is needed.
- **Seeded feed data:** the migrations insert demo posts/reactions/boops (Neha, Maya, etc.), so a fresh account and App Review reviewers don't see a totally empty feed.
- **Dev email/password login is `__DEV__`-only:** `EXPO_PUBLIC_DEV_AUTH=true` enables an email/password sign-in that only renders in dev builds. Production/TestFlight is **Sign in with Apple only** — which is why App Review can't be given a username/password demo account.
- **Security is RLS-based:** row-level security on all tables (10 tables, 32 policies) scopes each user's data to themselves and approved friends. Account deletion (`delete_account()`, SECURITY DEFINER) clears non-cascading tables (posts, reactions, boops) then deletes the auth user, which cascades the rest.

## Open questions / to revisit

- Final app name (Cadence vs Cirql/Orbit/…) and whether to align the internal identifiers to it.
- Is Lukas still a data controller / co-operator? Affects the privacy policy.
- Permanent home for the privacy policy (currently a Claude artifact).
- Whether to ever ship Android (the `ANDROID_PACKAGE` is intentionally unset).
- Whether account deletion should move from the Postgres function to an Edge Function (works today as-is).
