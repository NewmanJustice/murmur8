## Handoff Summary
**For:** Codey  
**Feature:** add-cost-tokens-to-telemetry-payload

### Test Artifacts Created
- `test/artifacts/feature_add-cost-tokens-to-telemetry-payload/test-spec.md`

### Key Contracts to Implement
- Always emit `run.commitHash` key for implement/refine payloads (`string` on success, `null` otherwise).
- Include `run.totalCost` only when known numeric; omit when unavailable.
- Preserve stage status/timing fields while adding only available economics fields.
- Apply runtime-first, history-fallback precedence per stage economics field.
- Normalize `tokens.total` deterministically from `input + output` rules; never emit `tokens.total` alone.
- Keep telemetry transport/retry behavior non-blocking and behaviorally unchanged.

### Critical Regression Expectations
- Existing mocked telemetry endpoint tests must accept partial economics payloads.
- Telemetry failure must not alter pipeline/refinement completion status.
- Queue/retry warning/state behavior remains active under failure paths.

### Open Questions
- None.
