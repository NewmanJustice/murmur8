## Handoff Summary
**For:** Nigel
**Feature:** display-version-number

### Key Decisions
- Output is bare semver only (e.g., `4.7.6`) — no `v` prefix, no ANSI codes, single trailing newline; assert on exact stdout
- All three invocations (`--version`, `-V`, `version` sub-command) must produce identical output
- Flag intercept occurs before command routing — no queue state touched, no agents spawned
- Version string is read from root `package.json` at runtime; test should verify it matches that file
- Error path (unreadable `package.json`) exits non-zero with stderr message — no stdout version string

### Files Created
- .blueprint/features/feature_display-version-number/story-version-invocation.md
- .blueprint/features/feature_display-version-number/story-version-help-discoverability.md

### Open Questions
- None

### Critical Context
AC assertions on stdout must be exact: bare semver string + newline, nothing else. The three invocation paths and the error path are the highest-priority test cases. Help discoverability story (AC1–AC2) only requires checking that `murmur8 help` stdout contains the strings `version` and `--version`/`-V`.
