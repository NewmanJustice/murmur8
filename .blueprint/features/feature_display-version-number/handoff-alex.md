## Handoff Summary
**For:** Cass
**Feature:** display-version-number

### Key Decisions
- Version is read from `package.json` at runtime (no hardcoded string) to guarantee accuracy
- Output format is bare semver (e.g., `4.7.6`) with no prefix or decoration, for scripting compatibility — this is an explicit assumption (A1 in spec)
- Both `--version`/`-V` flags and a `version` sub-command are in scope; flag intercept happens before command routing
- `help` output must be updated to document the new flag and command
- No remote registry check, no Node.js version display — deferred out of scope

### Files Created
- .blueprint/features/feature_display-version-number/FEATURE_SPEC.md

### Open Questions
- OQ1: Should output include a `v` prefix (e.g., `v4.7.6`) or remain bare (`4.7.6`)? Spec assumes bare; AC should encode whichever is decided
- OQ2: Should error path (unreadable `package.json`) be covered by a separate story or an AC on the primary story?

### Critical Context
This is a small, read-only CLI affordance. The key behavioural detail that Cass must make explicit in stories is the **output format** (bare semver, no ANSI codes, single newline) because Nigel's tests will assert on exact stdout. The two invocation paths (`--version` flag vs. `version` sub-command) can be one story with two ACs or two stories — either works, but the flag intercept priority (before command routing) should be captured as an AC to ensure Codey implements it correctly.
