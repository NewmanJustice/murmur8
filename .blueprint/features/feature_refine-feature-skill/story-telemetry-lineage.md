# Story: Telemetry Lineage via parentRunId

**As a** developer or team lead reviewing a feature's evolution over multiple refinements
**I want** each refinement run to record a `parentRunId` linking it to the run it refines
**So that** I can trace the full chain of refinements for any feature from pipeline history

## Acceptance Criteria

### AC-1: Refinement run records parentRunId in history
**Given** a pipeline history entry exists for the slug being refined
**When** the refinement run completes
**Then** the history entry for this refinement run contains a `parentRunId` field set to the `runId` of the most recent prior run for that slug

### AC-2: parentRunId is null when no prior history exists
**Given** no pipeline history entry exists for the slug being refined
**When** the refinement run records its history entry
**Then** the `parentRunId` field is present and set to `null`; the run is not aborted or errored because of missing history

### AC-3: Refinement run is recorded with type "refinement"
**Given** a refinement run completes (successfully or with user abort)
**When** the history entry is written
**Then** the entry contains `"type": "refinement"` to distinguish it from original `"type": "implementation"` runs

### AC-4: featureId is identical to the original run's featureId
**Given** an original implementation run recorded a featureId for a slug
**When** a refinement run for the same slug records its history entry
**Then** the featureId in the refinement history entry is the same value as in the original run

### AC-5: Telemetry payload uses artifact diffs, not full files
**Given** spec, story, and test files were updated during the refinement
**When** telemetry is emitted
**Then** the payload contains before/after diffs for each changed artifact rather than the full file contents

### AC-6: story-changes.md and test-changes.md are committed as audit trail
**Given** Cass produced `story-changes.md` and/or Nigel produced `test-changes.md`
**When** the pipeline commits at the end of a successful refinement
**Then** both change summary files are included in the commit alongside the updated spec, story, and test files

### AC-7: parentRunId chain is traversable across multiple refinements
**Given** a feature has been refined three times, each run recording a parentRunId pointing to the previous
**When** a developer queries the history for that slug
**Then** the history entries can be ordered into a chain: run-1 ← run-2 ← run-3 ← run-4 via parentRunId links

## Out of Scope
- Visualising the refinement chain in the CLI (a future feature)
- Preserving original artifact files alongside refined versions (git history provides rollback)
- Changing the featureId at any point in the chain
