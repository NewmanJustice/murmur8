## Handoff Summary
**For:** Cass
**Feature:** pipeline-telemetry

### Key Decisions
- Telemetry is opt-in by configuration: setting `MURMUR8_TELEMETRY_URL` activates it; absence = fully silent (no flag needed to disable)
- Non-blocking by design: HTTP send failures enqueue to `.claude/telemetry-failed.json` silently; retry happens at next pipeline start — pipeline is never interrupted
- Two stable identifiers: `runId` (UUID v4, per run, generated at Step 5) and `featureId` (UUID v4, per feature spec, written by Alex into frontmatter on first creation, never regenerated)
- No external dependencies: uses Node.js built-ins only (`zlib`, `crypto`, `https`/`http`) — no dotenv, no HTTP client library
- `.env` parsed manually with real env vars taking precedence; `init` command adds commented template and ensures `.gitignore` protection

### Files Created
- .blueprint/features/feature_pipeline-telemetry/FEATURE_SPEC.md

### Open Questions
- Should the failed-send queue have a configurable max depth or a fixed cap (e.g., 50 entries)?
- Should `telemetry-config` offer a `--test` flag to ping the endpoint for connectivity verification?
- Should `init` emit a visible notice that `.env` was created, to improve discoverability?

### Critical Context
This feature is infrastructure-level and cross-cutting: it touches SKILL.md (Step 5 for runId, Step 12 for send), `src/init.js` (`.env` + `.gitignore`), `src/history.js` (store runId), and introduces two new files (`src/telemetry.js`, `src/commands/telemetry-config.js`). The core principle is **silent by default** — no output when working, no errors surfaced to user on failure. Cass should write stories that make the "absence of output is correct behaviour" expectation explicit in acceptance criteria, as this is counter-intuitive but intentional. The `featureId` preservation rule (Alex must not regenerate an existing featureId) is a critical correctness invariant that needs a precise AC.
