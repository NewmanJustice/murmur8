# Nigel Handoff: Config Factory

## Summary
Created test suite for the config-factory feature with 19 test cases covering:
- Factory core functions (7 tests)
- Validation (5 tests)
- Display formatting (3 tests)
- Backward compatibility (4 tests)
- Error message consistency (2 tests)

## Test Files Created
- `test/artifacts/feature_config-factory/test-spec.md` - Test mapping document
- `test/feature_config-factory.test.js` - Executable test file

## Key Test Coverage

### Factory API
- Factory returns: read, write, reset, display, setValue, getDefault, CONFIG_FILE
- getDefault returns provided defaults unchanged
- read handles missing/corrupted files gracefully
- read merges missing keys from defaults
- write/reset operations

### Validation System
- Validators map prevents invalid values
- Array keys parsed from JSON strings
- Unknown keys rejected with helpful error

### Backward Compatibility
- retry.js exports unchanged
- feedback.js exports unchanged
- stack.js (with Stack prefix) exports unchanged
- murm.js config functions unchanged

## Implementation Notes for Codey

1. **Create `src/config-factory.js`** with `createConfigModule(options)` factory
2. **Options object shape**:
   ```js
   {
     name: string,           // Config name for display
     file: string,           // Path like '.claude/foo.json'
     defaults: object,       // Default config values
     validators?: object,    // Key -> validator function
     formatters?: object,    // Key -> display formatter
     arrayKeys?: string[]    // Keys that accept JSON array values
   }
   ```
3. **Validator functions** return `true` for valid, or error string for invalid
4. **Error format**: `Invalid value for {key}: {value}. {reason}`
5. **Refactor existing modules** to use factory while preserving all exports

## Running Tests
```bash
cd .claude/worktrees/feat-config-factory
node --test test/feature_config-factory.test.js
```
