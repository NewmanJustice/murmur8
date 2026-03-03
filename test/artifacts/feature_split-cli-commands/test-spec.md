# Test Specification: Split CLI Commands

## Understanding

This feature refactors `bin/cli.js` (437 lines) into a thin router that delegates to individual command handlers in `src/commands/`. No user-facing behavior changes - pure internal refactoring.

## Test Strategy

Since this is a refactoring feature, tests must verify:
1. All commands remain functional after extraction
2. Command aliases continue to work
3. Error handling is preserved
4. Help output format is unchanged

## Test Mapping

| Test Case | Verifies |
|-----------|----------|
| Command module structure | Each command exports `run`, `description` |
| Router dispatches correctly | `bin/cli.js` loads and calls correct handler |
| Init command works | `src/commands/init.js` functions correctly |
| Update command works | `src/commands/update.js` functions correctly |
| Queue command works | `src/commands/queue.js` handles subargs |
| Validate command works | `src/commands/validate.js` returns proper exit codes |
| History command works | `src/commands/history.js` handles all flags |
| Insights command works | `src/commands/insights.js` handles flags |
| Config commands work | retry-config, feedback-config, stack-config, murm-config |
| Murm command works | `src/commands/murm.js` handles subcommands |
| Aliases resolve | murm/parallel/murmuration all work |
| Unknown command error | Router rejects unknown commands |
| Help command works | Shows help text |

## Test Implementation

File: `test/feature_split-cli-commands.test.js`
