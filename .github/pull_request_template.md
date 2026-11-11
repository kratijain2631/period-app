## What and why


## Docs (docs/INSTRUCTIONS.md §1)

- [ ] A line under `## Unreleased` in `docs/RELEASE_NOTES.md`
- [ ] Changes made outside git (Supabase dashboard, GitHub settings, EAS, App Store Connect) are recorded too, with the date and where
- [ ] Other docs this touches: `SCHEMA.md` (database), `TESTING.md` / `TEST_ACCOUNTS.md` (testing), `DB_PUSH.md` (deploys), `TODO.md` / `BUGS.md` / `FEATURES.md` (mark items done, add follow-ups), `TROUBLESHOOTING.md` (gotchas)
- [ ] No secrets, database URLs, or details of an unfixed security hole (the repo is public)

## Testing (docs/TESTING.md)

- [ ] `npm test` and `npx tsc --noEmit`
- [ ] User-visible change checked on staging with a persona (which one, and what you saw), or say why not
