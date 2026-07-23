# TODO

Open items, roughly in priority order. Done work isn't listed here.

## Ship the beta (external TestFlight)
- [x] Production build (`eas build --profile production --platform ios`)
- [x] Submit to App Store Connect (`eas submit --profile production --platform ios --latest`)
- [x] App Store Connect / TestFlight setup: export compliance, beta description, privacy policy URL, review notes
- [x] Submit for Beta App Review — **awaiting Apple (~1 day)**
- [ ] Once approved: share the public TestFlight link with friends

## Privacy policy
- [ ] **Make the privacy link permanent.** It's currently a Claude artifact (fine for the beta, but tied to Anthropic hosting). Move it to a permanent host before public launch — options: Netlify drag-and-drop (easiest, free), a small separate public repo + GitHub Pages, or your own domain.
- [ ] Before public launch: consider a legal review of the policy (sensitive menstrual-health data).

## Naming
- [ ] Decide the final app name (Cadence vs. alternatives) and check App Store name uniqueness, trademark, and domain availability
- [ ] Make naming consistent, or change the name. The display name is "Cadence" but the internal identifiers are mixed — iOS bundle id `com.syncsisters.cycle`, and slug / npm name / repo all `period-app`. Decide whether to align them to one namespace (e.g. cadence) or rename the app entirely. Best done **pre-launch**. Weigh the change-costs in [IDENTIFIERS.md](IDENTIFIERS.md): the bundle id is costly to change and invisible to users; the slug must match the EAS server; scheme / npm name / repo are cheap.

## Before a public App Store release (not needed for beta)
- [ ] App Privacy "nutrition labels" + age rating in App Store Connect (declare health-data collection)

## Nice to have
- [ ] Set up EAS Update (`expo-updates`) for instant over-the-air JS updates during the beta (no rebuild)
- [ ] Cosmetic: clean up leftover "Cycle Companion" references in docs (`thoughts/`, `prompts/`, `implementation-docs/`, `overall/`)

## Separate track (not this repo)
- [ ] Fix the "Sync Sisters" app in Newly: run `eas init --force` inside Newly so it gets its own EAS project id (currently collides with this project's id)

See [IDENTIFIERS.md](IDENTIFIERS.md) for all names/identifiers and where to change them.
