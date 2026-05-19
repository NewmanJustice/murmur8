# Story: Config Management Functions

## User Story

As a developer maintaining `src/feedback.js`,
I want direct unit tests for `getDefaultConfig`, `readConfig`, `writeConfig`, `setConfigValue`, `resetConfig`, and `displayConfig`,
so that config persistence logic in the production module is verified against real file I/O in an isolated environment.

---

## Acceptance Criteria

**Given** `getDefaultConfig()` is called,
**When** the function returns,
**Then** the result has `minRatingThreshold: 3.0`, `enabled: true`, and an `issueMappings` object containing all six standard mappings defined in `src/feedback.js`.

**Given** a `tmp` directory is set as `process.cwd()` and no config file exists there,
**When** `readConfig()` is called,
**Then** it returns a value equal to `getDefaultConfig()` and does not throw.

**Given** a `tmp` directory is set as `process.cwd()` and `.claude/feedback-config.json` contains valid JSON,
**When** `readConfig()` is called,
**Then** it returns the parsed config object matching the written content.

**Given** a `tmp` directory is set as `process.cwd()` and `.claude/feedback-config.json` contains malformed JSON (e.g. `{bad json`),
**When** `readConfig()` is called,
**Then** it returns `getDefaultConfig()` and does not throw.

**Given** a `tmp` directory is set as `process.cwd()`,
**When** `writeConfig(config)` is called with a valid config object,
**Then** `.claude/feedback-config.json` is created at the expected path and its content parses back to the original config object.

**Given** a `tmp` directory is set as `process.cwd()` and a config file exists,
**When** `setConfigValue('minRatingThreshold', '4.5')` is called,
**Then** `readConfig()` returns a config with `minRatingThreshold: 4.5`.

**Given** a `tmp` directory is set as `process.cwd()`,
**When** `setConfigValue('enabled', 'false')` is called,
**Then** `readConfig()` returns a config with `enabled: false`.

**Given** a `tmp` directory is set as `process.cwd()`,
**When** `setConfigValue` is called with an unknown key (e.g. `'nonExistentKey'`),
**Then** it throws an `Error` whose message contains `'Unknown config key'`.

**Given** a `tmp` directory is set as `process.cwd()` and a modified config file exists,
**When** `resetConfig()` is called,
**Then** `readConfig()` returns a value equal to `getDefaultConfig()`.

**Given** a `tmp` directory is set as `process.cwd()`,
**When** `displayConfig()` is called,
**Then** it does not throw (smoke test only — output format is not asserted).

---

## File System Isolation Pattern

Each describe block that exercises config file I/O must follow this pattern:

```
before(): testDir = fs.mkdtempSync(os.tmpdir() + path.sep + 'feedback-test-')
          originalCwd = process.cwd()
          process.chdir(testDir)

after():  process.chdir(originalCwd)
          fs.rmSync(testDir, { recursive: true, force: true })
```

This mirrors the isolation pattern in `test/feature_feedback-loop.test.js`.

The `CONFIG_FILE` constant in `src/feedback.js` is `.claude/feedback-config.json`, resolved relative to `process.cwd()`. Tests must `chdir` before calling any function that reads or writes config.

---

## `setConfigValue` Invalid Input Cases

| key                   | value     | Expected behaviour                              |
|-----------------------|-----------|-------------------------------------------------|
| `minRatingThreshold`  | `'0.5'`   | throws — below minimum (1.0)                    |
| `minRatingThreshold`  | `'5.5'`   | throws — above maximum (5.0)                    |
| `minRatingThreshold`  | `'abc'`   | throws — not a number                           |
| `enabled`             | `'yes'`   | throws — not `'true'` or `'false'`              |
| `nonExistentKey`      | `'val'`   | throws — unknown key                            |

---

## Out of Scope

- Testing `displayConfig` output format or colour rendering
- Testing stdout mock/capture for `displayConfig`
- Testing `validateFeedback`, `normalizeFeedbackKeys`, `parseFeedbackFromOutput`, `shouldPause` (covered in story-validation-normalisation.md)
- End-to-end pipeline chain (covered in story-parse-pipeline.md)
- Any modification of `src/feedback.js` production code
- Modifying project-level `.claude/` files

---

## Implementation Notes

- Import: `const { getDefaultConfig, readConfig, writeConfig, setConfigValue, resetConfig, displayConfig } = require('../src/feedback')`
- Also import: `fs`, `os`, `path` for file system isolation
- Group under a single `describe('Config Management', ...)` or per-function sub-describes
- `displayConfig` reads config via `readConfig()`, so it also requires `chdir` setup
- See: `.blueprint/features/feature_feedback-test/FEATURE_SPEC.md` for full rules and constraints
