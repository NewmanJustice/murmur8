Refined: 2026-08-18 — align runtime hook guardrails

# Story — Prompt-Injection Triage (`on_LLM_start`)

## User story

As a murmur8 user, I want `on_LLM_start` to triage untrusted instruction-like content so that malicious prompt-injection attempts are blocked while legitimate defensive analysis remains possible.

---

## Context / scope

- Applies to pre-send model context checks at `on_LLM_start`
- Detection is a risk signal and does not replace downstream permission checks
- Uses the shared `ALLOW`/`BLOCK`/`REVIEW` decision contract

---

## Acceptance criteria

**AC-1 — Untrusted exfiltration directives are blocked**
- Given untrusted context instructs credential disclosure, workspace escape, or control bypass,
- When `on_LLM_start` evaluates the payload,
- Then the decision is `BLOCK` and the call is prevented.

**AC-2 — Ambiguous suspicious content is reviewable**
- Given untrusted context contains suspicious but context-dependent instruction-like patterns,
- When `on_LLM_start` evaluates the payload,
- Then the decision is `REVIEW` with reason code and redacted evidence.

**AC-3 — Defensive quoted examples are not auto-blocked**
- Given payload text quotes prompt-injection examples for defensive analysis or testing,
- When `on_LLM_start` evaluates the payload,
- Then the content is not automatically treated as malicious solely due to pattern matching.

**AC-4 — Trust hierarchy is preserved**
- Given content comes from external/retrieved sources,
- When it is included in model context,
- Then it is treated as untrusted data and not promoted into higher-priority instructions.

**AC-5 — Independent action controls remain required**
- Given `on_LLM_start` returns `ALLOW`,
- When later tool or external actions are requested,
- Then those actions still require their own permission evaluation.

---

## Out of scope

- Building an external classifier service
- Full external enforcement gateway implementation
