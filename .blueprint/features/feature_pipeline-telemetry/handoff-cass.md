## Handoff Summary
**For:** Nigel
**Feature:** pipeline-telemetry

### Key Decisions
- Telemetry is fully silent in both directions: no output when working correctly, no error output on failure — "absence of output is the correct behaviour" is an explicit AC in story-payload-send and story-failed-queue-retry
- Six stories map directly to Alex's six story themes; each is independently testable
- `featureId` preservation (AC-4 of story-identifiers) is a critical invariant: Alex must never regenerate a `featureId` that already exists in FEATURE_SPEC.md frontmatter
- Environment variable precedence (process env overrides `.env`) is a dedicated AC in story-telemetry-activation (AC-3 and AC-6)
- API key masking in `telemetry-config` output is an explicit security AC (story-telemetry-config-command AC-2)

### Files Created
- .blueprint/features/feature_pipeline-telemetry/story-telemetry-activation.md
- .blueprint/features/feature_pipeline-telemetry/story-identifiers.md
- .blueprint/features/feature_pipeline-telemetry/story-payload-send.md
- .blueprint/features/feature_pipeline-telemetry/story-failed-queue-retry.md
- .blueprint/features/feature_pipeline-telemetry/story-init-integration.md
- .blueprint/features/feature_pipeline-telemetry/story-telemetry-config-command.md

### Open Questions
- Should the failed queue cap be configurable or hard-coded? (left as implementation-defined in story-failed-queue-retry AC-6)
- Should `init` emit a visible notice when `.env` is created? (scoped out of story-init-integration per Alex's silent-by-default principle)

### Critical Context
This feature is infrastructure-level and cross-cutting. Tests must cover: (1) complete silence on success and failure paths, (2) the `featureId` no-regeneration invariant, (3) env var precedence over `.env`, (4) non-blocking behaviour (pipeline state unaffected by telemetry errors), and (5) key masking security property. All new code lives in `src/telemetry.js` and `src/commands/telemetry-config.js`; existing files touched are SKILL.md (Steps 5 and 12), `src/history.js`, `src/init.js`, `bin/cli.js`, and `src/index.js`.
