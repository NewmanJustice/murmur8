# Story — File Output

## User story

As a developer, I want to write exported history directly to a file so that I can save reports without shell redirection and receive confirmation of the write.

---

## Acceptance criteria

**AC-1 — Write to specified file**
- Given the history file contains entries,
- When I run `murmur8 history export --output=report.csv`,
- Then the export is written to `report.csv` in the current directory.

**AC-2 — Success confirmation message**
- Given the export writes successfully,
- When I run `murmur8 history export --output=report.csv`,
- Then a confirmation message is displayed showing the file path and entry count.

**AC-3 — Create parent directories**
- Given the output path includes directories that do not exist,
- When I run `murmur8 history export --output=reports/2024/january.csv`,
- Then the parent directories are created and the file is written.

**AC-4 — Combine with format option**
- Given the history file contains entries,
- When I run `murmur8 history export --format=json --output=report.json`,
- Then the file contains JSON-formatted export data.

**AC-5 — File write error handling**
- Given the output path is not writable (e.g., permission denied),
- When I run `murmur8 history export --output=/readonly/report.csv`,
- Then the command exits with code 1 and displays a descriptive error message.

**AC-6 — Overwrite existing file**
- Given a file already exists at the output path,
- When I run `murmur8 history export --output=existing.csv`,
- Then the existing file is overwritten without prompting.

---

## Out of scope

- Interactive overwrite confirmation
- Append mode for existing files
- Automatic file extension based on format
- Output to multiple files
