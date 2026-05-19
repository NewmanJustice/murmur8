# Test Spec — refine-feature-skill

## Understanding
`/refine-feature [slug]` is a targeted post-implementation refinement pipeline. Alex loads
existing artifacts and a featureId, conducts a freeform feedback conversation, proposes a
spec diff and gets explicit approval before writing anything. Cass updates only affected
stories (skipped for technical features); Nigel updates only affected tests; a mandatory
pre-Codey pause requires explicit confirmation that no flag can bypass. History entries carry
`parentRunId` and `type:"refinement"`. All change-summary files are committed as audit trail.
The feature is implemented in `src/refine.js` (pure helpers) and `src/commands/refine.js`.

## AC → Test ID Mapping

| Story file | AC | Test ID | Description |
|---|---|---|---|
| story-initiation.md | AC-1 | RF-IN-1 | parseRefinementArgs returns slug |
| story-initiation.md | AC-2 | RF-IN-2 | loadRefinementContext throws on missing spec |
| story-initiation.md | AC-3 | RF-IN-3 | loadRefinementContext reads spec + stories + history |
| story-initiation.md | AC-4 | RF-IN-4 | loadRefinementContext returns summary fields |
| story-initiation.md | AC-5 | RF-IN-5 | loadRefinementContext reads featureId from frontmatter |
| story-initiation.md | AC-6 | RF-IN-6 | loadRefinementContext adds featureId when missing |
| story-conversation-approval.md | AC-3 | RF-CA-3 | applySpecDiff writes spec preserving featureId |
| story-conversation-approval.md | AC-5 | RF-CA-5 | applySpecDiff rejects null/undefined diff (abort path) |
| story-conversation-approval.md | AC-6 | RF-CA-6 | featureId unchanged after spec write |
| story-story-propagation.md | AC-1 | RF-SP-1 | isTechnicalFeature returns true when no story files |
| story-story-propagation.md | AC-3 | RF-SP-3 | filterAffectedStories returns only changed slugs |
| story-story-propagation.md | AC-4 | RF-SP-4 | buildStoryChanges produces required fields |
| story-story-propagation.md | AC-5 | RF-SP-5 | unaffected story list is unchanged |
| story-story-propagation.md | AC-6 | RF-SP-6 | new scope entry added to story-changes |
| story-test-propagation.md | AC-1 | RF-TP-1 | buildRefinementPayload includes story-changes path |
| story-test-propagation.md | AC-3 | RF-TP-3 | buildRefinementPayload emits test-changes fields |
| story-test-propagation.md | AC-5 | RF-TP-5 | buildRefinementPayload uses spec diff when no stories |
| story-codey-confirmation.md | AC-2 | RF-CC-2 | isPauseBypassable always returns false |
| story-codey-confirmation.md | AC-4 | RF-CC-4 | buildChangeSummary preserves existing writes on abort |
| story-codey-confirmation.md | AC-6 | RF-CC-6 | buildRefinementPayload respects --no-commit flag |
| story-telemetry-lineage.md | AC-1 | RF-TL-1 | linkParentRun sets parentRunId to most-recent runId |
| story-telemetry-lineage.md | AC-2 | RF-TL-2 | linkParentRun returns null when no history |
| story-telemetry-lineage.md | AC-3 | RF-TL-3 | linkParentRun sets type:"refinement" |
| story-telemetry-lineage.md | AC-4 | RF-TL-4 | featureId identical to original run |
| story-telemetry-lineage.md | AC-7 | RF-TL-7 | parentRunId chain is traversable |

## Key Assumptions
1. `src/refine.js` exports pure functions: `parseRefinementArgs`, `loadRefinementContext`,
   `applySpecDiff`, `buildRefinementPayload`, `linkParentRun`, `isTechnicalFeature`,
   `filterAffectedStories`, `buildStoryChanges`, `buildChangeSummary`, `isPauseBypassable`.
2. `loadRefinementContext` accepts a base directory so tests can use a tmp dir.
3. `applySpecDiff` accepts `(specPath, diff, featureId)` and writes atomically.
4. `linkParentRun` accepts a history array (already loaded) — no live file I/O.
5. Flags are parsed as a plain object; `--yes` / `--no-pause` do not affect `isPauseBypassable`.
