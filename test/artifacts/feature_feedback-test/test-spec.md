# Test Spec — feedback-test

## Understanding
Tests cover all exported functions of `src/feedback.js` directly (no inline reimplementation).
Three story groups: (1) pure validation/normalisation functions, (2) config file I/O, (3) chained parse pipeline.
Config tests require `process.chdir` into a tmp directory because `CONFIG_FILE` is resolved relative to `process.cwd()`.
All functions are synchronous — no async/await required.
`displayConfig` is smoke-tested (no-throw only); output format is not asserted.

## AC to Test ID Mapping

| Story                         | AC                                           | Test ID                          |
|-------------------------------|----------------------------------------------|----------------------------------|
| validation-normalisation      | validateFeedback valid (rating 1–5)          | T-VN-1.1                         |
| validation-normalisation      | validateFeedback invalid rating 0            | T-VN-1.2a                        |
| validation-normalisation      | validateFeedback invalid rating 6            | T-VN-1.2b                        |
| validation-normalisation      | validateFeedback invalid rating 3.5          | T-VN-1.2c                        |
| validation-normalisation      | validateFeedback invalid rating not-a-number | T-VN-1.2d                        |
| validation-normalisation      | validateFeedback issues not array            | T-VN-1.3a                        |
| validation-normalisation      | validateFeedback issues non-string elements  | T-VN-1.3b                        |
| validation-normalisation      | normalizeFeedbackKeys rec-only → recommendation | T-VN-2.1                      |
| validation-normalisation      | normalizeFeedbackKeys both keys — rec preserved | T-VN-2.2                      |
| validation-normalisation      | parseFeedbackFromOutput valid block          | T-VN-3.1                         |
| validation-normalisation      | parseFeedbackFromOutput no marker → null     | T-VN-3.2                         |
| validation-normalisation      | parseFeedbackFromOutput malformed JSON → null | T-VN-3.3                        |
| validation-normalisation      | shouldPause: pause recommendation            | T-VN-4.1                         |
| validation-normalisation      | shouldPause: low rating triggers gate        | T-VN-4.2                         |
| validation-normalisation      | shouldPause: proceed + above threshold       | T-VN-4.3                         |
| config-management             | getDefaultConfig shape                       | T-CM-1.1                         |
| config-management             | readConfig: missing file → defaults          | T-CM-2.1                         |
| config-management             | readConfig: valid file → parsed content      | T-CM-2.2                         |
| config-management             | readConfig: malformed JSON → defaults        | T-CM-2.3                         |
| config-management             | writeConfig: file created with content       | T-CM-3.1                         |
| config-management             | setConfigValue minRatingThreshold            | T-CM-4.1                         |
| config-management             | setConfigValue enabled false                 | T-CM-4.2                         |
| config-management             | setConfigValue unknown key throws            | T-CM-4.3                         |
| config-management             | setConfigValue invalid threshold throws      | T-CM-4.4                         |
| config-management             | setConfigValue invalid enabled throws        | T-CM-4.5                         |
| config-management             | resetConfig restores defaults                | T-CM-5.1                         |
| config-management             | displayConfig does not throw                 | T-CM-6.1                         |
| parse-pipeline                | valid rec chain: parsed + normalised + valid | T-PP-1.1                         |
| parse-pipeline                | pause rec chain: valid output                | T-PP-1.2                         |
| parse-pipeline                | invalid rating → validateFeedback invalid    | T-PP-1.3                         |
| parse-pipeline                | no FEEDBACK marker → null terminates chain   | T-PP-2.1                         |

## Key Assumptions

- `normalizeFeedbackKeys` with both `rec` and `recommendation` present leaves both keys (production does NOT delete `rec`)
- `validateFeedback` accepts both `rec` and `recommendation` keys for the recommendation field
- `parseFeedbackFromOutput` regex captures single-line JSON objects (`{[^}]+}`) — multi-line blocks are out of scope
- `setConfigValue('minRatingThreshold', '0.5')` throws because 0.5 < 1.0 minimum
- `process.chdir` correctly redirects `CONFIG_FILE` path resolution for all config functions
