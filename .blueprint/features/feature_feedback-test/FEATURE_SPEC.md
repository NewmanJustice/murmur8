# Feature Specification — Feedback Module Test Suite

## 1. Feature Intent
**Why this feature exists.**

- **Problem being addressed:** The `src/feedback.js` module provides foundational logic for the agent feedback loop — schema validation, quality gate evaluation, key normalisation, config management, and feedback parsing. No test file directly imports and exercises this module's exported API. Existing tests (feature_feedback-loop, feature_compressed-feedback) re-implement helper logic inline rather than testing the real module, leaving the production code untested.
- **User need:** Developers maintaining or extending `src/feedback.js` need confidence that the exported functions behave correctly and that regressions are caught immediately by the test suite.
- **System alignment:** Per SYSTEM_SPEC.md:Section 7 (Implementation Rules), "tests are contracts" and the suite must be green before a feature is considered complete. Untested production modules violate this principle and expose the pipeline to silent breakage.

> This feature creates a direct unit-test harness for `src/feedback.js`, closing the coverage gap introduced by the feedback-loop and compressed-feedback features.

---

## 2. Scope

### In Scope

- Unit tests that `require('../src/feedback')` and call its exported functions directly
- Coverage of all exported functions:
  - `validateFeedback(feedback)` — schema validation
  - `normalizeFeedbackKeys(feedback)` — `rec` → `recommendation` normalisation
  - `parseFeedbackFromOutput(output)` — regex extraction and JSON parsing
  - `shouldPause(feedback, config)` — quality gate decision logic
  - `getDefaultConfig()` — default config shape and values
  - `readConfig()` — file read with fallback to defaults
  - `writeConfig(config)` — file write
  - `setConfigValue(key, value)` — validated config mutation
  - `resetConfig()` — restores defaults
  - `displayConfig()` — smoke test (no crash, correct output shape)
- File system isolation using `tmp` directories, matching the pattern established by `feature_feedback-loop.test.js`
- Edge cases: corrupt config file, missing config file, boundary rating values, both `rec` and `recommendation` keys present

### Out of Scope

- Testing agent prompt text (covered by feature_compressed-feedback)
- Integration tests spanning multiple modules (covered by feature_feedback-loop)
- Testing `displayConfig` output formatting exhaustively (smoke test only)
- Testing the insights calibration or issue-correlation logic (covered by feature_feedback-loop:Feedback Insights)

---

## 3. Actors Involved

### Developer / Test Runner

- **Can do:** Run `node --test test/feature_feedback-test.test.js` to verify `src/feedback.js` behaviour
- **Cannot do:** Modify production code via test execution

### src/feedback.js (module under test)

- **Provides:** All exported functions listed in Section 2
- **Constrained by:** Existing call sites; test must not require API changes

### File System (test isolation)

- **Provides:** Temporary directories for config file read/write tests
- **Pattern:** `fs.mkdtempSync` setup / `fs.rmSync` teardown per describe block

---

## 4. Behaviour Overview

### Happy Path: All Exported Functions Are Tested

1. Test file imports `src/feedback.js` module
2. Each exported function has one or more test cases covering:
   - Correct inputs → expected outputs
   - Boundary inputs → correct handling
   - Invalid inputs → appropriate rejection or graceful degradation
3. File system tests use isolated `tmp` directories to avoid cross-test pollution
4. `process.chdir` is restored after each file-system test group
5. All tests pass green; CI accepts the file

### Alternative: Config File Corruption

1. Test writes deliberately malformed JSON to the config file path
2. `readConfig()` catches the parse error and returns defaults
3. No exception propagates; test asserts returned value equals `getDefaultConfig()`

### Alternative: Boundary Rating Validation

1. Tests cover ratings 1, 5 (valid boundaries) and 0, 6 (invalid outside range)
2. Tests cover `rating: 3.5` (non-integer, invalid) and `rating: 3` (integer, valid)
3. `validateFeedback` returns `{ valid: false, errors: [...] }` for all invalid cases

---

## 5. State & Lifecycle Interactions

- **State-creating:** None — the test file does not introduce new runtime state
- **State-constrained:** Tests manage transient file system state (tmp directories)
- **Module lifecycle:** `require('../src/feedback')` is resolved once per test file run; config file paths are relative and resolved against `process.cwd()` which tests temporarily redirect

**Key constraint:** `src/feedback.js` uses a module-level constant `CONFIG_FILE = '.claude/feedback-config.json'` resolved relative to `process.cwd()`. Tests must `process.chdir(testDir)` before any call that reads/writes config, and restore `process.cwd()` in teardown.

---

## 6. Rules & Decision Logic

### Rule 1: Direct Module Import Required

- **Description:** Tests must import the real `src/feedback.js` rather than re-implementing its logic
- **Rationale:** Inline reimplementation does not catch bugs in production code
- **Inputs:** `require('../src/feedback')`
- **Outputs:** Live module reference
- **Type:** Structural constraint

### Rule 2: Isolated File System Per Describe Block

- **Description:** Each describe block that touches the config file must set up and tear down its own `tmp` directory
- **Inputs:** `fs.mkdtempSync`, `process.chdir`
- **Outputs:** Isolated state per describe block
- **Type:** Deterministic

### Rule 3: Boundary Coverage for Rating

- **Description:** Rating validation must be tested at values 0, 1, 3, 5, 6 and non-integer 3.5
- **Type:** Deterministic

### Rule 4: Dual-Key Normalisation Coverage

- **Description:** `normalizeFeedbackKeys` must be tested for: `rec` only, `recommendation` only, both present (recommendation wins), neither present
- **Type:** Deterministic

### Rule 5: Parse-and-Validate Pipeline

- **Description:** At least one test must chain `parseFeedbackFromOutput` → `normalizeFeedbackKeys` → `validateFeedback` to verify the end-to-end extraction path works against the real module
- **Type:** Integration within module boundary

---

## 7. Dependencies

### System Components

- **src/feedback.js:** Module under test — no modifications required
- **node:test, node:assert:** Node.js built-in test runner and assertions (Node 18+)
- **fs, path, os:** Standard library for file system isolation

### File Dependencies

- Input: `src/feedback.js` (read-only from test perspective)
- Output: `test/feature_feedback-test.test.js` (new file)

### Existing Test Patterns

- Isolation pattern from `test/feature_feedback-loop.test.js` (setupTestDir / teardownTestDir)
- Module import pattern from `test/feature_theme-adoption.test.js` and `test/feature_config-factory.test.js`

---

## 8. Non-Functional Considerations

### Performance

- All tests are synchronous file system operations on tmp dirs; expected runtime < 100ms total

### Maintainability

- Tests are structured to mirror `src/feedback.js` exported API, making it easy to add tests as the module evolves
- Describe block names match function groups: `validateFeedback`, `normalizeFeedbackKeys`, `parseFeedbackFromOutput`, `shouldPause`, `Config Management`

### Error Tolerance

- Tmp directory teardown uses `{ force: true }` to tolerate partial cleanup on test failure

### No Side Effects

- Tests do not modify any project-level `.claude/` files; all file I/O is confined to `tmp` directories

---

## 9. Assumptions & Open Questions

### Assumptions

- ASSUMPTION: `src/feedback.js` exports are stable; no API changes are required to make it testable
- ASSUMPTION: `process.chdir` correctly redirects the module's relative path resolution for `CONFIG_FILE`
- ASSUMPTION: Node.js 18+ is available (required by SYSTEM_SPEC.md:Section 2)
- ASSUMPTION: `displayConfig` writes to stdout; smoke test asserts it does not throw

### Open Questions

- Should `displayConfig` be tested with a captured stdout mock, or is a non-throw assertion sufficient? (INFERRED: non-throw is sufficient for this feature)
- Should `setConfigValue` with unknown keys be tested? (INFERRED: yes, as the function throws a typed error that should be verified)
- Are there any async code paths in `src/feedback.js`? (INFERRED: no — all operations are synchronous based on current implementation)

---

## 10. Impact on System Specification

### Reinforces Existing Assumptions

- Per SYSTEM_SPEC.md:Section 7, "tests are contracts" and "green suite required" — this feature closes a gap where contracts were implied but not enforced
- Per SYSTEM_SPEC.md:Section 8 (Traceability), tests that directly import production modules create a firmer traceability chain than tests using reimplemented helpers

### No Contradiction

This feature introduces no new behaviour, state, or API. It adds test coverage for existing production code. No system spec update is required.

---

## 11. Handover to BA (Cass)

### Story Themes

1. **Direct Module Tests:** Tests that import and exercise `validateFeedback`, `normalizeFeedbackKeys`, `parseFeedbackFromOutput`, and `shouldPause` via the real module
2. **Config Management Tests:** Tests for `readConfig`, `writeConfig`, `setConfigValue`, `resetConfig`, and `getDefaultConfig` with file system isolation
3. **End-to-End Parse Pipeline:** A chained test covering `parseFeedbackFromOutput` → `normalizeFeedbackKeys` → `validateFeedback` as an integrated path

### Expected Story Boundaries

- Story 1: Validation and normalisation functions (no file system needed)
- Story 2: Config management functions (file system isolation required)
- Story 3: Parse pipeline (combines Stories 1 and 2 patterns)

### Areas Needing Careful Story Framing

- `process.chdir` usage must be clearly framed as test infrastructure, not production behaviour
- The distinction between this test file and `feature_feedback-loop.test.js` must be explicit: this tests the real module; that uses inline helpers
- `displayConfig` story should be framed as a smoke test, not a full output assertion

---

## 12. Change Log (Feature-Level)

| Date       | Change                              | Reason                                  | Raised By |
|------------|-------------------------------------|-----------------------------------------|-----------|
| 2026-05-19 | Initial feature specification       | Close test coverage gap for src/feedback.js | Alex  |
