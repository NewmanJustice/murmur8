## Handoff Summary
**For:** Cass
**Feature:** add-cost-tokens-to-telemetry-payload

### Key Decisions
- Enrich telemetry payloads for both `/implement-feature` and `/refine-feature` with `commitHash`, `totalCost`, and stage `cost` + `tokens` (`input/output/total`) when available.
- Commit policy fixed and unambiguous across flows: always include `run.commitHash` key; implement emits hash only when commit created + resolvable else `null`; refine `--no-commit` emits `null`.
- Treat economics fields as optional-by-availability: include when known, omit when missing (except explicit `commitHash: null` case above).
- `tokens.total` normalization is mandatory per stage: derive from `input+output` only when both exist, preserve explicit consistent totals, recompute inconsistent totals when both exist, and omit `total` when either side is missing (no `tokens.total`-only payloads).
- Stage metric precedence fixed with explicit paths: prefer runtime `run.stages[stage].cost|tokens.*`, fallback to `historyEntry.run.stages[stage].cost|tokens.*` only when runtime fields are absent; if neither exists omit optional economics subfields while keeping stage status/timing.
- Keep enrichment confined to telemetry script payload assembly in skill command docs; no transport/retry redesign.
- Preserve non-blocking telemetry invariant: send failures warn/queue only and never alter pipeline/refinement completion status.

### Files Created
- .blueprint/features/feature_add-cost-tokens-to-telemetry-payload/FEATURE_SPEC.md

### Acceptance Focus for Stories
- Verify endpoint compatibility ACs locally via existing telemetry delivery tests using mocked HTTP server assertions on request-body schema.
- Verify telemetry failures remain non-blocking and are queued per existing behavior.

### Critical Context
Cass should frame stories around two flows (implement vs refine) plus shared reliability constraints. Stories should bind to Step 12 (`implement-feature`/`SKILL.md`) and Step 7 (`refine-feature`) telemetry scripts, since those are the integration points.
