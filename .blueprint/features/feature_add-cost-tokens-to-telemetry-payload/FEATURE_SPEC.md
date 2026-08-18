---
featureId: 83e762d8-74ab-4d93-8625-fbb611ffe3a8
---
# Feature Specification — Add Cost/Tokens to Telemetry Payload

## 1. Feature Intent
**Why this feature exists.**

- Telemetry currently sends run status/timing, but does not consistently include execution economics (cost/tokens) needed for operational analysis.
- Platform users need run-level and stage-level efficiency data in the same payload as status metadata.
- This keeps observability coherent with existing cost tracking (`src/cost.js`) and history usage, while preserving pipeline reliability.

> This feature reinforces SYSTEM_SPEC.md Section 8 (Observability) and Section 9 (Reliability: side-effects must not block pipeline completion).

---

## 2. Scope
### In Scope
- Update `/implement-feature` telemetry step (Step 12 in `.claude/commands/implement-feature.md` and `SKILL.md`) to include:
  - `commitHash`
  - `totalCost`
  - stage-level `cost` when available
  - stage-level `tokens` with `input`, `output`, and computed/explicit `total` when available
- Update `/refine-feature` telemetry step (Step 7 in `.claude/commands/refine-feature.md`) to include the same fields where available for executed stages.
- Ensure payload construction is explicit about optionality (include metrics only when available, never fabricate).
- Preserve existing non-blocking telemetry behavior: send failures never fail pipeline/refinement runs and remain queued for retry.

### Out of Scope
- Changing telemetry transport/retry mechanics in `src/telemetry.js`.
- Reworking how cost/tokens are calculated in `src/cost.js`.
- Backfilling old history entries.
- Introducing new mandatory telemetry fields beyond commit/cost/tokens.

---

## 3. Actors Involved

### Human User / Team Operator
- Can inspect downstream telemetry for commit/cost/token insights.
- Cannot rely on cost/token fields being always present for every stage (availability-dependent).

### Pipeline/Refinement Orchestrator (Skill scripts)
- Can enrich telemetry payloads with commit and economics metadata from available run context/history.
- Cannot block completion when telemetry send fails.

### Telemetry Module (`src/telemetry.js`)
- Can transmit enriched payloads and queue failed sends.
- Cannot enforce stage metric completeness.

---

## 4. Behaviour Overview

### Happy-path behaviour
1. Run completes (`/implement-feature` or `/refine-feature`).
2. Telemetry script builds payload with baseline run metadata plus commit/cost/tokens fields when available.
3. `sendTelemetry` posts payload.
4. Endpoint receives richer run analytics in a single event.

### Key alternatives/branches
- **Metrics unavailable:** Payload omits missing optional fields rather than sending invalid placeholders.
- **Partial stage data:** Include metrics only for stages with known values.
- **Send failure (HTTP/network):** Warning logged, payload queued, run remains successful/failed/paused based on pipeline outcome only.

### User-visible outcomes
- No behavior change in pipeline completion semantics.
- Telemetry warnings remain non-fatal and non-interactive.

---

## 5. State & Lifecycle Interactions

- **State modified:** Telemetry run object emitted at end-of-run now carries optional economics metadata.
- **State transition preserved:** `telemetry_sent` vs `telemetry_queued` behavior remains unchanged.
- **Feature type:** state-extending (payload schema extension), not state-constraining.

---

## 6. Rules & Decision Logic

### Rule 1 — Commit inclusion
- **Description:** Telemetry payload always includes the `run.commitHash` key for both implement and refine flows.
- **Inputs:** Commit creation outcome, hash resolution from run context, and refine flags.
- **Outputs:** `run.commitHash` is:
  - hash string when a commit was created and hash is resolvable (implement/refine commit path),
  - `null` when commit was not created or hash cannot be resolved in implement flow,
  - `null` for `/refine-feature --no-commit`.
- **Deterministic:** Yes.

### Rule 2 — Total cost inclusion
- **Description:** Include `run.totalCost` when run-level cost is available.
- **Inputs:** Existing run history/cost context.
- **Outputs:** `run.totalCost`.
- **Deterministic:** Yes.

### Rule 3 — Stage economics inclusion
- **Description:** For each included stage, include `cost` and `tokens` (`input`, `output`, `total`) when available.
- **Inputs:** Per-stage metrics in runtime/history context.
- **Outputs:** Enriched `run.stages[stage]` objects.
- **Deterministic:** Yes.

### Rule 3a — Stage metric source precedence
- **Description:** Stage metric sourcing uses strict precedence with explicit field paths to avoid ambiguity.
- **Inputs:** Runtime stage metrics and persisted history-entry stage data.
- **Outputs:** For each emitted stage:
  - primary source: `run.stages[stage].cost`, `run.stages[stage].tokens.input`, `run.stages[stage].tokens.output`, `run.stages[stage].tokens.total`;
  - fallback source (only when primary field is absent): `historyEntry.run.stages[stage].cost`, `historyEntry.run.stages[stage].tokens.input`, `historyEntry.run.stages[stage].tokens.output`, `historyEntry.run.stages[stage].tokens.total`;
  - if neither source provides optional economics subfields, emit the stage object with status/timing and omit unavailable optional subfields.
- **Deterministic:** Yes.

### Rule 3b — `tokens.total` normalization
- **Description:** `tokens.total` is normalized per stage: derive as `input + output` only when both `input` and `output` are present; preserve explicit `total` when present and consistent; recompute when present but inconsistent and both `input`/`output` exist; omit `total` when either `input` or `output` is missing.
- **Inputs:** `tokens.input`, `tokens.output`, optional `tokens.total`.
- **Outputs:** Valid `tokens.total` value or omission when inputs are unavailable.
- **Deterministic:** Yes.

### Rule 4 — Optional-field discipline
- **Description:** Missing metrics are omitted, not invented; payload remains valid with partial economics.
- **Inputs:** Metric presence checks.
- **Outputs:** Sparse-but-valid payload.
- **Deterministic:** Yes.

### Rule 5 — Non-blocking telemetry invariant
- **Description:** Telemetry send/enrichment errors do not fail run completion path.
- **Inputs:** Any telemetry error.
- **Outputs:** Warning/queue only; pipeline status unchanged.
- **Deterministic:** Yes.

---

## 7. Dependencies

- `.claude/commands/implement-feature.md` and `SKILL.md` Step 12 telemetry script.
- `.claude/commands/refine-feature.md` Step 7 telemetry script.
- `src/telemetry.js` payload forwarding semantics (`buildPayload`, optional run fields, `sendTelemetry`).
- `src/cost.js` and run history shape as source of cost/token semantics.

---

## 8. Non-Functional Considerations

- **Reliability:** Must preserve current non-blocking delivery and retry queue behavior.
- **Backward compatibility:** Endpoint must continue accepting payloads when some economics fields are absent.
- **Data quality:** Prefer omission over incorrect derived values; `tokens.total` should only be sent when known or safely computed from known input/output.
- **Performance:** Payload enrichment should be lightweight and end-of-run only.

---

## 9. Assumptions & Open Questions

### Assumptions
- Stage-level token/cost data may be present in runtime/history context for some or all stages.
- Current ingestion endpoint accepts optional `totalCost` and stage `cost/tokens` fields.
- Refine flows may have fewer stages; only executed stages should be emitted.

### Open Questions
- Should top-level aggregate token fields be added in future (`totalTokens`) or stay stage-scoped for now?

---

## 10. Impact on System Specification

- **Reinforces existing assumptions:** Observability grows in depth without changing agent boundaries or lifecycle sequence.
- **No contradiction identified:** Reliability invariant (non-blocking side effects) is preserved.
- **Minor extension suggested (not applied):** In SYSTEM_SPEC.md Section 8, clarify telemetry includes efficiency metrics (cost/tokens) in addition to timing/status.

---

## 11. Handover to BA (Cass)

### Story themes
1. Implement pipeline telemetry payload enrichment (commit + cost/tokens) for `/implement-feature`.
2. Mirror enrichment for `/refine-feature` with refinement-stage semantics.
3. Define optionality/partial-data behavior explicitly.
4. Protect non-blocking telemetry behavior during enrichment.

### Expected story boundaries
- Story 1: Implement-skill telemetry payload enrichment.
- Story 2: Refine-skill telemetry payload enrichment.
- Story 3: Validation scenarios for missing/partial metrics + non-blocking behavior.

### Areas needing careful story framing
- Distinguish “required by this feature” from “always available at runtime.”
- Ensure ACs verify no pipeline failure on telemetry issues.
- Ensure ACs cover both commit-present and commit-absent paths.

---

## 12. Acceptance Criteria (Verifiable)
1. **Commit hash policy across implement/refine:** Telemetry always includes the `run.commitHash` key; implement emits a hash only when commit is created and resolvable (otherwise `null`), and `/refine-feature --no-commit` emits `null`.
2. **`tokens.total` rule enforced:** For each stage payload:
   - if `tokens.total` is absent and both `input` + `output` exist, emitted `total` equals `input + output`;
   - if explicit `total` is present and equals `input + output`, value is preserved;
   - if explicit `total` conflicts with `input + output` (and both exist), emitted `total` is recomputed to `input + output`;
   - if either `input` or `output` is missing, emitted `total` is omitted.
3. **Endpoint compatibility (run-level optional fields):** Telemetry endpoint accepts payloads with and without `run.totalCost` and records no schema/validation failure in either case, verified locally using existing telemetry delivery tests with mocked HTTP server assertions on request-body schema.
4. **Endpoint compatibility (stage-level optional/partial fields):** Telemetry endpoint accepts stage objects containing any valid partial combination of `cost` and `tokens` subfields (including only `cost`, only `tokens.input`, only `tokens.output`, `tokens.input`+`tokens.output` with derived/normalized `tokens.total`, or full tokens object) without rejecting the payload; `tokens.total`-only payloads are not emitted, verified locally using existing telemetry delivery tests with mocked HTTP server assertions on request-body schema.
5. **Non-blocking invariant preserved:** If telemetry send fails for any payload shape above, run outcome remains governed only by pipeline/refinement execution and telemetry is queued/retried per existing behavior.

---

## 13. Change Log (Feature-Level)
| Date | Change | Reason | Raised By |
|-----|------|--------|-----------|
| 2026-08-18 | Initial spec for telemetry payload enrichment with commit/cost/tokens | Improve observability quality without affecting run reliability | Alex |
