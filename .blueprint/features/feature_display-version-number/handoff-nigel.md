## Handoff Summary
**For:** Codey
**Feature:** display-version-number

### Key Decisions
- 11 tests (DVN-1–DVN-11) covering all story ACs across both stories
- `--version`, `-V`, and `version` sub-command must produce identical output: bare semver + `\n`, no prefix, no ANSI
- Version must be read from `package.json` at runtime (resolved relative to `bin/cli.js`, not `cwd`)
- DVN-8 tests the error path by temporarily removing `package.json` — CLI must catch read errors, write to stderr, exit non-zero, emit no stdout
- Help discoverability tests assert `murmur8 help` stdout contains `version`, `--version`, and `-V`

### Files Created
- test/artifacts/feature_display-version-number/test-spec.md
- test/feature_display-version-number.test.js

### Open Questions
- None

### Critical Context
Implement version handling in `bin/cli.js` (flag intercept before command routing) and add a `src/commands/version.js` handler. Help output (`src/commands/help.js`) must list both `version` and `--version`/`-V`. The `package.json` must be resolved via `path.join(__dirname, '../package.json')` from `bin/cli.js` so DVN-8's rename-based error test works correctly.
