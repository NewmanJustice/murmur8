Refined: 2026-08-18 — align runtime hook guardrails

# Story — Pre-LLM PII Screening (`on_LLM_start`)

## User story

As a murmur8 user, I want outbound LLM context screened for personal-data risk at `on_LLM_start` so that clearly unauthorised sensitive data is blocked before transmission.

---

## Context / scope

- Tied to `feature_agent-guardrails` runtime refinement rules for `on_LLM_start`
- Decision model uses `ALLOW`, `BLOCK`, `REVIEW` with stable reason codes
- In-process and dependency-free; testable under `node --test`

---

## Acceptance criteria

**AC-1 — Ordinary identifiers can pass when necessary**
- Given outbound context includes ordinary identifiers needed for the task,
- When `on_LLM_start` evaluates the payload,
- Then the decision is `ALLOW` and evidence is redacted.

**AC-2 — Ambiguous sensitive or bulk data is reviewable**
- Given outbound context includes sensitive or bulk personal-data indicators with ambiguous legitimacy,
- When `on_LLM_start` evaluates the payload,
- Then the decision is `REVIEW` with a reason code and redacted location metadata.

**AC-3 — Clear unauthorised sensitive disclosure is blocked**
- Given outbound context includes clearly unauthorised highly sensitive personal data,
- When `on_LLM_start` evaluates the payload,
- Then the decision is `BLOCK` and the model call does not proceed.

**AC-4 — No raw values are disclosed**
- Given PII is detected at `on_LLM_start`,
- When the system records decision details,
- Then raw matched values are never written to logs, errors, telemetry evidence, or queue files.

**AC-5 — Deterministic outcomes**
- Given identical payload and policy configuration,
- When `on_LLM_start` is executed multiple times,
- Then the same decision and reason code are returned each time.

---

## Out of scope

- Perfect detection coverage for all PII formats
- External DLP service integration
