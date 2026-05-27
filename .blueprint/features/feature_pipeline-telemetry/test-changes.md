# Test Changes — feature_pipeline-telemetry (Refinement)

## Summary

Four new regression tests added to `/workspaces/murmur8/agent-workflow/test/feature_pipeline-telemetry.test.js` to cover the gap where neither SKILL.md nor REFINE_SKILL.md actually invokes the `sendTelemetry` function from `src/telemetry.js`.

## New Tests

### T-PT-NEW-1: SKILL.md Step 12 references sendTelemetry (not just a comment)
- **File asserted:** `SKILL.md`
- **Assertion:** `/sendTelemetry\s*\(/` must match somewhere in the file (an actual function call, not prose)
- **Current state:** FAILS — Step 12 only calls `node bin/cli.js history record ...` with no telemetry send
- **Fix required:** Add a `sendTelemetry(payload, config)` call inside the Step 12 block

### T-PT-NEW-2: REFINE_SKILL.md Step 7 contains an actual sendTelemetry invocation (not just pseudocode)
- **File asserted:** `REFINE_SKILL.md`
- **Assertion:** `/sendTelemetry\s*\(/` must match somewhere in the file
- **Current state:** FAILS — Step 7 only calls `linkParentRun` and `buildRefinementPayload` but never sends
- **Fix required:** Add `sendTelemetry(payload, config)` call in the Step 7 code block

### T-PT-NEW-3: SKILL.md telemetry send step references MURMUR8_TELEMETRY_URL and MURMUR8_TELEMETRY_KEY
- **File asserted:** `SKILL.md`
- **Assertion:** Both string literals `MURMUR8_TELEMETRY_URL` and `MURMUR8_TELEMETRY_KEY` must appear
- **Current state:** FAILS — neither env var name appears anywhere in SKILL.md
- **Fix required:** Show `loadConfig` call (or equivalent) that reads both env vars in Step 12

### T-PT-NEW-4: REFINE_SKILL.md Step 7 telemetry payload includes type: "refinement"
- **File asserted:** `REFINE_SKILL.md`
- **Assertion:** `type: 'refinement'` or `type: "refinement"` must appear on a non-comment line
- **Current state:** FAILS — the string only appears in a `//` comment on line 217; not in an actual object literal
- **Fix required:** Include `type: 'refinement'` as a real property in the payload object passed to `sendTelemetry`

## Test IDs — No Collision

Existing test IDs:
- T-TA-1 through T-TA-6
- T-ID-1 through T-ID-5
- T-PS-1 through T-PS-8
- T-GC-1 through T-GC-5
- T-FQ-1 through T-FQ-6
- T-II-1 through T-II-5
- T-TC-1 through T-TC-6

New IDs `T-PT-NEW-1` through `T-PT-NEW-4` do not collide with any existing ID.

## Test Counts (after change)

| Status | Count |
|--------|-------|
| Total  | 45    |
| Pass   | 41    |
| Fail (intentional — gap tests) | 4 |

## Files Changed

- `test/feature_pipeline-telemetry.test.js` — appended new `describe` block at end of file
