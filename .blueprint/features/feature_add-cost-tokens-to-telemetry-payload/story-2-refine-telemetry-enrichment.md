# Story 2: Enrich `/refine-feature` Telemetry Payload with Commit and Economics

## User Story
As a team operator, I want `/refine-feature` telemetry to mirror commit/cost/token enrichment so refinement runs are observable with the same efficiency detail as implement runs.

## Acceptance Criteria
1. Given a refine run finishes, when telemetry payload is assembled in Step 7 (`.claude/commands/refine-feature.md`), then `run.commitHash` key is always present.
2. Given refine runs with commit enabled and hash resolution succeeds, when payload is emitted, then `run.commitHash` is the resolved hash string.
3. Given refine runs with `--no-commit`, when payload is emitted, then `run.commitHash` is `null`.
4. Given refine runs with commit enabled but hash resolution fails, when payload is emitted, then `run.commitHash` is `null` and telemetry emission proceeds without failing the run.
5. Given run-level cost is available in refine context, when payload is emitted, then `run.totalCost` is present and numeric; and when unavailable, `run.totalCost` is omitted.
6. Given refine executes a subset of stages, when payload is emitted, then only executed stages are included and each retained stage keeps its status/timing fields.
7. Given stage economics are available for refine stages, when payload is assembled, then `cost`/`tokens` fields follow runtime-first then history fallback precedence per stage field.
