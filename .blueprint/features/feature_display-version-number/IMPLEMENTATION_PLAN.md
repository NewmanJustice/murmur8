# Implementation Plan: display-version-number

## Summary

Add `--version` / `-V` flag interception and a `version` sub-command to the
murmur8 CLI. Version is read from `package.json` resolved relative to
`bin/cli.js` (not `cwd`) so the error path test (DVN-8) works correctly.
Help output is updated to list the sub-command and both flags.

## Files to Create/Modify

| Path | Action | Purpose |
|------|--------|---------|
| `src/commands/version.js` | Create | Reads `package.json`, writes bare semver to stdout, handles error path |
| `bin/cli.js` | Modify | Intercept `--version`/`-V` before command routing; add `version` alias |
| `src/commands/help.js` | Modify | Add `version`, `--version`, and `-V` entries to help text |

## Implementation Steps

1. **Create `src/commands/version.js`**
   - Accept `pkgRoot` option (defaults to `path.join(__dirname, '../../')`) so
     the path is always resolved relative to `bin/cli.js` via `__dirname` logic.
   - In `run()`: read `package.json` with `fs.readFileSync`; on success write
     `version + '\n'` to stdout and exit 0; on error write a descriptive message
     to stderr and exit 1 (no stdout output).
   - Export `{ run, description }`.

2. **Intercept `--version` and `-V` in `bin/cli.js`**
   - Before the `if (!command || command === 'help' …)` block, add:
     `if (command === '--version' || command === '-V') { require version cmd, run, return; }`
   - Pass the resolved `pkgRoot` (`path.join(__dirname, '../package.json')`) so
     `version.js` knows where to look.

3. **Add `version` sub-command alias in `bin/cli.js`**
   - Add `'version': 'version'` to the `aliases` map (or simply ensure
     `src/commands/version.js` is found by the existing dynamic loader since the
     file name matches the sub-command name — no alias entry needed).

4. **Update `src/commands/help.js`**
   - Add a `version` line to the Commands block (e.g. next to `help`):
     `version               Print the installed murmur8 version`
   - Add a flags section or inline note:
     `--version, -V         Print version and exit`
   - Both strings must appear literally in the output (DVN-9, DVN-10, DVN-11).

5. **Verify test coverage incrementally**
   - Steps 1–2 make DVN-1 through DVN-8 pass.
   - Step 3 makes DVN-3 pass (version sub-command).
   - Step 4 makes DVN-9, DVN-10, DVN-11 pass.

## Risks / Questions

- **DVN-8 destructive rename**: the test temporarily deletes `package.json`
  from the project root. `version.js` must NOT cache `require('../package.json')`
  at module load time — it must use `fs.readFileSync` inside `run()` so the
  missing-file error is triggered at invocation, not at `require` time.
- **`process.exit` in version.js**: calling `process.exit` directly is fine for
  the CLI handler; ensure error branch uses exit code 1 and writes nothing to
  stdout before exiting.
