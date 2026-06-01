# Story: Version Help Discoverability

**Feature:** display-version-number
**Story slug:** version-help-discoverability

---

## User Story

As a developer using murmur8,
I want the `--version` flag and `version` command to appear in `murmur8 help` output
so that I can discover how to check the installed version without consulting external documentation.

---

## Acceptance Criteria

**AC1 — `help` output lists the `version` sub-command**
- Given the murmur8 CLI is installed
- When the user runs `murmur8 help` (or `murmur8 --help`)
- Then stdout includes a reference to the `version` sub-command

**AC2 — `help` output documents the `--version` flag**
- Given the murmur8 CLI is installed
- When the user runs `murmur8 help` (or `murmur8 --help`)
- Then stdout includes a reference to the `--version` flag (and `-V` short alias)

**AC3 — Help output is not affected by version invocations**
- Given the murmur8 CLI is installed
- When the user runs `murmur8 help` after previously running `murmur8 --version`
- Then the help output is unchanged (no side effects from version invocation)

---

## Out of Scope

- Displaying version output within the help text itself
- Adding a dedicated `murmur8 help version` sub-help page
- Any changes to help output unrelated to the version flag/command
