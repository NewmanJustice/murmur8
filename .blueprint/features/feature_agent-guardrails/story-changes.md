# Story Changes — refine-feature(agent-guardrails)

Date: 2026-08-18
Reason: Align guardrails with runtime lifecycle hooks (`on_LLM_start`, `on_LLM_END`).

## Affected stories

1. `story-pre-llm-pii-screening.md`
   - Added to cover `on_LLM_start` personal-data risk classification and `ALLOW`/`REVIEW`/`BLOCK` outcomes.
2. `story-prompt-injection-triage.md`
   - Added to cover `on_LLM_start` untrusted-instruction triage and ambiguity handling.
3. `story-llm-end-token-telemetry.md`
   - Added to cover `on_LLM_END` token-usage capture and telemetry-safe metadata handling.

## Unaffected stories

- `story-source-restrictions.md`
- `story-citation-requirements.md`
- `story-confidentiality.md`
- `story-escalation-protocol.md`

These remain valid and require no AC changes for this refinement.
