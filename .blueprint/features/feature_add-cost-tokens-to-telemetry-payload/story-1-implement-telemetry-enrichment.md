# Story 1: Enrich `/implement-feature` Telemetry Payload with Commit and Economics

## User Story
As a team operator, I want `/implement-feature` telemetry to include commit, cost, and token metadata so I can analyze pipeline efficiency from a single run event.

## Acceptance Criteria
1. Given an implement run finishes, when telemetry payload is assembled in Step 12 (`.claude/commands/implement-feature.md` and `SKILL.md`), then `run.commitHash` key is always present.
2. Given a commit is created and hash resolution succeeds, when payload is emitted, then `run.commitHash` equals the resolved git hash string; and given commit is not created or hash resolution fails, `run.commitHash` equals `null`.
3. Given run-level cost is available, when payload is emitted, then `run.totalCost` is present and numeric; and when unavailable, `run.totalCost` is omitted.
4. Given a stage exists in `run.stages`, when stage economics are available for that stage, then that stage includes only the available `cost` and `tokens` subfields while retaining existing stage status/timing fields; and when stage economics are unavailable, no `cost` or `tokens` subfields are added.
5. Given both runtime and history stage economics exist, when payload is assembled, then values are sourced from `run.stages[stage]` first and only fallback to `historyEntry.run.stages[stage]` when the runtime field is absent.
