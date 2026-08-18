---
featureId: 5458f7f0-33c0-4160-a6fe-779486dd53c4
---
# Feature Specification — Agent Guardrails (Runtime Hook Refinement)

## 1. Feature Intent

**Why this feature exists.**

The murmur8 framework relies on four AI agents (Alex, Cass, Nigel, Codey) operating autonomously within a pipeline. Without explicit guardrails, these agents may:

- Generate content based on training data rather than provided inputs
- Reference external sources (social media, forums, web content) that are unreliable or inappropriate
- Expose confidential business context in outputs
- Produce non-deterministic or hallucinated content that cannot be traced to authoritative sources
- Send LLM context that includes personal data or prompt-injection payloads without pre-send triage
- Miss usage telemetry if post-call hook data is not captured reliably

**Problem being addressed:**
The current guardrails are documentation-only and do not specify lifecycle checks around model-call boundaries. We need concrete controls at `on_LLM_start` (pre-send safety) and `on_LLM_END` (usage telemetry capture), while keeping existing citation/confidentiality guardrails.

**User need:**
Users need confidence that agent outputs are grounded exclusively in provided inputs and that model interactions are screened for PII and prompt-injection risk before egress, with token usage captured after completion for telemetry.

**System purpose alignment:**
Per `.blueprint/system_specification/SYSTEM_SPEC.md`: "What must not be compromised: Explicit specification before implementation" and "All artifacts (specs, stories, tests, code) are aligned and consistent." This refinement also aligns with existing telemetry and runtime-security direction by making pre-LLM and post-LLM decisions explicit and testable in-process.

---

## 2. Scope

### In Scope

- **Source restrictions**: Rules governing what information sources agents may and may not use
- **Grounding requirements**: Citation and traceability standards for all agent assertions
- **Confidentiality constraints**: Rules for protecting `.business_context/` content and preventing data leakage
- **Determinism expectations**: Standards for reproducible, consistent agent behaviour
- **Escalation protocols**: Clear rules for when agents must stop and ask the user
- **Anti-hallucination measures**: Explicit preference for "I don't have this information" over guessing
- **`on_LLM_start` controls**: pre-send PII classification and prompt-injection triage of outbound LLM context
- **`on_LLM_END` controls**: capture and persist token usage and model metadata for telemetry payload assembly

### Out of Scope

- External security control plane, model gateway, or network egress infrastructure
- Third-party DLP/classifier services (this slice remains dependency-free and in-process)
- Enforcement claims beyond murmur8's own runtime hooks
- Changes to the pipeline flow or agent sequencing
- Telemetry transport semantics (send/retry/queue behaviour remains in `src/telemetry.js`)

---

## 3. Actors Involved

### Alex (System Specification & Chief-of-Staff)
- **What they can do**: Define system and feature specifications grounded in provided inputs; cite sources for all assertions; flag missing information
- **What they cannot do**: Use external sources; invent business rules not found in inputs; expose confidential context in specifications

### Cass (Story Writer & Business Analyst)
- **What they can do**: Translate specifications into user stories citing the feature spec; make explicit assumptions when information is missing
- **What they cannot do**: Reference external examples or implementations; introduce behaviour not derived from specifications

### Nigel (Tester)
- **What they can do**: Create tests based on user stories and acceptance criteria; note assumptions explicitly
- **What they cannot do**: Use external testing patterns without attribution; invent requirements beyond what stories specify

### Codey (Developer)
- **What they can do**: Implement against tests and specifications; make implementation assumptions explicit
- **What they cannot do**: Use code from external sources without flagging; modify behaviour beyond what tests require

### Human User
- **What they can do**: Provide source materials; respond to escalations; approve assumptions
- **What they cannot do**: N/A (human user is the authority)

### Runtime Hook Adapter (`on_LLM_start` / `on_LLM_END`)
- **What it can do**: Evaluate context and policy metadata before model invocation; collect usage metadata after completion; emit deterministic decision objects
- **What it cannot do**: Replace external enforcement layers or guarantee complete detection of all PII/prompt-injection patterns

### Telemetry Module
- **What it can do**: Build and send payloads with run metadata, including token-usage fields from hook output
- **What it cannot do**: Block a pipeline run due to telemetry transport failure

---

## 4. Behaviour Overview

**Happy-path behaviour:**

1. Agent receives task with explicit inputs (specs, stories, tests, code, business_context)
2. Agent processes ONLY the provided inputs to produce outputs
3. Agent cites sources for all assertions using standard format: "Per [filename]: [claim]" or "[filename:section] states..."
4. Agent flags any gaps or assumptions explicitly rather than filling them silently
5. Agent produces self-contained outputs that do not leak confidential context
6. `on_LLM_start` evaluates outbound context for PII and prompt-injection risk
7. If risk is clear and unauthorised, model call is blocked with reason code and redacted evidence
8. `on_LLM_END` captures usage metadata (input/output tokens and timing) and forwards it to telemetry assembly
9. Given identical inputs and policy config, decisions are consistent across runs

**Key alternatives or branches:**

- **Missing information path**: When required information is not in provided inputs, agent explicitly states "This information is not available in the provided inputs" and either (a) makes an explicit assumption labelled as such, or (b) escalates to the user
- **Ambiguity path**: When inputs are ambiguous, agent lists possible interpretations and asks the user to clarify
- **Confidentiality conflict path**: When an output would require exposing confidential context, agent flags this and asks for guidance
- **PII ambiguity path (`on_LLM_start`)**: ordinary identifiers needed for task can proceed; ambiguous sensitive/bulk personal data returns `REVIEW`; clear unauthorised sensitive disclosure returns `BLOCK`
- **Prompt-injection path (`on_LLM_start`)**: high-confidence untrusted instruction to exfiltrate secrets, disable controls, or force unauthorised side effects returns `BLOCK`; contextual/quoted cases return `REVIEW`
- **Post-call telemetry path (`on_LLM_END`)**: missing usage fields are recorded as partial telemetry metadata without failing the run

**User-visible outcomes:**

- All agent outputs contain traceable citations to source files
- Assumptions are explicitly labelled and distinguishable from facts
- Outputs are self-contained and do not reference confidential details by name
- Model-call starts include deterministic pre-send safety decisions
- Model-call ends contribute token usage to telemetry payloads
- Re-running with identical inputs and policy config produces consistent decisions

---

## 5. State & Lifecycle Interactions

This feature is **state-constraining** rather than state-creating or state-transitioning.

**States affected:**
- All pipeline stages (alex, cass, nigel, codey-plan, codey-implement) are constrained by guardrails
- Guardrails apply regardless of whether a feature is pending, in_progress, or being resumed
- LLM lifecycle boundaries are explicitly constrained at pre-call (`on_LLM_start`) and post-call (`on_LLM_END`)

**No new states introduced:**
The feature adds behavioural constraints to existing states without modifying the state model defined in `.blueprint/system_specification/SYSTEM_SPEC.md` section 6.

---

## 6. Rules & Decision Logic

### Rule 1: Source Restriction Rule

**Description:** Agents must use ONLY information from explicitly provided inputs.

**Inputs:** Task context, file references, `.business_context/` directory contents

**Outputs:** Agent output grounded exclusively in provided inputs

**Deterministic:** Yes

**Allowed sources:**
- System specification (`.blueprint/system_specification/SYSTEM_SPEC.md`)
- Feature specifications (`.blueprint/features/*/FEATURE_SPEC.md`)
- User stories (`story-*.md`)
- Test artifacts (`test-spec.md`, `*.test.js`)
- Implementation code in the project
- Business context (`.business_context/*`)
- Templates (`.blueprint/templates/*`)
- Agent specifications (`.blueprint/agents/AGENT_*.md`)

**Prohibited sources:**
- Social media (Twitter/X, Reddit, LinkedIn, Facebook, etc.)
- Forums, blog posts, or user-generated web content
- Web searches or external APIs
- Training data for domain-specific facts
- External project implementations or company references

---

### Rule 2: Citation Rule

**Description:** All assertions about requirements, behaviour, or domain knowledge must cite their source.

**Inputs:** Agent assertions about the system or domain

**Outputs:** Assertion with citation in format: "Per [filename]: [claim]" or "[filename:section] states..."

**Deterministic:** Yes

**Examples:**
- "Per FEATURE_SPEC.md: Users must authenticate before accessing the dashboard"
- "Per story-login.md:AC-3: Failed login attempts are logged"
- ".business_context/glossary.md defines 'tenant' as..."

---

### Rule 3: Confidentiality Rule

**Description:** Agents must treat `.business_context/` content as confidential and prevent data leakage.

**Inputs:** Any content from `.business_context/` directory

**Outputs:** Outputs that do not expose confidential details

**Deterministic:** Yes

**Constraints:**
- Do not reference external projects, companies, or implementations by name
- Do not use external services that would expose project data
- Output artifacts should be self-contained
- Generic descriptions preferred over specific confidential details

---

### Rule 4: Assumption Declaration Rule

**Description:** When information is not available in provided inputs, agents must explicitly declare assumptions.

**Inputs:** Gap in provided information

**Outputs:** Explicit assumption statement labelled as such

**Deterministic:** Yes

**Format:**
- "ASSUMPTION: [statement] - This is not specified in the provided inputs"
- "NOTE: Assuming [X] in absence of explicit guidance"

---

### Rule 5: Escalation Rule

**Description:** Agents must escalate to the user under defined conditions rather than proceeding with guesses.

**Inputs:** Trigger conditions (listed below)

**Outputs:** Escalation request to user

**Deterministic:** Yes

**Escalation triggers:**
- Information required for the task is not in provided inputs AND cannot be safely assumed
- Ambiguity in inputs that significantly affects output
- Conflict between different input sources
- Request would require violating confidentiality constraints
- Uncertainty that could lead to material misalignment

---

### Rule 6: Determinism Rule

**Description:** Same inputs should produce consistent outputs across runs.

**Inputs:** Identical task context and input files

**Outputs:** Consistent agent outputs

**Deterministic:** Yes (by definition)

**Implications:**
- Avoid incorporating timestamps or random elements unless explicitly required
- Avoid referencing volatile or external state
- Structure outputs to be reproducible

---

### Rule 7: `on_LLM_start` PII Classification Rule

**Description:** Immediately before each model call, classify outbound context for personal data risk.

**Inputs:** Exact outbound context, destination metadata, policy config

**Outputs:** `ALLOW`, `BLOCK`, or `REVIEW` with reason code and redacted evidence

**Deterministic:** Yes

**Policy intent:**
- Permit ordinary, task-necessary identifiers (e.g., names/business contact details) under minimisation
- Route ambiguous sensitive/bulk personal data to `REVIEW`
- `BLOCK` clear unauthorised transmission of highly sensitive personal data
- Never include raw detected values in logs, errors, or telemetry evidence

---

### Rule 8: `on_LLM_start` Prompt-Injection Triage Rule

**Description:** Treat retrieved/external content as untrusted and triage instruction-like patterns before model invocation.

**Inputs:** Outbound context with provenance/trust labels and policy config

**Outputs:** `ALLOW`, `BLOCK`, or `REVIEW` decision

**Deterministic:** Yes

**Policy intent:**
- Detection is a risk signal, not proof of intent
- `BLOCK` high-confidence untrusted attempts to exfiltrate secrets, disable controls, or trigger unauthorised side effects
- Use `REVIEW` for ambiguous or defensive/quoted examples
- Tool/action permissions must still be evaluated independently downstream

---

### Rule 9: `on_LLM_END` Token Telemetry Rule

**Description:** Capture usage metadata after each model call and preserve it for telemetry payload generation.

**Inputs:** Model response metadata from lifecycle end hook

**Outputs:** Structured usage record (e.g., model, input tokens, output tokens, total tokens, duration, stage correlation)

**Deterministic:** Yes

**Policy intent:**
- Usage capture must not include prompt/response body content
- Missing usage fields degrade gracefully to partial metrics
- Telemetry capture errors do not fail the pipeline run

---

## 7. Dependencies

### System Components
- Agent specifications (`.blueprint/agents/AGENT_*.md`) - must be updated to incorporate guardrails
- Pipeline orchestration (`SKILL.md` / `/implement-feature`) - integrates hook calls and decision handling
- Runtime hook integration points around model invocation (`on_LLM_start`, `on_LLM_END`)
- Telemetry assembly (`src/telemetry.js`) for token usage and safe metadata handling

### External Systems
- None required for this slice

### Policy Dependencies
- Align decision semantics with `.business_context/agent-runtime-secirity-controls.md` sections 3.3 and 4 without claiming full external-control-plane enforcement

### Operational Dependencies
- Users must provide adequate input materials (business_context, specs) for agents to work from
- Teams adopting murmur8 must understand that agents will escalate when information is insufficient

---

## 8. Non-Functional Considerations

### Auditability
- Citation format enables traceability from outputs back to source inputs
- Assumption labels enable review of agent decisions
- Escalation log provides audit trail of human decisions
- Hook decision records provide reason-coded evidence for pre-send model-call decisions

### Reliability
- Determinism rule supports reproducible builds and debugging
- Explicit assumptions reduce hidden failure modes
- Post-call usage capture reduces telemetry gaps across pipeline stages

### Security / Confidentiality
- Confidentiality constraints protect business-sensitive information
- Prohibition on external services prevents data exposure
- PII/prompt-injection checks apply before context leaves the process for model invocation

### Performance
- One additional pre-call scan and one post-call usage capture per model invocation
- Expected overhead is low relative to model latency

---

## 9. Assumptions & Open Questions

### Assumptions

1. **Input sufficiency**: Users will provide adequate input materials for agents to complete tasks without excessive escalation
2. **Hook availability**: Runtime integration provides lifecycle events equivalent to `on_LLM_start` and `on_LLM_END`
3. **Citation overhead**: The additional effort of citing sources is acceptable given the traceability benefits
4. **Escalation tolerance**: Users accept that agents will ask clarifying questions rather than guessing

### Open Questions

1. **PII threshold tuning**: Which categories are "ordinary identifiers" vs "sensitive by default" for this repo's workflows?
2. **Prompt-injection review UX**: Should `REVIEW` be interactive-only or support a strict non-interactive default of `BLOCK`?
3. **Token metric schema**: Should per-call usage be rolled up by stage only, or also retained at call granularity for debugging?

---

## 10. Impact on System Specification

**Does this feature reinforce, stretch, or contradict existing system assumptions?**

This feature **reinforces and slightly stretches** existing system assumptions:

- Per SYSTEM_SPEC.md section 7 (Governing Rules & Invariants): "No silent changes: Agents flag deviations; do not silently alter specifications" - guardrails extend this principle
- Per SYSTEM_SPEC.md section 8 (Cross-Cutting Concerns): "Traceability" - citation requirements directly support traceability goals
- Per SYSTEM_SPEC.md section 9 (Non-Functional Expectations): "Deterministic output given same inputs" - determinism rule makes this explicit
- Existing telemetry behaviours in `src/telemetry.js` are preserved while adding explicit lifecycle capture requirements for usage metadata

**Potential system spec enhancement:**

Section 7 (Governing Rules & Invariants) could be extended with a lifecycle subsection that names:
1. pre-LLM context safety checks (`on_LLM_start`) and
2. post-LLM usage capture (`on_LLM_END`)
as required runtime guardrail surfaces for pipeline integrations.

---

## 11. Handover to BA (Cass)

### Story Themes

Cass should derive stories around seven themes:

1. **Source Restriction Stories**: Stories covering what agents can and cannot reference when producing outputs
2. **Citation & Traceability Stories**: Stories defining how agents cite sources and maintain traceability
3. **Confidentiality Stories**: Stories ensuring business context remains protected
4. **Escalation & Assumption Stories**: Stories defining when and how agents escalate vs. assume
5. **Pre-LLM PII Triage Stories**: Stories defining `ALLOW`/`REVIEW`/`BLOCK` behaviour for personal-data categories
6. **Prompt-Injection Triage Stories**: Stories defining untrusted-instruction detection and handling without over-blocking defensive analysis
7. **Post-LLM Telemetry Stories**: Stories ensuring token usage and model metadata are captured and forwarded without leaking content

### Expected Story Boundaries

- Each guardrail rule (Rules 1-9 in section 6) maps to one or more stories
- Stories should be agent-agnostic where possible (guardrails apply to all agents)
- Runtime-hook stories should include acceptance criteria verifiable under `node --test` with synthetic payload fixtures

### Areas Needing Careful Story Framing

- **Balancing thoroughness vs. practicality**: Citation requirements should not create excessive overhead
- **Escalation threshold**: Stories should clarify when escalation is warranted vs. when reasonable assumption is acceptable
- **Confidentiality boundaries**: What exactly constitutes "confidential" and what is acceptable to reference
- **Prompt-injection ambiguity**: distinguish malicious directives from quoted examples used for defensive analysis
- **PII redaction safety**: ensure detected values never appear in logs, queue files, or error text
- **Telemetry scope**: capture usage metadata only (no raw prompt/response content)

---

## 12. Change Log (Feature-Level)

| Date | Change | Reason | Raised By |
|------|--------|--------|-----------|
| 2026-02-24 | Initial feature specification | Define comprehensive guardrails for agent behaviour | Alex |
| 2026-08-18 | Refined scope to include runtime lifecycle hooks: `on_LLM_start` (PII + prompt-injection triage) and `on_LLM_END` (token usage telemetry capture) | Align feature with intended implementation goals and existing telemetry/runtime-security direction | User |
