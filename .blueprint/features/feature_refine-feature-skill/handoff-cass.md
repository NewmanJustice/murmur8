## Handoff Summary
**For:** Nigel
**Feature:** refine-feature-skill

### Stories Written (6)
- story-initiation.md — skill invocation, artifact loading, featureId capture/creation
- story-conversation-approval.md — freeform feedback, diff proposal loop, approval gate, clean abort
- story-story-propagation.md — Cass updates affected stories only, produces story-changes.md, skipped for technical features
- story-test-propagation.md — Nigel updates affected tests only, produces test-changes.md, uses spec diff when Cass skipped
- story-codey-confirmation.md — mandatory pre-Codey pause, no flag bypass, test-first implementation, conditional commit
- story-telemetry-lineage.md — parentRunId chain, type:"refinement", artifact diffs in telemetry, change files committed as audit trail

### Key Constraints for Nigel
- Every AC is independently testable; prefer unit/integration tests over end-to-end
- featureId preservation (AC-6 in initiation, AC-6 in conversation-approval, AC-4 in telemetry) must be verified as a cross-cutting invariant
- The no-flag-bypass rule (AC-2 in codey-confirmation) is safety-critical — test it explicitly with `--yes` and similar flags
- Cass-skip path (technical features) is tested in both story-propagation and test-propagation stories
- parentRunId = null graceful path (AC-2 in telemetry) must be a distinct test case

### Files Created
- story-initiation.md
- story-conversation-approval.md
- story-story-propagation.md
- story-test-propagation.md
- story-codey-confirmation.md
- story-telemetry-lineage.md
