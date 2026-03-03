# Handoff: Nigel -> Codey

## Feature: split-cli-commands

## Test Summary
- **Test file**: `test/feature_split-cli-commands.test.js`
- **Test count**: 26 test cases
- **Coverage**: Module structure, aliases, router constraints, command descriptions

## Key Test Requirements

1. **Directory structure**: `src/commands/` must exist with 12 command modules
2. **Module interface**: Each command exports `run(args)` function and `description` string
3. **Router constraint**: `bin/cli.js` must be <= 100 lines (thin router)
4. **Aliases**: murm/parallel/murmuration and murm-config/parallel-config must work

## Commands to Extract

| Command | Source Lines (approx) |
|---------|----------------------|
| init | 3 lines |
| update | 3 lines |
| queue | 8 lines |
| validate | 8 lines |
| history | 28 lines |
| insights | 12 lines |
| retry-config | 16 lines |
| feedback-config | 16 lines |
| stack-config | 16 lines |
| murm-config | 34 lines |
| murm (parallel) | 86 lines |
| help | 68 lines |

## Implementation Notes

- `parseFlags()` helper can stay in cli.js or move to `src/commands/utils.js`
- Aliases should be handled in the router, not in individual commands
- Each command file should be self-contained with its imports
- Help text for each command should match current output exactly

## Run Tests
```bash
cd /workspaces/agent-workflow/.claude/worktrees/feat-split-cli-commands
node --test test/feature_split-cli-commands.test.js
```
