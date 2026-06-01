# Test Spec: display-version-number

## Coverage Map

| Test ID | Story AC | Description |
|---------|----------|-------------|
| DVN-1   | VI-AC1   | `--version` prints bare semver + newline, exits 0 |
| DVN-2   | VI-AC2   | `-V` output identical to `--version` |
| DVN-3   | VI-AC3   | `version` sub-command output identical to `--version` |
| DVN-4   | VI-AC5   | Printed version matches `package.json` `version` field |
| DVN-5   | VI-AC1   | No `v` prefix in output |
| DVN-6   | VI-AC1   | No ANSI escape codes in output |
| DVN-7   | VI-AC4   | No `.claude/` files created or modified after invocation |
| DVN-8   | VI-AC6   | Unreadable `package.json` → non-zero exit, stderr message, no stdout version |
| DVN-9   | HD-AC1   | `murmur8 help` stdout contains `version` sub-command reference |
| DVN-10  | HD-AC2   | `murmur8 help` stdout contains `--version` flag reference |
| DVN-11  | HD-AC2   | `murmur8 help` stdout contains `-V` alias reference |

## Assertions

### DVN-1 to DVN-3 (invocation parity)
- Spawn `node bin/cli.js --version` (and `-V`, `version`)
- Assert `stdout.trim()` matches semver regex `/^\d+\.\d+\.\d+$/`
- Assert `status === 0`
- Assert `stdout` equals `<version>\n` exactly (single trailing newline, nothing else)

### DVN-4 (runtime read from package.json)
- Read `version` from `package.json` via `require('../package.json').version`
- Assert trimmed stdout equals that value

### DVN-5 to DVN-6 (format guards)
- Assert stdout does not start with `v`
- Assert stdout contains no ANSI escape sequences (`\x1b[`)

### DVN-7 (no side effects)
- Record `.claude/` directory state before invocation (mtime snapshot or file list)
- Run `--version`; assert state unchanged

### DVN-8 (error path)
- Copy CLI to tmp dir with a removed/invalid `package.json`; OR temporarily rename file and restore
- Assert `status !== 0`
- Assert `stderr` contains a descriptive message
- Assert `stdout` is empty (no version string printed)

### DVN-9 to DVN-11 (help discoverability)
- Spawn `node bin/cli.js help`
- Assert `stdout` includes `version` string
- Assert `stdout` includes `--version` string
- Assert `stdout` includes `-V` string

## Ambiguities Resolved

- Output is `<semver>\n` — exactly one trailing newline; no leading whitespace, no banner
- AC4 (flag intercept before routing) is observable as a side-effect test (DVN-7), not a white-box test
- AC3 (help unchanged after version run) is idempotent by nature of CLI; covered implicitly by DVN-9–11
