# Implementation Plan — Theme Adoption

## Overview
Adopt theme.js across all CLI output modules for consistent visual formatting. Replace inline ANSI codes with centralized `colorize()` helper.

## Changes Required

### 1. src/validate.js
**Current state:** Uses inline ANSI codes for colors
**Change:** Import `colorize` from theme.js and use it

```javascript
// Before
const green = useColor ? '\x1b[32m' : '';
const red = useColor ? '\x1b[31m' : '';
const reset = useColor ? '\x1b[0m' : '';

// After
const { colorize } = require('./theme');
// Use colorize(text, 'green', useColor)
```

### 2. src/insights.js
**Current state:** No theme imports, plain section headers
**Change:** Import `colorize`, apply to section headers

- Header "Pipeline Insights" - cyan
- Section headers (BOTTLENECK ANALYSIS, etc.) - cyan
- Recommendations - yellow

### 3. src/retry.js
**Current state:** Plain text output in displayConfig()
**Change:** Import `colorize`, apply to header

- Header "Retry Configuration" - cyan
- Section "Stage Strategies" - cyan

### 4. src/feedback.js
**Current state:** Plain text output in displayConfig()
**Change:** Import `colorize`, apply to header

- Header "Feedback Configuration" - cyan
- Section "Issue Mappings" - cyan

### 5. src/stack.js
**Current state:** Plain text output in displayStackConfig()
**Change:** Import `colorize`, apply to header

- Header "Stack Configuration" - cyan

### 6. src/history.js
**Current state:** Already imports colorize from theme.js
**Change:** No changes needed - already compliant

## TTY Detection Pattern
All display functions should:
1. Check `process.stdout.isTTY` to determine if colors should be enabled
2. Pass this as `useColor` parameter to `colorize()`

## Implementation Order
1. validate.js - Replace inline ANSI with colorize import
2. insights.js - Add colorize for headers
3. retry.js - Add colorize for displayConfig
4. feedback.js - Add colorize for displayConfig
5. stack.js - Add colorize for displayStackConfig

## Testing
Run `node --test test/feature_theme-adoption.test.js` after each change.
