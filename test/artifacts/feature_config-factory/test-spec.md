# Test Specification: Config Factory

## Understanding

This feature creates a `createConfigModule()` factory function to eliminate duplicated boilerplate across retry.js, feedback.js, stack.js, and murm.js config modules. Each module currently implements similar patterns: `getDefault()`, `read()`, `write()`, `display()`, `setValue()`, `reset()`. The factory consolidates this into ~10 lines per config module instead of ~80.

## Test Mapping

### 1. Factory Core Functions

| Test | Description |
|------|-------------|
| `factory returns all expected methods` | Verify factory returns: read, write, reset, display, setValue, getDefault, CONFIG_FILE |
| `getDefault returns provided defaults` | Factory should return defaults object unchanged |
| `read returns defaults when file missing` | Should return defaults if config file doesn't exist |
| `read returns defaults on corrupted file` | Should gracefully fallback to defaults on JSON parse error |
| `read merges missing keys from defaults` | New default keys should be merged into existing config |
| `write creates config file` | Should create file with JSON content |
| `reset writes defaults to file` | Should overwrite file with default config |

### 2. Validation

| Test | Description |
|------|-------------|
| `setValue validates against validators map` | Should throw on invalid values per validator function |
| `setValue accepts valid values` | Should write and persist valid values |
| `setValue handles unknown keys` | Should throw error for keys not in defaults |
| `setValue handles array keys with JSON` | Array values should be parsed from JSON strings |
| `setValue handles array with invalid JSON` | Should throw clear error for malformed JSON arrays |

### 3. Display Formatting

| Test | Description |
|------|-------------|
| `display uses custom formatters` | Should apply formatter functions for display output |
| `display falls back to default format` | Keys without formatters display raw value |
| `display handles arrays` | Array values formatted correctly (comma-separated or JSON) |

### 4. Backward Compatibility

| Test | Description |
|------|-------------|
| `retry config API unchanged` | Existing retry.js exports still work |
| `feedback config API unchanged` | Existing feedback.js exports still work |
| `stack config API unchanged` | Existing stack.js exports still work |
| `murm config API unchanged` | Existing murm.js config functions still work |

### 5. Error Message Consistency

| Test | Description |
|------|-------------|
| `error format standardized` | Error messages follow: "Invalid value for {key}: {value}. {reason}" |
| `unknown key error format` | Error for unknown keys follows pattern |

## Key Acceptance Criteria

1. Factory creates complete config modules with all standard methods
2. Validators prevent invalid config values
3. Display formatters customize output
4. All existing config module APIs remain unchanged
5. Error messages follow standardized format
