# Story: End-to-End Parse Pipeline

## User Story

As a developer maintaining `src/feedback.js`,
I want an integrated test that chains `parseFeedbackFromOutput` → `normalizeFeedbackKeys` → `validateFeedback` using the real production module,
so that the complete feedback extraction and validation path is verified end-to-end within the module boundary.

---

## Acceptance Criteria

**Given** an agent output string containing a valid `FEEDBACK: { "rating": 4, "issues": [], "rec": "proceed" }` block,
**When** the output is passed to `parseFeedbackFromOutput`, the result to `normalizeFeedbackKeys`, and that result to `validateFeedback`,
**Then** `parseFeedbackFromOutput` returns a non-null object, `normalizeFeedbackKeys` returns an object with `recommendation: 'proceed'` (not `rec`), and `validateFeedback` returns `{ valid: true, errors: [] }`.

**Given** an agent output string containing `FEEDBACK: { "rating": 2, "issues": ["unclear-scope"], "rec": "pause" }`,
**When** the same three-step chain is applied,
**Then** `validateFeedback` returns `{ valid: true, errors: [] }` (both `rec`-normalised recommendation and rating are valid), and the normalised object has `recommendation: 'pause'`.

**Given** an agent output string with `FEEDBACK: { "rating": 0, "issues": [], "recommendation": "proceed" }`,
**When** the three-step chain is applied,
**Then** `validateFeedback` returns `{ valid: false, errors: [...] }` with an error referencing the invalid rating.

**Given** an agent output string with no `FEEDBACK:` marker,
**When** `parseFeedbackFromOutput` is called,
**Then** it returns `null` and the pipeline terminates at that stage (normalisation and validation are not called with null).

---

## Pipeline Sequence (Explicit)

```
input: raw output string
  └─► parseFeedbackFromOutput(output)
        → null           → pipeline terminates (no further steps)
        → parsed object  → continue
            └─► normalizeFeedbackKeys(parsed)
                  → normalised object
                      └─► validateFeedback(normalised)
                            → { valid, errors }
```

All three functions are called on the real `src/feedback.js` module export. No step reimplements logic inline.

---

## Out of Scope

- File system I/O (not required for this pipeline — all functions are in-memory)
- `shouldPause` integration (not part of the parse pipeline; covered in story-validation-normalisation.md)
- Config management functions (covered in story-config-management.md)
- Any modification of `src/feedback.js` production code
- Exhaustive permutations of each step (those are covered in story-validation-normalisation.md)

---

## Implementation Notes

- Import: `const { parseFeedbackFromOutput, normalizeFeedbackKeys, validateFeedback } = require('../src/feedback')`
- Group under `describe('Parse Pipeline', ...)` or similar
- No file system setup required — all three functions operate on in-memory values
- This story's tests serve as the single chained integration test called for in FEATURE_SPEC.md:Rule 5
- The `rec` → `recommendation` normalisation step is critical: the raw parsed object uses `rec`, and `validateFeedback` accepts both keys — but the test should verify normalisation works correctly in the chain
- See: `.blueprint/features/feature_feedback-test/FEATURE_SPEC.md` for Rule 5 context
