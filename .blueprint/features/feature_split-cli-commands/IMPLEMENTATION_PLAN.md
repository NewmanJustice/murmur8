# Implementation Plan: Split CLI Commands

## Overview
Extract command handlers from `bin/cli.js` (437 lines) into `src/commands/` directory, leaving a thin router (~50-80 lines).

## Phase 1: Create Directory Structure
- Create `src/commands/` directory
- Create `src/commands/utils.js` for shared utilities (parseFlags)

## Phase 2: Extract Commands (in order of complexity)

### Simple Commands (no subcommands)
1. **init.js** - Direct passthrough to `src/init.js`
2. **update.js** - Direct passthrough to `src/update.js`
3. **help.js** - Contains showHelp() function

### Commands with Flags
4. **validate.js** - Calls validate(), formats output, sets exit code
5. **insights.js** - Handles --bottlenecks, --failures, --json, --feedback flags

### Commands with Subcommands
6. **queue.js** - Handles `reset` subcommand
7. **history.js** - Handles `clear`, `export`, --stats, --all flags
8. **retry-config.js** - Handles `set`, `reset` subcommands
9. **feedback-config.js** - Handles `set`, `reset` subcommands
10. **stack-config.js** - Handles `set`, `reset` subcommands
11. **murm-config.js** - Handles `set`, `reset` subcommands (with aliases)

### Complex Commands
12. **murm.js** - Handles status, rollback, cleanup, abort subcommands + main execution (with aliases)

## Phase 3: Refactor Router
- Replace inline handlers with dynamic loading from `src/commands/`
- Handle aliases in router (murm/parallel/murmuration, murm-config/parallel-config)
- Keep under 100 lines

## File Structure After Refactoring

```
src/commands/
  init.js
  update.js
  queue.js
  validate.js
  history.js
  insights.js
  retry-config.js
  feedback-config.js
  stack-config.js
  murm-config.js
  murm.js
  help.js
  utils.js          # parseFlags helper
```

## Command Module Template

```javascript
// src/commands/<name>.js
const description = 'Short description for help';

async function run(args) {
  // Command implementation
}

module.exports = { run, description };
```

## Router Template (bin/cli.js)

```javascript
#!/usr/bin/env node
const path = require('path');

const args = process.argv.slice(2);
const command = args[0];

// Alias resolution
const aliases = {
  'parallel': 'murm',
  'murmuration': 'murm',
  'parallel-config': 'murm-config'
};

const resolvedCommand = aliases[command] || command;

// Dynamic loading
async function main() {
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    const help = require('../src/commands/help');
    help.run(args);
    return;
  }

  const cmdPath = path.join(__dirname, '../src/commands', `${resolvedCommand}.js`);
  try {
    const cmd = require(cmdPath);
    await cmd.run(args);
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
      console.error(`Unknown command: ${command}`);
      console.error('Run "agent-workflow help" for usage information.');
      process.exit(1);
    }
    throw err;
  }
}

main().catch(err => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
```

## Test Command
```bash
cd /workspaces/agent-workflow/.claude/worktrees/feat-split-cli-commands
node --test test/feature_split-cli-commands.test.js
```
