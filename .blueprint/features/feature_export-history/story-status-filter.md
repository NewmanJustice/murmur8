# Story — Status Filtering

## User story

As a developer, I want to filter exported history by pipeline status so that I can analyze specific outcomes like failures or successful runs.

---

## Acceptance criteria

**AC-1 — Filter by success status**
- Given the history file contains entries with mixed statuses,
- When I run `murmur8 history export --status=success`,
- Then only entries with `status === 'success'` are included in the output.

**AC-2 — Filter by failed status**
- Given the history file contains entries with mixed statuses,
- When I run `murmur8 history export --status=failed`,
- Then only entries with `status === 'failed'` are included in the output.

**AC-3 — Filter by paused status**
- Given the history file contains entries with mixed statuses,
- When I run `murmur8 history export --status=paused`,
- Then only entries with `status === 'paused'` are included in the output.

**AC-4 — No matches returns empty result**
- Given the history file contains entries but none with the specified status,
- When I run `murmur8 history export --status=failed`,
- Then the output is a valid empty structure (CSV header only or empty JSON array).

**AC-5 — Invalid status value error**
- Given an invalid status value is provided,
- When I run `murmur8 history export --status=unknown`,
- Then the command exits with code 1 and displays an error listing valid status values: success, failed, paused.

---

## Out of scope

- Multiple status values in a single filter (e.g., `--status=success,failed`)
- Negation filters (e.g., exclude failed)
- Custom status values
