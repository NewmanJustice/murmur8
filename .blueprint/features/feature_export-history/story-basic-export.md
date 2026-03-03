# Story — Basic Export

## User story

As a developer, I want to export pipeline history to CSV or JSON format so that I can analyze execution data in spreadsheets or integrate with external tools.

---

## Acceptance criteria

**AC-1 — Default CSV export to stdout**
- Given the history file contains one or more entries,
- When I run `murmur8 history export`,
- Then the output is written to stdout in CSV format with a header row.

**AC-2 — Explicit CSV format selection**
- Given the history file contains entries,
- When I run `murmur8 history export --format=csv`,
- Then the output is CSV format with columns: slug, status, startedAt, completedAt, totalDurationMs, failedStage, pausedAfter.

**AC-3 — JSON format selection**
- Given the history file contains entries,
- When I run `murmur8 history export --format=json`,
- Then the output is a pretty-printed JSON array containing all history entries with their full structure.

**AC-4 — Empty history produces valid structure**
- Given the history file is empty or does not exist,
- When I run `murmur8 history export --format=csv`,
- Then the output is a CSV header row with no data rows.

**AC-5 — Empty history produces valid JSON**
- Given the history file is empty or does not exist,
- When I run `murmur8 history export --format=json`,
- Then the output is an empty JSON array `[]`.

**AC-6 — Corrupted history file handling**
- Given the history file contains invalid JSON,
- When I run `murmur8 history export`,
- Then the command exits with code 1 and displays an error message suggesting `history clear`.

---

## Out of scope

- Exporting nested stage data in CSV (available in JSON only)
- Streaming output for large files
- Custom column selection
- Export of queue state or insights aggregations
