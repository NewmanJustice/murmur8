# Implementation Plan — Export Pipeline History

## Summary

Add `exportHistory()` function to `src/history.js` that reads pipeline history, applies optional filters (date range, status, feature slug), and outputs CSV or JSON. Wire `history export` subcommand in CLI to invoke this function with parsed flags.

## Files to Create/Modify

| Path | Action | Purpose |
|------|--------|---------|
| `src/history.js` | Modify | Add `exportHistory()` function with filtering, CSV/JSON formatting, file output |
| `bin/cli.js` | Modify | Add `export` subcommand to `history` handler, parse new flags |

## Implementation Steps

1. **Add date validation helper** in `src/history.js` — validate YYYY-MM-DD format, return Date or null

2. **Add CSV formatter** in `src/history.js` — convert entry array to CSV string with header row (slug, status, startedAt, completedAt, totalDurationMs, failedStage, pausedAfter), escape commas/quotes in values

3. **Add JSON formatter** in `src/history.js` — pretty-print array with 2-space indent

4. **Implement `exportHistory(options)` function** in `src/history.js`:
   - Read history via `readHistoryFile()`
   - Return `{ exitCode: 1, error: '...' }` if corrupted
   - Apply filters: `since`, `until`, `status`, `feature` (all optional)
   - Validate date formats and status values, return error if invalid
   - Format output as CSV (default) or JSON based on `options.format`
   - If `options.output`: write to file (create parent dirs), return `{ message: '...' }`
   - Otherwise return `{ output: '...' }` for stdout

5. **Export `exportHistory`** from `src/history.js` module.exports

6. **Add export subcommand handling** in `bin/cli.js`:
   - In `history` command handler, check if `subArg === 'export'`
   - Parse flags: `--format=csv|json`, `--since=YYYY-MM-DD`, `--until=YYYY-MM-DD`, `--status=success|failed|paused`, `--feature=<slug>`, `--output=<path>`
   - Call `exportHistory()` with options object
   - Print `result.output` to stdout or `result.message` for file confirmation
   - Exit with `result.exitCode` if error

7. **Update help text** in `showHelp()` to document `history export` and its flags

8. **Run tests** — `node --test test/feature_export-history.test.js`

## Risks/Questions

- CSV escaping edge case: slugs containing commas or quotes need proper RFC 4180 escaping (wrap in quotes, double internal quotes)
- Date filtering uses `completedAt` per spec; entries without `completedAt` should be excluded from date filters
- Empty/missing history file treated as empty array (not an error per spec)
