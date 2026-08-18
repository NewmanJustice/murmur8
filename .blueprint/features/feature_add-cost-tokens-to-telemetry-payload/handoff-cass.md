## Handoff Summary
**From:** Cass  
**To:** Nigel  
**Feature:** add-cost-tokens-to-telemetry-payload

### Stories Created
1. `story-1-implement-telemetry-enrichment.md`
2. `story-2-refine-telemetry-enrichment.md`
3. `story-3-normalization-and-optionality.md`
4. `story-4-regression-safety.md`

### Test Design Focus
- Validate `run.commitHash` key is always present in both flows, with hash/null behavior by commit path.
- Include refine edge case where commit is enabled but hash resolution fails: `run.commitHash` must be `null` and run must proceed.
- Validate optional `run.totalCost` inclusion (present when known, omitted when unknown).
- Validate stage economics source precedence (runtime field first, history fallback only if absent).
- Validate `tokens.total` normalization matrix: derive, preserve, recompute, and omit cases.
- Assert no `tokens.total`-only stage tokens payload is emitted.
- Verify endpoint compatibility for partial economics payloads using existing telemetry delivery tests + mocked HTTP server assertions.
- Verify telemetry failure remains non-blocking and queued/retried without changing run outcome.

### Constraints Carried Forward
- Enrichment/normalization is limited to telemetry payload assembly points (implement Step 12, refine Step 7).
- Transport/retry mechanics are not to be redesigned in this feature.
