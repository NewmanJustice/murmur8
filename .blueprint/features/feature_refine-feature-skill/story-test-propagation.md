# Story: Test Propagation via Nigel

**As a** developer whose stories have been updated by Cass
**I want** Nigel to update only the affected test cases and produce a `test-changes.md` summary
**So that** the test suite reflects the refined spec without replacing tests that are still valid

## Acceptance Criteria

### AC-1: Nigel reads story-changes.md to scope its work
**Given** Cass has produced a `story-changes.md` (or Cass was skipped and Alex produced a spec diff)
**When** Nigel starts
**Then** Nigel reads `story-changes.md` (or the spec diff directly if Cass was skipped) before reading any test files

### AC-2: Only affected test cases are modified
**Given** an existing test file with multiple test cases
**When** Nigel has identified which test cases correspond to changed stories or spec sections
**Then** Nigel modifies only those test cases; test cases unrelated to the diff are left unchanged

### AC-3: Nigel produces a `test-changes.md` file
**Given** Nigel has completed updating tests
**When** the Nigel stage finishes
**Then** a `test-changes.md` file exists in the feature directory listing which test cases were added, modified, or removed and why

### AC-4: New test cases are created for new acceptance criteria
**Given** a new acceptance criterion exists in an updated or new story
**When** Nigel processes the changes
**Then** Nigel creates a new test case covering that criterion and records it in `test-changes.md`

### AC-5: Nigel works from spec diff when no stories exist
**Given** the original feature was technical and Cass was skipped
**When** Nigel runs
**Then** Nigel uses the before/after spec diff produced by Alex as the sole input for determining which tests to update

### AC-6: Passing tests are not regressed
**Given** an existing test that covers behaviour not changed by the diff
**When** Nigel completes
**Then** that test case remains present and semantically equivalent to its pre-refinement version

## Out of Scope
- Nigel running the tests (execution happens during the Codey stage)
- Nigel modifying story files
- Nigel engaging in conversation with the user about test scope
