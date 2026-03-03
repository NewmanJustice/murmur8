# Story — Date Filtering

## User story

As a developer, I want to filter exported history by date range so that I can extract data for specific time periods for reporting or analysis.

---

## Acceptance criteria

**AC-1 — Filter by since date**
- Given the history file contains entries from multiple dates,
- When I run `murmur8 history export --since=2024-01-15`,
- Then only entries where `completedAt >= 2024-01-15T00:00:00` (local time) are included in the output.

**AC-2 — Filter by until date**
- Given the history file contains entries from multiple dates,
- When I run `murmur8 history export --until=2024-01-20`,
- Then only entries where `completedAt <= 2024-01-20T23:59:59` (local time) are included in the output.

**AC-3 — Combined date range filter**
- Given the history file contains entries from multiple dates,
- When I run `murmur8 history export --since=2024-01-15 --until=2024-01-20`,
- Then only entries within the inclusive date range are included in the output.

**AC-4 — No matches returns empty result**
- Given the history file contains entries but none within the specified range,
- When I run `murmur8 history export --since=2099-01-01`,
- Then the output is a valid empty structure (CSV header only or empty JSON array).

**AC-5 — Invalid date format error**
- Given an invalid date format is provided,
- When I run `murmur8 history export --since=invalid-date`,
- Then the command exits with code 1 and displays a usage hint showing the expected YYYY-MM-DD format.

---

## Out of scope

- Time-of-day filtering (only date precision)
- Timezone configuration (uses local timezone)
- Relative date expressions (e.g., "last week")
