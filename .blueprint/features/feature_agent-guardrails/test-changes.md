# Test Changes — refine-feature(agent-guardrails)

Date: 2026-08-18

## Scope reviewed
Per `.blueprint/features/feature_agent-guardrails/story-changes.md`, only these refined stories required test updates:
- `story-pre-llm-pii-screening.md`
- `story-prompt-injection-triage.md`
- `story-llm-end-token-telemetry.md`

No changes were made to tests for unaffected stories (source restrictions, citation requirements, confidentiality, escalation protocol).

## Updated file
- `test/feature_agent-guardrails.test.js`

## What changed
Added three new describe blocks with focused coverage for runtime-hook guardrail refinements:

1. **Pre-LLM PII Screening Guardrails**
   - `T-PII-1.1`: verifies `on_LLM_start` pre-send PII screening is defined.
   - `T-PII-2.1`: verifies `ALLOW`/`REVIEW`/`BLOCK` decision contract is defined.
   - `T-PII-3.1`: verifies prohibition on raw sensitive-value leakage in logs/errors/telemetry/queue artifacts.
   - `T-PII-4.1`: verifies deterministic decision expectations for identical inputs.

2. **Prompt-Injection Triage Guardrails**
   - `T-PIT-1.1`: verifies blocking guidance for high-confidence untrusted exfiltration/control-bypass directives.
   - `T-PIT-2.1`: verifies ambiguous suspicious patterns are reviewable with reason/evidence framing.
   - `T-PIT-3.1`: verifies defensive quoted-analysis context is not treated as automatic malicious proof.
   - `T-PIT-4.1`: verifies trust hierarchy and independent downstream permission checks are preserved.

3. **Post-LLM Token Telemetry Guardrails**
   - `T-TEL-1.1`: verifies `on_LLM_END` usage capture fields are defined.
   - `T-TEL-2.1`: verifies telemetry payload assembly includes usage metadata expectations.
   - `T-TEL-3.1`: verifies usage capture excludes raw prompt/response body content.
   - `T-TEL-4.1`: verifies partial metadata handling is graceful and telemetry failures are non-blocking.

## ID collision check
New IDs are in new namespaces (`T-PII-*`, `T-PIT-*`, `T-TEL-*`) and do not collide with existing IDs (`T-SR-*`, `T-CR-*`, `T-CF-*`, `T-EP-*`, `T-GP-*`).

## Determinism notes
Tests remain deterministic string-presence checks over repository files and are runnable with `node --test`.
