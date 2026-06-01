# Story: Version Invocation

**Feature:** display-version-number
**Story slug:** version-invocation

---

## User Story

As a developer using murmur8,
I want to run `murmur8 --version`, `murmur8 -V`, or `murmur8 version`
so that I can quickly confirm which version of the package is installed without reading `package.json` directly.

---

## Acceptance Criteria

**AC1 — `--version` flag prints bare semver and exits**
- Given the murmur8 CLI is installed
- When the user runs `murmur8 --version`
- Then stdout contains exactly the bare semver string (e.g., `4.7.6`) followed by a single newline, with no `v` prefix, no banner, and no ANSI colour codes
- And the process exits with code 0

**AC2 — `-V` short alias behaves identically to `--version`**
- Given the murmur8 CLI is installed
- When the user runs `murmur8 -V`
- Then stdout is identical to the output of `murmur8 --version`
- And the process exits with code 0

**AC3 — `version` sub-command behaves identically to the flag form**
- Given the murmur8 CLI is installed
- When the user runs `murmur8 version`
- Then stdout is identical to the output of `murmur8 --version`
- And the process exits with code 0

**AC4 — Flag intercept happens before command routing**
- Given the murmur8 CLI is installed
- When the user runs `murmur8 --version`
- Then the CLI intercepts the flag before any command module is loaded or executed
- And no queue state is read or modified, and no agents are spawned

**AC5 — Version is read from `package.json` at runtime**
- Given the murmur8 CLI is installed
- When any version invocation is run
- Then the printed version string matches the `version` field in the root `package.json` exactly
- And the output is not a hardcoded string

**AC6 — Error path: unreadable `package.json`**
- Given the root `package.json` cannot be read (e.g., missing or malformed)
- When the user runs any version invocation
- Then the process exits with a non-zero exit code
- And a descriptive error message is written to stderr
- And no version string is printed to stdout

**AC7 — No side effects**
- Given any version invocation is run
- When the command completes
- Then no files under `.claude/` are created or modified
- And no pipeline stages are entered

---

## Out of Scope

- Displaying the Node.js version alongside the murmur8 version
- Displaying versions of peer dependencies
- `v`-prefixed output (e.g., `v4.7.6`) — output is always bare semver
- Remote registry version checking or update notifications
- Structured output formats (e.g., `--format=json`)
- Changelog or release notes output
