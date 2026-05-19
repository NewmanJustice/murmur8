# Story: Mandatory Pause and Codey Confirmation

**As a** developer reviewing the proposed changes to spec, stories, and tests
**I want** to see a consolidated summary of all changes before Codey begins implementation, and to give explicit confirmation before any code is touched
**So that** I retain full control and cannot accidentally trigger implementation via a flag or shortcut

## Acceptance Criteria

### AC-1: Pipeline pauses before Codey with a change summary
**Given** Nigel has produced `test-changes.md`
**When** the pipeline reaches the pre-Codey gate
**Then** the pipeline displays a summary showing: files changed in spec, stories affected, and tests added/modified, then waits for explicit user input before proceeding

### AC-2: No flag or option bypasses the pre-Codey pause
**Given** the pre-Codey gate is active
**When** the user invokes `/refine-feature` with any combination of flags (including `--yes`, `--no-pause`, or any other flag)
**Then** the pipeline still pauses and requires explicit confirmation; no flag silently bypasses this gate

### AC-3: User confirmation triggers Codey implementation
**Given** the pre-Codey change summary is displayed
**When** the user confirms (e.g., types "yes" or "proceed")
**Then** Codey begins implementation using the updated tests as its acceptance target

### AC-4: User abort at pre-Codey gate exits cleanly
**Given** the pre-Codey change summary is displayed
**When** the user aborts (e.g., types "cancel" or "no")
**Then** the pipeline exits cleanly; all spec, story, and test file writes that have already occurred are preserved; no code changes are made

### AC-5: Codey uses test-first incremental approach
**Given** the user has confirmed at the pre-Codey gate
**When** Codey implements changes
**Then** Codey runs the updated tests first, implements code changes incrementally to make them pass, and iterates until all updated tests pass

### AC-6: Pipeline commits after successful implementation unless --no-commit
**Given** Codey has completed implementation and all tests pass
**When** the pipeline finishes
**Then** changes are committed to git unless the `--no-commit` flag was supplied, in which case the pipeline exits with a message indicating commit was skipped

## Out of Scope
- Codey making spec or story changes (those are locked before this gate)
- Any automated or timed confirmation; confirmation must be an explicit user action
