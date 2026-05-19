# Story: Story Propagation via Cass

**As a** developer who has approved a spec diff
**I want** Cass to update only the affected user story files and produce a `story-changes.md` summary
**So that** stories stay in sync with the refined spec without unnecessary churn to unchanged stories

## Acceptance Criteria

### AC-1: Cass is skipped for technical features
**Given** the original feature was classified as technical (no `story-*.md` files exist for the slug)
**When** the refinement pipeline reaches the Cass stage
**Then** the Cass stage is skipped and the pipeline proceeds directly to Nigel; a note is recorded in the run output

### AC-2: Cass reads the spec diff not the full spec
**Given** Alex has written an updated `FEATURE_SPEC.md`
**When** Cass starts
**Then** Cass reads `story-changes.md` (produced by Alex) to understand the scope of change before reading the full spec

### AC-3: Only affected story files are updated
**Given** a feature with multiple existing `story-*.md` files
**When** Cass has identified which stories are affected by the spec diff
**Then** Cass updates only those story files; stories not affected by the diff are left unchanged

### AC-4: Cass produces a `story-changes.md` file
**Given** Cass has completed updating stories
**When** the Cass stage finishes
**Then** a `story-changes.md` file exists in the feature directory listing which stories were changed and a brief reason for each change

### AC-5: Cass does not delete existing stories without cause
**Given** an existing story that is unaffected by the spec diff
**When** Cass completes
**Then** that story file is present and unmodified

### AC-6: New stories are created if the spec diff adds new scope
**Given** the approved diff introduces new user-facing behaviour not covered by any existing story
**When** Cass processes the diff
**Then** Cass creates a new `story-[slug].md` file for the new scope and lists it in `story-changes.md`

## Out of Scope
- Cass making changes to test files (that is Nigel's responsibility)
- Cass engaging in conversation with the user about story scope
- Bulk-updating all stories regardless of diff scope
