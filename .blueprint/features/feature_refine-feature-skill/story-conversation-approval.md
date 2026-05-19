# Story: Conversation and Spec Diff Approval

**As a** developer providing feedback on a completed feature
**I want** to describe what is wrong or what has changed to Alex in freeform language, then review a proposed diff before anything is written
**So that** spec changes are driven by my intent and I cannot accidentally overwrite existing work

## Acceptance Criteria

### AC-1: Alex accepts freeform feedback input
**Given** Alex has presented the current-state summary
**When** the user provides feedback in any form (plain text, error logs, test output, screenshots)
**Then** Alex accepts the input without requiring a specific format and proceeds to analyse it

### AC-2: Alex presents a proposed diff to FEATURE_SPEC.md
**Given** Alex has analysed the user's feedback
**When** Alex has identified the minimal set of spec changes required
**Then** Alex presents the proposed changes as a clearly labelled before/after diff and asks the user to approve or reject

### AC-3: User approval triggers spec write
**Given** Alex has presented the proposed diff
**When** the user explicitly approves the diff
**Then** Alex writes the updated `FEATURE_SPEC.md` with the changes applied, preserving the original featureId

### AC-4: User rejection triggers revision loop
**Given** Alex has presented the proposed diff
**When** the user rejects the diff or requests changes
**Then** Alex revises the proposed diff based on the user's clarification and presents an updated version; no files are written until approval is given

### AC-5: User abort exits cleanly with no writes
**Given** the conversation is in progress at any point before approval
**When** the user aborts (e.g., types "cancel" or "abort")
**Then** the pipeline exits cleanly, no files are modified, and the user receives confirmation that no changes were made

### AC-6: featureId is unchanged after spec write
**Given** the user has approved the proposed diff
**When** Alex writes the updated `FEATURE_SPEC.md`
**Then** the featureId in the YAML frontmatter is identical to the value read at initiation

## Out of Scope
- Automated approval via a `--yes` flag for this gate
- Approving changes to story or test files at this stage (those are handled by Cass and Nigel)
