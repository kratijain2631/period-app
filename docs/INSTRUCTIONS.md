# Working instructions

Conventions for anyone — human or AI agent — working in this repo.

## Start here — read the docs first

Before working on this project, read the docs linked from the [README](../README.md) for full context. Each has a distinct job:

- **[ONBOARDING.md](ONBOARDING.md)** — get set up to run/contribute (access checklist, `.env` keys).
- **[PITCH.md](PITCH.md)** — the vision, philosophy, and positioning.
- **[LEARNINGS.md](LEARNINGS.md)** — background, key decisions and *why*, and how the pieces work.
- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** — issues we hit and fixed, accounts/access, env vars, and things that expire.
- **[IDENTIFIERS.md](IDENTIFIERS.md)** — every name/identifier, where it lives, and how costly it is to change.
- **[SCHEMA.md](SCHEMA.md)** — the Supabase database (tables, functions, how it works).
- **[FEATURES.md](FEATURES.md)** — the product/feature backlog.
- **[BUGS.md](BUGS.md)** — known open bugs.
- **[RELEASE_NOTES.md](RELEASE_NOTES.md)** — what shipped in each build.
- **[TODO.md](TODO.md)** — operational/shipping tasks.

AI models especially: don't re-derive this context or repeat past mistakes — it's written down.

**Docs as code — keep adding to them.** These docs are our source of truth, kept in the repo *on purpose* — instead of Google Docs — so they're AI-readable alongside the code (context on goals/features), version-controlled, and all in one place. Add to them liberally: dump notes, ideas, bugs, decisions, and context into the right doc rather than losing them elsewhere. When in doubt, write it down.

## 1. Update the release notes on every change — code *and* non-code

Record every notable change in [RELEASE_NOTES.md](RELEASE_NOTES.md) under `## Unreleased`.

This includes **non-code changes that happen outside git** — e.g. Supabase config (Apple provider, schema/migrations run in the dashboard), account/project creation, EAS environment variables, the privacy-policy URL, App Store Connect setup, and other dashboard/credential changes. These don't produce a commit on their own, so capture them in the next commit's release-notes update (and put the operational detail in [TROUBLESHOOTING.md](TROUBLESHOOTING.md)).

- Keep an **`## Unreleased`** section at the very top.
- Add your change in the right bucket: **Added**, **Changed**, **Fixed**, **Infrastructure & release setup** (non-code/operational), or **Known / not yet done**.
- Plain language, one line per change.
- For code changes, do it in the **same commit** so the notes never drift from the code.

## 2. Cut a version on every published build

Every time we make a build (dev, TestFlight, or App Store), "block" the accumulated changes into a dated entry:

1. Rename the `## Unreleased` section to a header that **starts with the date, then describes exactly what that build was** — combine every label that applies: `dev` / `beta N` / `mvp` / `testflight` / `submitted for review` / `reviewed` (approved) / `app store`. Update the header later if its status changes (e.g. add `· approved` once Beta App Review passes). Examples:
   - `## 2026-07-23 — Dev build`
   - `## 2026-07-22 — Beta 1 · TestFlight · submitted for review`
   - `## 2026-08-01 — Beta 2 · TestFlight · reviewed & released`
2. Move anything still incomplete into that version's **Known / not yet done** (or leave it in the fresh `## Unreleased`).
3. Open a new empty `## Unreleased` section at the top for the next cycle.
4. Bump `version` in `app.config.ts` for a user-facing release. (The native build number auto-increments via EAS `autoIncrement`, so don't manage that by hand.)

So: **changes accumulate under `Unreleased` as we commit, and get blocked into a named version each time we publish.**

## 3. Record issues and future-relevant info in TROUBLESHOOTING.md

When you hit and resolve a problem — or learn something that could bite a future contributor (a gotcha, a thing that could expire or fail, a non-obvious setup step, an account/access requirement, or info someone would need later) — write it into [TROUBLESHOOTING.md](TROUBLESHOOTING.md). Broader background and the "why" behind decisions goes in [LEARNINGS.md](LEARNINGS.md). The goal: nobody should have to re-derive what we already figured out, or repeat a mistake we already fixed.

## 4. Check for bugs after every change

After every code change, **explicitly review it for bugs before committing**:
- Re-read the diff for logic errors, missing error handling, edge cases, and race conditions.
- Run the tests (`npm test`) and confirm the app still bundles/runs where relevant.
- Log any bug you find but don't fix in [BUGS.md](BUGS.md) so it isn't lost.

## 5. Before changing any name or identifier

Read [IDENTIFIERS.md](IDENTIFIERS.md) first — it lists every name/identifier, where it lives, and how costly it is to change. The display name is a single constant (`APP_NAME` in `app.config.ts`); the iOS bundle id and EAS project id are costly and should not be changed casually.

**In docs and prose, prefer "this app" over the current display name** — the name isn't final, so don't hardcode it. Only use the actual name where a specific value is genuinely needed: the identifier registry (IDENTIFIERS.md), records of a rename (RELEASE_NOTES/LEARNINGS), and name-decision todos.

## 6. Commits

- Prefer small, **atomic** commits — one logical change each.
- End commit messages authored with an AI agent with a `Co-Authored-By:` trailer.
- **Preserve history — don't squash.** When merging a PR, use a **merge commit** (`--merge`), never squash, unless explicitly asked to squash. **Pushing directly to `main` is fine too** — it preserves each commit. The goal is to keep the full, atomic commit history either way.

## 7. Todos

Never **delete** items from [TODO.md](TODO.md) without explicit manual approval. When a todo is done, mark it done (`- [x]`) — leave it in the list. The list is a record of what was decided and completed, not just what's still pending. Removing items requires a human to approve it.

Same for [BUGS.md](BUGS.md) and [FEATURES.md](FEATURES.md): **cross off bugs/features after implementing and adding to releasenotes so that multiple people can work at the same time and know where to pick up from.** ("Cross off" here means **mark as done** — check the box (`- [x]`), don't delete the item. Nothing gets removed without explicit approval.)

## 8. Secrets

Never commit secrets. Supabase keys and the DB password live in `.env` (gitignored) and EAS environment variables; Apple credentials live in EAS / Keychain. Only non-secret identifiers belong in the repo.
