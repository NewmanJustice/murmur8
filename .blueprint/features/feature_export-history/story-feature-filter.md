# Story — Feature Filtering

## User story

As a developer, I want to filter exported history by feature slug so that I can extract execution data for a specific feature across all its runs.

---

## Acceptance criteria

**AC-1 — Filter by exact feature slug**
- Given the history file contains entries for multiple features,
- When I run `murmur8 history export --feature=user-auth`,
- Then only entries where `slug === 'user-auth'` are included in the output.

**AC-2 — Exact match only**
- Given the history file contains entries for "user-auth" and "user-auth-v2",
- When I run `murmur8 history export --feature=user-auth`,
- Then only entries with exact slug "user-auth" are included (not "user-auth-v2").

**AC-3 — No matches returns empty result**
- Given the history file contains entries but none matching the specified slug,
- When I run `murmur8 history export --feature=nonexistent`,
- Then the output is a valid empty structure (CSV header only or empty JSON array).

**AC-4 — Combine with other filters**
- Given the history file contains multiple entries for a feature with different statuses,
- When I run `murmur8 history export --feature=user-auth --status=failed`,
- Then only entries matching both the feature slug AND the status are included.

**AC-5 — Case-sensitive matching**
- Given the history file contains an entry with slug "User-Auth",
- When I run `murmur8 history export --feature=user-auth`,
- Then no entries are returned (matching is case-sensitive).

---

## Out of scope

- Substring or pattern matching
- Multiple feature slugs in a single filter
- Case-insensitive matching option
