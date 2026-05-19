## Handoff Summary
**For:** Codey
**Feature:** pipeline-telemetry

### Key Decisions
- Tests are self-contained: all helper functions (loadConfig, buildPayload, compressArtifact, etc.) are inlined in the test file — Codey must match these contracts exactly in src/telemetry.js
- HTTP is never called in tests; send behaviour is validated via contract (headers, payload shape, silence on success)
- Queue capped at 50 entries; overflow drops oldest
- Queue cleanup on full success: write `[]` (not delete file)
- All 7 story ambiguities resolved in test-spec.md assumptions

### Files Created
- test/artifacts/feature_pipeline-telemetry/test-spec.md
- test/feature_pipeline-telemetry.test.js

### Open Questions
- None

### Critical Context
Tests define the contracts Codey must implement. Key exported functions expected from src/telemetry.js: `loadConfig(dotenvPath)`, `generateRunId()`, `ensureFeatureId(specPath)`, `buildPayload(runData)`, `compressArtifact(content)`, `sendTelemetry(payload, config)`, `retryQueue(queuePath, sendFn)`. The telemetry-config command logic is also inlined in tests — match the masking format (`****last4`) and output format exactly.
