# Test Specification — Export Pipeline History

## Understanding

The export-history feature adds `murmur8 history export` subcommand to export pipeline history data. It supports CSV (default) and JSON formats, with filtering by date range (`--since`, `--until`), status (`--status`), and feature slug (`--feature`). Output goes to stdout by default or to a file via `--output`. The feature reads from `.claude/pipeline-history.json` and is state-reading only.

---

## AC to Test ID Mapping

### Story: Basic Export (story-basic-export.md)

| AC | Test ID | Scenario |
|----|---------|----------|
| AC-1 | T-BE-1.1 | Default export outputs CSV to stdout |
| AC-2 | T-BE-2.1 | --format=csv outputs correct columns |
| AC-3 | T-BE-3.1 | --format=json outputs full structure |
| AC-4 | T-BE-4.1 | Empty history outputs CSV header only |
| AC-5 | T-BE-5.1 | Empty history outputs empty JSON array |
| AC-6 | T-BE-6.1 | Corrupted file exits with code 1 and error message |

### Story: Date Filtering (story-date-filter.md)

| AC | Test ID | Scenario |
|----|---------|----------|
| AC-1 | T-DF-1.1 | --since filters entries >= date |
| AC-2 | T-DF-2.1 | --until filters entries <= date |
| AC-3 | T-DF-3.1 | Combined --since and --until filters range |
| AC-4 | T-DF-4.1 | No matches returns empty structure |
| AC-5 | T-DF-5.1 | Invalid date format exits with code 1 |

### Story: Status Filtering (story-status-filter.md)

| AC | Test ID | Scenario |
|----|---------|----------|
| AC-1 | T-SF-1.1 | --status=success filters success entries |
| AC-2 | T-SF-2.1 | --status=failed filters failed entries |
| AC-3 | T-SF-3.1 | --status=paused filters paused entries |
| AC-4 | T-SF-4.1 | No matches returns empty structure |
| AC-5 | T-SF-5.1 | Invalid status value exits with code 1 |

### Story: Feature Filtering (story-feature-filter.md)

| AC | Test ID | Scenario |
|----|---------|----------|
| AC-1 | T-FF-1.1 | --feature filters by exact slug |
| AC-2 | T-FF-2.1 | Exact match only, no substring match |
| AC-3 | T-FF-3.1 | No matches returns empty structure |
| AC-4 | T-FF-4.1 | Combined filters (feature + status) |
| AC-5 | T-FF-5.1 | Case-sensitive matching |

### Story: File Output (story-file-output.md)

| AC | Test ID | Scenario |
|----|---------|----------|
| AC-1 | T-FO-1.1 | --output writes to specified file |
| AC-2 | T-FO-2.1 | Success confirmation with path and count |
| AC-3 | T-FO-3.1 | Creates parent directories if needed |
| AC-4 | T-FO-4.1 | --format=json --output writes JSON file |
| AC-5 | T-FO-5.1 | Permission error exits with code 1 |
| AC-6 | T-FO-6.1 | Overwrites existing file without prompt |

---

## Key Assumptions

- CSV columns: slug, status, startedAt, completedAt, totalDurationMs, failedStage, pausedAfter
- CSV values containing commas or quotes are properly escaped
- Date parsing uses YYYY-MM-DD format, interpreted as local timezone
- Valid status values: success, failed, paused
- Export function will be in src/history.js or a new src/export.js module
