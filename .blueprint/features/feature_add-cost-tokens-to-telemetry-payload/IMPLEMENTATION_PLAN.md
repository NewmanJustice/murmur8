# Implementation Plan — add-cost-tokens-to-telemetry-payload

## Summary
Implement telemetry payload enrichment in existing payload assembly and skill telemetry blocks, then extend existing telemetry tests to cover commit hash presence, optional cost/tokens fields, normalization, and non-blocking failure behavior.

## Steps
1. [src/telemetry.js] MODIFY — add stage-economics normalization helpers that keep runtime-first precedence, fallback to history for missing fields, recompute tokens.total from input+output, and omit invalid/partial token shapes | Tests: T-IMP-5, T-REF-7, T-NRM-2, T-NRM-4, T-NRM-5, T-NRM-6
2. [src/telemetry.js] MODIFY — update buildPayload to always emit run.commitHash (string or null), include run.totalCost only when numeric, and preserve existing stage status/timing data while adding optional economics fields only when valid | Tests: T-IMP-1, T-IMP-2, T-IMP-3, T-IMP-4, T-REF-1, T-REF-5
3. [.claude/commands/implement-feature.md] MODIFY — update telemetry assembly block to pass explicit commitHash null fallback, guard totalCost numeric inclusion, and provide runtime+history stage economics inputs into buildPayload | Tests: T-IMP-1, T-IMP-2, T-IMP-3, T-IMP-4, T-IMP-5
4. [SKILL.md] MODIFY — mirror implement telemetry block changes so Copilot and Claude command specs stay behaviorally identical for commitHash, totalCost, and stage economics rules | Tests: T-IMP-1, T-IMP-3, T-IMP-5, T-NRM-2
5. [.claude/commands/refine-feature.md] MODIFY — update refine telemetry assembly to always set commitHash key (null on no-commit/resolve failure), include optional numeric totalCost, and emit only executed stages with optional normalized economics | Tests: T-REF-1, T-REF-2, T-REF-3, T-REF-4, T-REF-5, T-REF-6, T-REF-7
6. [test/feature_add-cost-tokens-to-telemetry-payload.test.js] MODIFY — finalize/adjust payload and template assertions for commitHash key presence, totalCost optionality, runtime-first fallback, and tokens.total normalization/omission behavior | Tests: T-IMP-1, T-IMP-5, T-REF-7, T-NRM-1, T-NRM-2, T-NRM-3, T-NRM-4, T-NRM-5, T-NRM-6
7. [test/feature_pipeline-telemetry.test.js] MODIFY — extend endpoint payload compatibility assertions for optional run.totalCost and valid partial stage economics combinations | Tests: T-REG-1, T-REG-2
8. [test/feature_telemetry-delivery-visibility.test.js] MODIFY — keep transport failure path non-blocking and verify queue/retry signaling remains unchanged when telemetry send fails | Tests: T-REG-3, T-REG-4, T-REG-5

## Validation
- node --test test/feature_add-cost-tokens-to-telemetry-payload.test.js
- node --test test/feature_pipeline-telemetry.test.js test/feature_telemetry-delivery-visibility.test.js
