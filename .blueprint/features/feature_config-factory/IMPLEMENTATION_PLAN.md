# Implementation Plan: Config Factory

## Overview
Create a factory function to eliminate ~320 lines of duplicated boilerplate across four config modules (retry.js, feedback.js, stack.js, murm.js).

## Step 1: Create `src/config-factory.js`

Create the factory module with the following structure:

```js
function createConfigModule(options) {
  const { name, file, defaults, validators = {}, formatters = {}, arrayKeys = [] } = options;

  return {
    CONFIG_FILE: file,
    getDefault: () => ({ ...defaults }),
    read: () => { /* merge defaults, handle errors */ },
    write: (config) => { /* ensure dir, write JSON */ },
    reset: () => { /* write defaults */ },
    setValue: (key, value) => { /* validate, write */ },
    display: () => { /* format and log */ }
  };
}
```

### Factory Methods Detail

| Method | Behavior |
|--------|----------|
| `getDefault()` | Return shallow copy of defaults |
| `read()` | Return defaults if missing/corrupted, merge missing keys |
| `write(config)` | Create dir if needed, write JSON with 2-space indent |
| `reset()` | Call write(getDefault()) |
| `setValue(key, value)` | Validate key exists, parse arrays, run validator, write |
| `display()` | Log name header, iterate keys with formatters |

### Validation Logic
```js
setValue(key, value) {
  if (!(key in defaults)) throw Error(`Unknown config key: ${key}. Valid keys: ...`);

  let parsed = value;
  if (arrayKeys.includes(key)) {
    parsed = JSON.parse(value); // throws on invalid
    if (!Array.isArray(parsed)) throw Error(`${key} must be a JSON array`);
  } else if (typeof defaults[key] === 'number') {
    parsed = parseFloat(value);
  } else if (typeof defaults[key] === 'boolean') {
    parsed = value === 'true';
  }

  if (validators[key]) {
    const result = validators[key](parsed);
    if (result !== true) {
      throw Error(`Invalid value for ${key}: ${value}. ${result}`);
    }
  }

  const config = read();
  config[key] = parsed;
  write(config);
}
```

## Step 2: Refactor retry.js

Keep existing business logic functions (calculateFailureRate, recommendStrategy, etc.).
Replace config boilerplate with factory:

```js
const { createConfigModule } = require('./config-factory');

const configModule = createConfigModule({
  name: 'Retry',
  file: '.claude/retry-config.json',
  defaults: {
    maxRetries: 3,
    windowSize: 10,
    highFailureThreshold: 0.2,
    strategies: { /* ... */ }
  },
  validators: {
    maxRetries: (v) => Number.isInteger(v) && v >= 0 ? true : 'must be a non-negative integer',
    windowSize: (v) => Number.isInteger(v) && v >= 1 ? true : 'must be a positive integer',
    highFailureThreshold: (v) => v >= 0 && v <= 1 ? true : 'must be between 0 and 1'
  }
});

// Re-export with same names for backward compatibility
const {
  CONFIG_FILE,
  getDefault: getDefaultConfig,
  read: readConfig,
  write: writeConfig,
  reset: resetConfig,
  display: displayConfig,
  setValue: setConfigValue
} = configModule;
```

## Step 3: Refactor feedback.js

Similar pattern. Keep validateFeedback, shouldPause, parseFeedbackFromOutput, normalizeFeedbackKeys.

```js
const configModule = createConfigModule({
  name: 'Feedback',
  file: '.claude/feedback-config.json',
  defaults: {
    minRatingThreshold: 3.0,
    enabled: true,
    issueMappings: { /* ... */ }
  },
  validators: {
    minRatingThreshold: (v) => v >= 1.0 && v <= 5.0 ? true : 'must be between 1.0 and 5.0',
    enabled: (v) => typeof v === 'boolean' ? true : 'must be true or false'
  }
});
```

## Step 4: Refactor stack.js

Keep detectStackConfig. Note: stack uses `*StackConfig` naming convention.

```js
const configModule = createConfigModule({
  name: 'Stack',
  file: '.claude/stack-config.json',
  defaults: {
    language: '', runtime: '', packageManager: '',
    frameworks: [], testRunner: '', testCommand: '',
    linter: '', tools: []
  },
  arrayKeys: ['frameworks', 'tools']
});

// Alias exports with Stack suffix for backward compatibility
const getDefaultStackConfig = configModule.getDefault;
const readStackConfig = configModule.read;
// etc.
```

## Step 5: Refactor murm.js Config Functions

Murm.js has additional complexity (migrations, special merge logic). Keep using factory for core operations but preserve migration logic.

```js
const configModule = createConfigModule({
  name: 'Murmuration',
  file: '.claude/murm-config.json',
  defaults: {
    maxConcurrency: 3, maxFeatures: 10, timeout: 30,
    minDiskSpaceMB: 500, cli: 'npx claude',
    skill: '/implement-feature', skillFlags: '--no-commit',
    worktreeDir: '.claude/worktrees', queueFile: '.claude/murm-queue.json'
  },
  validators: {
    maxConcurrency: (v) => Number.isInteger(v) && v >= 1 ? true : 'must be a positive integer',
    timeout: (v) => Number.isInteger(v) && v >= 1 ? true : 'must be a positive integer'
  },
  formatters: {
    timeout: (v) => `${v} min`
  }
});
```

Note: readMurmConfig needs to preserve migration logic for legacy files.

## Step 6: Run Tests

```bash
node --test test/feature_config-factory.test.js
```

Fix any failures, iterate until all 19 tests pass.

## Files Modified
- `src/config-factory.js` (new)
- `src/retry.js` (refactored)
- `src/feedback.js` (refactored)
- `src/stack.js` (refactored)
- `src/murm.js` (refactored config functions)

## Risk Mitigation
- All existing exports preserved with same names
- Business logic functions untouched
- Tests verify backward compatibility
