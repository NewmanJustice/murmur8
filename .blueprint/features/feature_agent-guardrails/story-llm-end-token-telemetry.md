Refined: 2026-08-18 — align runtime hook guardrails

# Story — Post-LLM Token Telemetry (`on_LLM_END`)

## User story

As a murmur8 user, I want `on_LLM_END` to capture token usage metadata so telemetry reflects real model usage without exposing raw prompt or response content.

---

## Context / scope

- Applies to runtime lifecycle event `on_LLM_END`
- Integrates with existing telemetry payload assembly in `src/telemetry.js`
- Must keep pipeline execution non-blocking if telemetry transport fails

---

## Acceptance criteria

**AC-1 — Usage metadata captured at end hook**
- Given a completed model call,
- When `on_LLM_END` runs,
- Then usage metadata is captured (model, input tokens, output tokens, total tokens, duration, stage correlation when available).

**AC-2 — Telemetry payload receives usage fields**
- Given `on_LLM_END` captured usage metadata,
- When telemetry payload is assembled,
- Then usage values are included in the run/stage telemetry structure.

**AC-3 — No content leakage in usage capture**
- Given telemetry usage capture runs,
- When telemetry records are written or sent,
- Then raw prompt and response body content are not included in usage fields.

**AC-4 — Partial metadata is handled safely**
- Given hook metadata is incomplete,
- When payload assembly occurs,
- Then telemetry records partial usage without throwing and without failing the pipeline run.

**AC-5 — Transport failure remains non-blocking**
- Given telemetry send fails,
- When the run completes,
- Then run status is not failed solely due to telemetry transport outcome.

---

## Out of scope

- Replacing current telemetry transport/retry design
- Billing policy or pricing-model changes
