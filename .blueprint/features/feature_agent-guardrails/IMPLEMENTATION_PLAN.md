# Implementation Plan — Agent Guardrails (Runtime Hook Refinement)

## Summary

Expand guardrails from documentation-only policy into runtime lifecycle behaviour:

1. `on_LLM_start`: pre-send PII classification and prompt-injection triage
2. `on_LLM_END`: post-send usage capture for telemetry
3. Keep existing source/citation/confidentiality/escalation guardrails intact

This plan assumes in-process, dependency-free implementation and tests under `node --test`.

---

## Files to Create/Modify

| Path | Action | Purpose |
|------|--------|---------|
| `src/guardrails.js` (or equivalent module) | Create/Modify | Central decision logic for pre-LLM PII and prompt-injection checks |
| `src/telemetry.js` | Modify | Accept and persist usage metadata from post-LLM hook without storing prompt/response content |
| Runtime integration points around model invocation | Modify | Wire `on_LLM_start` and `on_LLM_END` checks into existing call flow |
| `.blueprint/agents/AGENT_*.md` | Modify | Keep behavioural guardrail instructions aligned with runtime decisions |
| `test/feature_agent-guardrails*.test.js` | Create/Modify | Add deterministic tests for start-hook decisions and end-hook telemetry capture |

---

## Implementation Steps

1. **Identify hook surfaces** where model calls start/end in the current pipeline integration.

2. **Implement `on_LLM_start` guard entrypoint** with shared decision object:
   - `decision`: `ALLOW` | `BLOCK` | `REVIEW`
   - `reasonCode`
   - `message`
   - `policyVersion`
   - `evidence` (redacted only)

3. **Add PII classification policy**:
   - ordinary identifiers → `ALLOW` when task-necessary and minimised
   - ambiguous sensitive/bulk personal data → `REVIEW`
   - clear unauthorised sensitive disclosure → `BLOCK`

4. **Add prompt-injection triage policy**:
   - treat external/retrieved content as untrusted by default
   - high-confidence exfiltration/override/disable-control directives → `BLOCK`
   - contextual/quoted defensive examples → `REVIEW` (not automatic `BLOCK`)

5. **Implement `on_LLM_END` usage capture**:
   - collect model name, input/output tokens, total tokens, duration, stage correlation
   - do not persist raw prompt/response text as part of this capture path

6. **Wire usage into telemetry payload assembly** with graceful degradation:
   - partial usage metadata is allowed
   - telemetry capture/transport failures do not fail the pipeline run

7. **Update agent-spec guardrail language** so behavioural instructions and runtime checks stay consistent.

8. **Add targeted tests** for deterministic start-hook and end-hook outcomes:
   - PII category cases (ordinary/sensitive/bulk)
   - prompt-injection cases (malicious vs quoted defensive text)
   - "never leak matched value" assertions
   - token usage capture with complete and partial metadata

---

## Risks/Questions

- **Hook mapping risk**: Exact hook names differ by framework integration; adapter layer may be required.
- **False positive tuning**: Prompt-injection and PII heuristics need careful thresholds to avoid over-blocking normal work.
- **Telemetry schema drift**: Existing run schema may require extension for per-call usage while preserving backward compatibility.
