# Test Specification — add-cost-tokens-to-telemetry-payload

## Understanding
This feature enriches telemetry payloads emitted by `/implement-feature` and `/refine-feature`.
The payload must always include `run.commitHash` key with value string or `null`.
`run.totalCost` is optional: include only when known and numeric.
Per-stage economics (`cost`, `tokens`) are optional and must not alter existing stage status/timing fields.
When both runtime and history economics exist, runtime values win; history is fallback only for absent runtime fields.
Token normalization is deterministic: derive or recompute `tokens.total` from `input + output` when both are present.
`tokens.total` must be omitted when either input or output is missing, and must never appear alone.
Compatibility with existing telemetry endpoint behavior must remain intact for partial economics shapes.
Telemetry send failures must remain non-blocking and preserve existing queue/retry behavior.

## AC → Test ID Mapping

| Story | AC | Test ID | Deterministic externally observable scenario |
|---|---|---|---|
| S1 implement enrichment | AC1 | T-IMP-1 | Emitted payload always has `run.commitHash` key |
| S1 implement enrichment | AC2 | T-IMP-2 | commit created+resolved => hash string; no commit or resolve fail => `null` |
| S1 implement enrichment | AC3 | T-IMP-3 | known run cost => numeric `run.totalCost`; unknown => field omitted |
| S1 implement enrichment | AC4 | T-IMP-4 | stage keeps status/timing; includes only available economics subfields |
| S1 implement enrichment | AC5 | T-IMP-5 | stage economics source precedence is runtime first, history fallback |
| S2 refine enrichment | AC1 | T-REF-1 | refine payload always has `run.commitHash` key |
| S2 refine enrichment | AC2 | T-REF-2 | commit enabled + resolve success => hash string |
| S2 refine enrichment | AC3 | T-REF-3 | `--no-commit` => `run.commitHash: null` |
| S2 refine enrichment | AC4 | T-REF-4 | commit resolve failure => `null`; run still completes successfully |
| S2 refine enrichment | AC5 | T-REF-5 | known refine run cost included; unknown omitted |
| S2 refine enrichment | AC6 | T-REF-6 | only executed refine stages appear; each retains status/timing |
| S2 refine enrichment | AC7 | T-REF-7 | refine stage economics also follows runtime-first precedence |
| S3 normalization | AC1 | T-NRM-1 | normalization occurs at payload assembly boundaries only |
| S3 normalization | AC2 | T-NRM-2 | input+output present, total absent => emitted total equals sum |
| S3 normalization | AC3 | T-NRM-3 | consistent explicit total preserved |
| S3 normalization | AC4 | T-NRM-4 | inconsistent explicit total recomputed to sum |
| S3 normalization | AC5 | T-NRM-5 | missing input/output => total omitted |
| S3 normalization | AC6 | T-NRM-6 | never emit `tokens.total`-only object; omit missing economics fields |
| S4 regression safety | AC1 | T-REG-1 | endpoint accepts payloads both with and without `run.totalCost` |
| S4 regression safety | AC2 | T-REG-2 | endpoint accepts valid partial stage economics combinations |
| S4 regression safety | AC3 | T-REG-3 | telemetry send failure does not change final run/refine outcome |
| S4 regression safety | AC4 | T-REG-4 | on send failure, warning/queue and retry state remain active |
| S4 regression safety | AC5 | T-REG-5 | transport/retry behavior remains equivalent to existing flow |

## Assumptions (Explicit)
- Assumption A1: Test coverage is implemented by extending existing telemetry delivery tests with mocked HTTP assertions rather than introducing a new transport layer.
- Assumption A2: Commit hash resolution failure is simulated deterministically (stubbed git hash lookup throws/returns empty) and expected output is `run.commitHash: null`.
- Assumption A3: "Runtime field absent" means `undefined`/missing key; fallback to history is not used when runtime field is present but falsy-valid (e.g., `0`).
- Assumption A4: Numeric validation for cost/tokens accepts JavaScript numbers only; non-number values are treated as unavailable and omitted.
- Assumption A5: "Telemetry run proceeds" is asserted by unchanged command exit status/history run status despite send failure.
