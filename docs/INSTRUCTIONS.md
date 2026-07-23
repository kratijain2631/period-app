# Working instructions

Conventions for anyone — human or AI agent — working in this repo.

## Start here — read the docs first

Before working on this project, read the docs linked from the [README](../README.md) for full context. Each has a distinct job:

- **[LEARNINGS.md](LEARNINGS.md)** — background, key decisions and *why*, and how the pieces work.
- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** — issues we hit and fixed, accounts/access, env vars, and things that expire.
- **[IDENTIFIERS.md](IDENTIFIERS.md)** — every name/identifier, where it lives, and how costly it is to change.
- **[SCHEMA.md](SCHEMA.md)** — the Supabase database (tables, functions, how it works).
- **[RELEASE_NOTES.md](RELEASE_NOTES.md)** — what shipped in each build.
- **[TODO.md](TODO.md)** — open work.

AI models especially: don't re-derive this context or repeat past mistakes — it's written down.

## 1. Update the release notes on every commit

Every commit that changes app behavior, config, or notable docs must also update [RELEASE_NOTES.md](RELEASE_NOTES.md):

- Keep an **`## Unreleased`** section at the very top of RELEASE_NOTES.md.
- Add your change under it, in the right bucket: **Added**, **Changed**, **Fixed**, or **Known / not yet done**.
- Write it in plain language (what a user or teammate would understand) — one line per change.
- Do this in the **same commit** as the change, so the notes never drift from the code.

## 2. Cut a version on every published build

Every time we publish a build (TestFlight or App Store), "block" the accumulated changes into a named version:

1. Rename the `## Unreleased` section to the new version + date, e.g.
   `## MVP 2 — Beta 2 (TestFlight) — YYYY-MM-DD`.
2. Move anything still incomplete into that version's **Known / not yet done** (or leave it in the fresh `## Unreleased`).
3. Open a new empty `## Unreleased` section at the top for the next cycle.
4. Bump `version` in `app.config.ts` for a user-facing release. (The native build number auto-increments via EAS `autoIncrement`, so don't manage that by hand.)

So: **changes accumulate under `Unreleased` as we commit, and get blocked into a named version each time we publish.**

## 3. Record issues and future-relevant info in TROUBLESHOOTING.md

When you hit and resolve a problem — or learn something that could bite a future contributor (a gotcha, a thing that could expire or fail, a non-obvious setup step, an account/access requirement, or info someone would need later) — write it into [TROUBLESHOOTING.md](TROUBLESHOOTING.md). Broader background and the "why" behind decisions goes in [LEARNINGS.md](LEARNINGS.md). The goal: nobody should have to re-derive what we already figured out, or repeat a mistake we already fixed.

## 4. Before changing any name or identifier

Read [IDENTIFIERS.md](IDENTIFIERS.md) first — it lists every name/identifier, where it lives, and how costly it is to change. The display name is a single constant (`APP_NAME` in `app.config.ts`); the iOS bundle id and EAS project id are costly and should not be changed casually.

## 5. Commits

- Prefer small, **atomic** commits — one logical change each.
- End commit messages authored with an AI agent with a `Co-Authored-By:` trailer.

## 6. Todos

Never **delete** items from [TODO.md](TODO.md) without explicit manual approval. When a todo is done, mark it done (`- [x]`) — leave it in the list. The list is a record of what was decided and completed, not just what's still pending. Removing items requires a human to approve it.

## 7. Secrets

Never commit secrets. Supabase keys and the DB password live in `.env` (gitignored) and EAS environment variables; Apple credentials live in EAS / Keychain. Only non-secret identifiers belong in the repo.
