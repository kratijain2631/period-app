# AGENTS.md

Guidance for all AI agents (whatever the tool or model) and humans working in this repo. This is the single source of agent instructions: tool-specific files such as `CLAUDE.md` only point here, so make changes in this file.

**Before doing anything, read [docs/INSTRUCTIONS.md](docs/INSTRUCTIONS.md) and the docs it links** for full context: vision, architecture, database schema, identifiers, known issues, and conventions. Don't re-derive context that's already written down, and don't repeat mistakes already recorded in [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md).

## Key conventions (full detail in docs/INSTRUCTIONS.md)

- Update **[docs/RELEASE_NOTES.md](docs/RELEASE_NOTES.md)** (`## Unreleased` section) in the *same commit* as any notable change; cut a named version on each published build.
- **Check for bugs after every change** — re-read the diff, run `npm test`, and log any unfixed bug in [docs/BUGS.md](docs/BUGS.md).
- Prefer small **atomic commits**; end AI-authored commit messages with a `Co-Authored-By:` trailer.
- **Never delete todos** from [docs/TODO.md](docs/TODO.md) without explicit approval — mark them done instead.
- In docs and prose, prefer **"this app"** over the current (non-final) name; only use the real name where a specific value is needed (see [docs/IDENTIFIERS.md](docs/IDENTIFIERS.md)).
- **Never commit secrets** — they live in `.env` (gitignored) and EAS env vars.
- **Database changes are migration files only**, applied with `supabase db push`, never pasted into the SQL editor except in an emergency. Only the owner changes production. See [docs/DB_PUSH.md](docs/DB_PUSH.md).

## Testing changes

Verify UI and behavior changes on the **staging** backend with test personas, never on production. Run `npm run test-accounts:seed`, then `npm run start:staging`, then sign in with "Email (dev)" as `ava@personas.example.com` (or another persona) using `TEST_PERSONA_PASSWORD` from `.env.staging`.

- **Personas:** `ava` regular cycle, every screen populated · `bea` irregular with signal-based phases · `cleo` first-ever period · `dev` no data · `eli` PMS window · `fay` incoming friend request.
- **Between accounts:** `npm run test-accounts:actors -- <command>` posts, reacts, boops and sends friend requests as personas, and has scripted scenarios.
- **Logic changes:** still need `npx tsc --noEmit` and `npm test`. `packages/domain/testing` has persona data for fixtures.
- **Setup:** `.env.staging` is local-only. If it's missing, copy `scripts/test-accounts/staging.env.example` and ask the owner for the values.
- **Procedure:** follow ["Testing as an AI agent" in docs/TEST_ACCOUNTS.md](docs/TEST_ACCOUNTS.md#testing-as-an-ai-agent). It isn't tied to any agent or model.

**Hard rules:**
- Never sign in with a real account on the simulator, because empty Health syncs overwrite real snapshots.
- Never run test tooling against production (`mmomoyszozclfjdvjbeb`).
- Never put the service-role key in an `EXPO_PUBLIC_` variable, and never print it or the persona password.
- Don't trust the STAGING pill alone. A successful persona login proves you're on staging, because personas don't exist on production.
- Stop any other Metro before `start:staging`, because the temporary `.env.local` applies to every Metro.
- Stop staging Metro when done, which removes `.env.local`.
- Don't commit `screenshots/` or any `.env*` files.

## Docs index

[Pitch](docs/PITCH.md) · [Learnings](docs/LEARNINGS.md) · [Schema](docs/SCHEMA.md) · [Cycle sync & notifications](docs/CYCLE_SYNC.md) · [Features](docs/FEATURES.md) · [Design](docs/DESIGN.md) · [Bugs](docs/BUGS.md) · [Release notes](docs/RELEASE_NOTES.md) · [Identifiers](docs/IDENTIFIERS.md) · [Todo](docs/TODO.md) · [Troubleshooting](docs/TROUBLESHOOTING.md) · [Test accounts](docs/TEST_ACCOUNTS.md) · [Database changes](docs/DB_PUSH.md) · [Security test suite design](docs/design/security-test-suite.md) · [Instructions](docs/INSTRUCTIONS.md)
