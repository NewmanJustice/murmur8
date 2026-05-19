# Feature Specification — Refine Feature Skill

## 1. Feature Intent
**Why this feature exists.**

- After running `/implement-feature`, the result may not match user intent — tests pass but behaviour is wrong, scope was misunderstood, or new information changes requirements
- Users need a structured path to refine an existing feature without starting from scratch
- This supports the system purpose of iterative, AI-assisted feature development

---

## 2. Scope
### In Scope
- New `/refine-feature [slug]` skill that initiates a refinement pipeline
- Alex reads existing spec, stories, and test output to build context, then converses with the user to identify changes
- Alex presents a proposed spec diff; user approves before changes are applied
- Cass updates affected story files and produces `story-changes.md`
- Nigel updates affected tests and produces `test-changes.md`
- Mandatory pause before Codey implements — user must confirm
- Codey implements changes using the same test-first approach
- Telemetry: `parentRunId` field linking this run to the run being refined; artifact diffs instead of full files
- SKILL.md written to project root; copied to `.claude/commands/refine-feature.md` on `murmur8 init`

### Out of Scope
- Branching or forking a feature into two separate features
- Rolling back a feature (separate concern)
- Bulk-refining multiple features in one invocation
- Changing the featureId (it must be preserved across refinements)

---

## 3. Actors Involved

**User**
- Provides the slug of the feature to refine
- Engages in freeform conversation with Alex about what needs to change (feedback, error logs, test output)
- Reviews and approves/rejects the proposed spec diff
- Confirms before Codey implements

**Alex**
- Reads existing FEATURE_SPEC.md, story-*.md, test output, and pipeline history
- Converses with user to understand what changed or was wrong
- Identifies minimal set of spec changes needed
- Presents diff; updates FEATURE_SPEC.md only after approval

**Cass**
- Reads `story-changes.md` produced by Alex
- Updates only affected story files (not all stories)
- Produces `story-changes.md` summarising what changed and why

**Nigel**
- Reads `story-changes.md` to understand scope of change
- Updates only affected test cases
- Produces `test-changes.md` summarising what changed

**Codey**
- Receives explicit user confirmation before starting
- Implements changes to pass updated tests
- Uses the same test-first incremental approach as the main pipeline

---

## 4. Behaviour Overview

### Happy Path
1. User runs `/refine-feature [slug]`
2. Alex reads existing artifacts and presents a brief summary of current state
3. Alex asks: "What needs to change?"
4. User provides feedback (freeform: description, logs, error output, screenshots)
5. Alex identifies changes and presents a proposed diff to FEATURE_SPEC.md
6. User approves → Alex writes updated FEATURE_SPEC.md (featureId preserved)
7. Cass updates affected stories and writes `story-changes.md`
8. Nigel updates affected tests and writes `test-changes.md`
9. Pipeline pauses: user sees summary of changes across spec/stories/tests
10. User confirms → Codey implements, runs tests, iterates until passing
11. Pipeline commits (unless `--no-commit`) and records refinement in history

### Key Alternatives
- User rejects Alex's proposed diff → Alex revises and re-presents
- User aborts at any stage → clean exit, no partial writes
- No stories exist (technical feature) → Cass stage skipped; Nigel works from spec diff directly
- Tests already pass after spec change → Codey stage skipped with note

---

## 5. State & Lifecycle Interactions

- State-transitioning: moves an existing feature from a completed/deployed state back into active refinement
- Reads but does not replace existing artifacts until user approves diff
- After refinement, artifacts reflect the refined state; originals not preserved (git history provides rollback)
- Refinement history is a chain: each run's `parentRunId` points to the previous run's `runId`

---

## 6. Rules & Decision Logic

**R1: featureId preservation**
- The existing `featureId` in FEATURE_SPEC.md YAML frontmatter must never be changed
- Input: existing spec; Output: updated spec with same featureId

**R2: parentRunId linkage**
- Every refinement run must include `parentRunId` = the `runId` of the run being refined
- If no prior run exists in history for this slug, `parentRunId` = null (graceful)
- Input: pipeline history for slug; Output: parentRunId in telemetry payload

**R3: Mandatory pause before Codey**
- Codey must never run without explicit user confirmation
- Applies regardless of flags (no `--yes` bypass for this gate)

**R4: Cass skipped for technical features**
- If the original feature was classified as technical (no stories exist), Cass is skipped
- Nigel works from the spec diff directly

**R5: Artifact diff in telemetry**
- Refinement telemetry sends diffs (before/after) rather than full artifact content
- Keeps payload size proportional to the change, not the total feature size

---

## 7. Dependencies

- `src/telemetry.js` — existing telemetry module; refinements add `parentRunId` field
- `src/history.js` — existing history module; refinements are recorded with `type: "refinement"`
- `src/classifier.js` — determines whether Cass stage runs
- `src/diff-preview.js` — used for pre-commit diff review
- `src/feedback.js` — quality gates between stages (same thresholds)
- `.blueprint/agents/AGENT_SPECIFICATION_ALEX.md` — Alex agent spec
- `.blueprint/agents/AGENT_BA_CASS.md` — Cass agent spec
- `.blueprint/agents/AGENT_TESTER_NIGEL.md` — Nigel agent spec
- `.blueprint/agents/AGENT_DEVELOPER_CODEY.md` — Codey agent spec

---

## 8. Non-Functional Considerations

- **Token efficiency**: Alex reads existing artifacts selectively — handoff summaries first, full spec only if needed
- **Audit**: all refinements recorded in pipeline history; parentRunId chain enables full lineage
- **Safety**: mandatory pause before Codey prevents accidental overwrites on approval

---

## 9. Assumptions & Open Questions

**Assumptions:**
- The feature being refined already has a FEATURE_SPEC.md
- featureId exists in YAML frontmatter (if not, it should be added before refinement proceeds)
- Git is available for diff display and commit

**Open Questions:**
- Should a `--no-pause` flag be allowed to skip the Codey confirmation? (Current decision: no, always pause)
- Should `story-changes.md` and `test-changes.md` be committed alongside the updated files, or deleted after? (Current decision: commit them as refinement audit trail)

---

## 10. Impact on System Specification

This feature reinforces the system's core model of iterative, agent-assisted development. It stretches the pipeline slightly by adding a conversation phase (Alex ↔ user) before spec writing, but does not contradict any existing system assumptions.

No system spec changes required.

---

## 11. Handover to BA (Cass)

Story themes:
- Initiating a refinement: user provides slug, Alex reads context
- Conversation and approval: user provides feedback, Alex proposes diff, user approves
- Story propagation: Cass updates affected stories, produces story-changes.md
- Test propagation: Nigel updates affected tests, produces test-changes.md
- Implementation confirmation: mandatory pause, user confirms, Codey implements
- Telemetry lineage: parentRunId chain, artifact diffs

Story boundaries: each stage transition (user→Alex, Alex→Cass, Cass→Nigel, Nigel→pause, pause→Codey) is a natural story boundary.

---

## 12. Change Log (Feature-Level)
| Date | Change | Reason | Raised By |
|------|--------|--------|-----------|
| 2026-05-19 | Initial spec | New feature design | Steve Newman |
