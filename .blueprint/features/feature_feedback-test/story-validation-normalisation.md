# Story: Validation and Normalisation Functions

## User Story

As a developer maintaining `src/feedback.js`,
I want direct unit tests for `validateFeedback`, `normalizeFeedbackKeys`, `parseFeedbackFromOutput`, and `shouldPause`,
so that regressions in the production module are caught immediately by the test suite without relying on inline reimplementations.

---

## Acceptance Criteria

**Given** a feedback object with a valid integer rating (1–5), an array of strings as issues, and a valid recommendation (`proceed`, `pause`, or `revise`),
**When** `validateFeedback(feedback)` is called,
**Then** it returns `{ valid: true, errors: [] }`.

**Given** a feedback object with a rating of `0` (below range), `6` (above range), `3.5` (non-integer), or a value that is not a number,
**When** `validateFeedback(feedback)` is called,
**Then** it returns `{ valid: false, errors: [...] }` containing an appropriate error message for each invalid rating.

**Given** a feedback object where `issues` is not an array, or contains non-string elements,
**When** `validateFeedback(feedback)` is called,
**Then** it returns `{ valid: false, errors: [...] }` containing an error message describing the issues field violation.

**Given** a feedback object with `rec` key only (no `recommendation` key),
**When** `normalizeFeedbackKeys(feedback)` is called,
**Then** it returns an object with `recommendation` set to the `rec` value and no `rec` key present.

**Given** a feedback object with both `rec` and `recommendation` keys,
**When** `normalizeFeedbackKeys(feedback)` is called,
**Then** `recommendation` retains its original value (wins over `rec`) and `rec` is not deleted (both remain as-is per the production implementation).

**Given** an agent output string containing a `FEEDBACK: { ... }` JSON block with valid content,
**When** `parseFeedbackFromOutput(output)` is called,
**Then** it returns the parsed feedback object.

**Given** a feedback object with `recommendation: 'pause'` and a rating above `minRatingThreshold`,
**When** `shouldPause(feedback, config)` is called,
**Then** it returns `true`.

**Given** a feedback object with `recommendation: 'proceed'` and a rating below `minRatingThreshold`,
**When** `shouldPause(feedback, config)` is called,
**Then** it returns `true` (rating-based gate triggers independently of recommendation).

---

## Test Boundary Details

### `validateFeedback` — rating boundary values to test
| Value | Expected valid |
|-------|---------------|
| 0     | false         |
| 1     | true          |
| 3     | true          |
| 5     | true          |
| 6     | false         |
| 3.5   | false         |

### `normalizeFeedbackKeys` — key scenarios to test
| Scenario                              | Expected result                          |
|---------------------------------------|------------------------------------------|
| `rec` only                            | Renamed to `recommendation`; `rec` removed |
| `recommendation` only                 | Unchanged                                |
| Both `rec` and `recommendation`       | Both keys preserved; `recommendation` value unchanged |
| Neither `rec` nor `recommendation`    | Object returned unchanged                |

### `parseFeedbackFromOutput` — scenarios to test
| Input                                 | Expected result   |
|---------------------------------------|-------------------|
| Valid `FEEDBACK: { ... }` block       | Parsed object     |
| No `FEEDBACK:` marker                 | `null`            |
| Malformed JSON after `FEEDBACK:`      | `null`            |

### `shouldPause` — scenarios to test
| rating | minRatingThreshold | recommendation | Expected |
|--------|--------------------|----------------|----------|
| 4      | 3.0                | 'proceed'      | false    |
| 2      | 3.0                | 'proceed'      | true     |
| 4      | 3.0                | 'pause'        | true     |
| 2      | 3.0                | 'pause'        | true     |

---

## Out of Scope

- Config file system interaction (covered in story-config-management.md)
- End-to-end parse pipeline chain (covered in story-parse-pipeline.md)
- `displayConfig` output assertion (smoke-tested in story-config-management.md)
- Any modification of `src/feedback.js` production code
- Testing agent prompt text or insights correlation logic

---

## Implementation Notes

- Import: `const { validateFeedback, normalizeFeedbackKeys, parseFeedbackFromOutput, shouldPause } = require('../src/feedback')`
- No file system setup required for this story — all functions are pure or in-memory
- Describe block names should match function names: `validateFeedback`, `normalizeFeedbackKeys`, `parseFeedbackFromOutput`, `shouldPause`
- See: `.blueprint/features/feature_feedback-test/FEATURE_SPEC.md` for full rules
