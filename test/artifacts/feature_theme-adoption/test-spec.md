# Test Specification — Theme Adoption

## Understanding

This feature adopts theme.js across all CLI output modules for consistent visual formatting. The goal is to replace inline ANSI codes with centralized `colorize()` helper and status icons from theme.js.

**Files to test:**
- `src/validate.js` - Use `colorize()` for pass/fail indicators
- `src/history.js` - Already uses `colorize()`, verify consistency
- `src/insights.js` - Use `colorize()` for recommendations and section headers
- `src/retry.js` - Use `colorize()` in `displayConfig()`
- `src/feedback.js` - Use `colorize()` in `displayConfig()`
- `src/stack.js` - Use `colorize()` in `displayStackConfig()`

## Test Mapping

| Acceptance Criteria | Test Case |
|---------------------|-----------|
| validate.js uses colorize() | `formatOutput()` returns colored indicators when TTY |
| validate.js respects TTY | `formatOutput()` returns plain text when useColor=false |
| insights.js uses colorize() | `formatTextOutput()` includes themed headers |
| retry.js uses colorize() | `displayConfig()` outputs themed section headers |
| feedback.js uses colorize() | `displayConfig()` outputs themed section headers |
| stack.js uses colorize() | `displayStackConfig()` outputs themed headers |
| TTY detection works | All modules check `process.stdout.isTTY` |
| Plain text fallback | Colored output disabled when not TTY or redirected |

## Test Strategy

1. Unit tests capture console output and verify:
   - ANSI escape codes present when useColor=true
   - No ANSI codes when useColor=false
   - Status icons used consistently (checkmark, X, warning)

2. Integration approach:
   - Mock `process.stdout.isTTY` for testing both scenarios
   - Verify output contains expected themed elements
