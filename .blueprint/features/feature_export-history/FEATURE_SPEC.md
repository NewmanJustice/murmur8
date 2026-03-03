# Feature Specification — Export Pipeline History

## 1. Feature Intent

**Why this feature exists.**

Users need to extract pipeline history data for analysis, reporting, and integration with external tools. The existing `history` and `insights` commands provide on-demand viewing, but teams often require:

- **Spreadsheet analysis** — CSV export for pivot tables, charts, and ad-hoc queries
- **Custom dashboards** — JSON export for ingestion into monitoring tools or team portals
- **Filtered exports** — Ability to slice data by date range, status, or specific features

This feature supports the system purpose of **observability** (System Spec Section 8) by making pipeline execution data portable and actionable beyond the CLI.

---

## 2. Scope

### In Scope

- New `export` subcommand under `murmur8 history`
- Export formats: CSV and JSON
- Filtering options: `--since`, `--until`, `--status`, `--feature`
- Output to stdout (default) or file via `--output`

### Out of Scope

- Export of queue state (`.claude/implement-queue.json`) — separate concern
- Scheduled/automated exports — users can integrate via shell scripts
- Direct integration with external services (Slack, email, dashboards)
- Aggregated statistics export — `--stats` output remains display-only

---

## 3. Actors Involved

### Human User

- **Can:** Export history data in CSV or JSON format, apply filters, redirect to file
- **Cannot:** Export queue state or insights aggregations through this command

---

## 4. Behaviour Overview

**Happy Path:**

1. User runs `murmur8 history export --format=csv`
2. System reads `.claude/pipeline-history.json`
3. System converts entries to CSV format
4. System outputs to stdout

**With Filters:**

1. User runs `murmur8 history export --format=json --since=2024-01-01 --status=failed`
2. System reads history, filters by date and status
3. System outputs filtered JSON to stdout

**To File:**

1. User runs `murmur8 history export --format=csv --output=report.csv`
2. System writes CSV to specified file
3. System prints confirmation message

**Edge Cases:**

- Empty history: Output empty array/CSV header with no data rows
- Corrupted history file: Warn and exit with non-zero status
- No matches for filters: Output empty result (not an error)
- Invalid date format: Error with usage hint

---

## 5. State & Lifecycle Interactions

This feature is **state-reading only**. It does not modify pipeline state.

- **Reads:** `.claude/pipeline-history.json`
- **Does not modify:** Any state files or artifacts

---

## 6. Rules & Decision Logic

### Format Selection Rule

| `--format` value | Output |
|------------------|--------|
| `csv` (default) | Comma-separated values with header row |
| `json` | Pretty-printed JSON array |

### Date Filtering Rules

- `--since=YYYY-MM-DD`: Include entries where `completedAt >= since`
- `--until=YYYY-MM-DD`: Include entries where `completedAt <= until`
- Both can be combined for a range
- Dates are interpreted as start of day (00:00:00) in local timezone

### Status Filtering Rule

- `--status=success|failed|paused`: Include only entries with matching status
- Multiple values not supported in v1 (e.g., no `--status=success,failed`)

### Feature Filtering Rule

- `--feature=<slug>`: Include only entries matching the feature slug
- Exact match (not substring)

### Output Destination Rule

- No `--output`: Write to stdout
- `--output=<path>`: Write to file, creating parent directories if needed

---

## 7. Dependencies

### System Components

- `src/history.js` — Existing `readHistoryFile()` function for reading history
- `src/theme.js` — Optional colorization for confirmation messages

### Data Format

Relies on existing history entry structure:

```javascript
{
  slug: string,
  status: 'success' | 'failed' | 'paused',
  startedAt: ISO8601,
  completedAt: ISO8601,
  totalDurationMs: number,
  stages: { [stage]: { durationMs, feedback? } },
  failedStage?: string,
  pausedAfter?: string
}
```

---

## 8. Non-Functional Considerations

### Performance

- History files are typically small (<1MB). No streaming required for v1.
- If performance becomes an issue with large histories, consider streaming JSON output.

### Error Handling

- Invalid date format: Exit with code 1, print usage hint
- Missing history file: Treat as empty (not an error)
- Corrupted history file: Exit with code 1, suggest `history clear`
- File write error: Exit with code 1 with descriptive message

---

## 9. Assumptions & Open Questions

### Assumptions

- History file structure is stable (no migration needed)
- Users have write permissions for `--output` destination
- Date parsing uses native JavaScript Date (ISO 8601 format expected)

### Open Questions

- **Q:** Should we support `--limit` to cap exported rows?
  - **A:** Defer to v2. Users can pipe to `head` for now.
- **Q:** Should CSV include nested stage data?
  - **A:** v1 exports top-level fields only. Stage details available in JSON.

---

## 10. Impact on System Specification

This feature **reinforces** existing system assumptions:

- Aligns with observability cross-cutting concern (System Spec Section 8)
- Builds on existing history module without modifying its behavior
- Does not introduce new state, lifecycle, or invariant changes

No system spec changes required.

---

## 11. Handover to BA (Cass)

### Story Themes

1. **Basic Export** — Export history to CSV or JSON format
2. **Date Filtering** — Filter exports by date range
3. **Status Filtering** — Filter exports by pipeline status
4. **Feature Filtering** — Filter exports by feature slug
5. **File Output** — Write exports to a file instead of stdout

### Expected Story Boundaries

- Each filter type should be a separate story for independent testing
- File output can be combined with basic export
- Error handling can be implicit in each story's acceptance criteria

### Areas Needing Careful Story Framing

- CSV field ordering and escaping rules (commas, quotes in slugs)
- Empty result behavior (should still output valid CSV/JSON structure)
- Date parsing edge cases (timezone handling, invalid formats)

---

## 12. Change Log (Feature-Level)

| Date | Change | Reason | Raised By |
|------|--------|--------|-----------|
| 2026-03-03 | Initial feature specification | Implement export-history from backlog | Alex |
