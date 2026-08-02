# CLAUDE.md

Guidance for AI agents (and humans) working in this repo. This file is loaded automatically each session.

**Before doing anything, read [docs/INSTRUCTIONS.md](docs/INSTRUCTIONS.md) and the docs it links** for full context — vision, architecture, database schema, identifiers, known issues, and conventions. Don't re-derive context that's already written down, and don't repeat mistakes already recorded in [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md).

## Key conventions (full detail in docs/INSTRUCTIONS.md)

- Update **[docs/RELEASE_NOTES.md](docs/RELEASE_NOTES.md)** (`## Unreleased` section) in the *same commit* as any notable change; cut a named version on each published build.
- **Check for bugs after every change** — re-read the diff, run `npm test`, and log any unfixed bug in [docs/BUGS.md](docs/BUGS.md).
- Prefer small **atomic commits**; end AI-authored commit messages with a `Co-Authored-By:` trailer.
- **Never delete todos** from [docs/TODO.md](docs/TODO.md) without explicit approval — mark them done instead.
- In docs and prose, prefer **"this app"** over the current (non-final) name; only use the real name where a specific value is needed (see [docs/IDENTIFIERS.md](docs/IDENTIFIERS.md)).
- **Never commit secrets** — they live in `.env` (gitignored) and EAS env vars.

## Docs index

[Pitch](docs/PITCH.md) · [Learnings](docs/LEARNINGS.md) · [Schema](docs/SCHEMA.md) · [Cycle sync & notifications](docs/CYCLE_SYNC.md) · [Features](docs/FEATURES.md) · [Bugs](docs/BUGS.md) · [Release notes](docs/RELEASE_NOTES.md) · [Identifiers](docs/IDENTIFIERS.md) · [Todo](docs/TODO.md) · [Troubleshooting](docs/TROUBLESHOOTING.md) · [Instructions](docs/INSTRUCTIONS.md)
