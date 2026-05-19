## Handoff Summary
**For:** Codey
**Feature:** refine-feature-skill

### Tests Written
- File: `test/feature_refine-feature-skill.test.js`
- Spec: `test/artifacts/feature_refine-feature-skill/test-spec.md`
- Total tests: 25 across 6 describe blocks (one per story)

### Coverage
| Story | ACs covered | Test IDs |
|---|---|---|
| story-initiation.md | AC-1,2,3,4,5,6 | RF-IN-1…6 |
| story-conversation-approval.md | AC-3,5,6 | RF-CA-3,5,6 |
| story-story-propagation.md | AC-1,3,4,5,6 | RF-SP-1,3,4,5,6 |
| story-test-propagation.md | AC-1,3,5 | RF-TP-1,3,5 |
| story-codey-confirmation.md | AC-2,4,6 | RF-CC-2,4,6 |
| story-telemetry-lineage.md | AC-1,2,3,4,7 | RF-TL-1,2,3,4,7 |

### Key Assumptions for Codey
- `src/refine.js` exports all 10 pure functions listed in test-spec.md
- `loadRefinementContext(slug, baseDir)` accepts a base directory for testability
- `applySpecDiff(specPath, newContent, featureId)` — null newContent = abort (throws)
- `linkParentRun(slug, historyArray)` is pure; no file I/O
- `isPauseBypassable` always returns `false`; no flags override it

### Files to Create
- `src/refine.js` — all pure helper functions
- `src/commands/refine.js` — CLI handler wiring
- `REFINE_SKILL.md` and `.claude/commands/refine-feature.md`
