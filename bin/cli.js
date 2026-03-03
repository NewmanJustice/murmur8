#!/usr/bin/env node

const { init } = require('../src/init');
const { update } = require('../src/update');
const { displayQueue, resetQueue } = require('../src/orchestrator');
const { validate, formatOutput } = require('../src/validate');
const { displayHistory, showStats, clearHistory, exportHistory } = require('../src/history');
const { displayInsights } = require('../src/insights');
const { displayConfig, setConfigValue, resetConfig } = require('../src/retry');
const {
  displayConfig: displayFeedbackConfig,
  setConfigValue: setFeedbackConfigValue,
  resetConfig: resetFeedbackConfig
} = require('../src/feedback');
const {
  displayStackConfig,
  setStackConfigValue,
  resetStackConfig
} = require('../src/stack');
const { displayFeedbackInsights } = require('../src/insights');
const {
  formatStatus,
  getDefaultConfig,
  splitByLimit,
  runMurm,
  loadQueue,
  cleanupWorktrees,
  readMurmConfig,
  writeMurmConfig,
  getDefaultMurmConfig,
  abortMurm,
  getLockInfo,
  getDetailedStatus,
  formatDetailedStatus,
  rollbackMurm
} = require('../src/murm');

const args = process.argv.slice(2);
const command = args[0];
const subArg = args[1];

function parseFlags(args) {
  const flags = {};
  for (const arg of args) {
    if (arg === '--all') flags.all = true;
    if (arg === '--stats') flags.stats = true;
    if (arg === '--force') flags.force = true;
    if (arg === '--bottlenecks') flags.bottlenecks = true;
    if (arg === '--failures') flags.failures = true;
    if (arg === '--json') flags.json = true;
    if (arg === '--feedback') flags.feedback = true;
  }
  return flags;
}

const commands = {
  init: {
    fn: init,
    description: 'Initialize .blueprint directory in current project'
  },
  update: {
    fn: update,
    description: 'Update agents, templates, and rituals (preserves your content)'
  },
  queue: {
    fn: () => {
      if (subArg === 'reset') {
        resetQueue();
        console.log('Queue has been reset.');
      } else {
        displayQueue();
      }
    },
    description: 'Show queue status (use "reset" to clear)'
  },
  validate: {
    fn: async () => {
      const result = await validate();
      const useColor = process.stdout.isTTY || false;
      console.log(formatOutput(result, useColor));
      process.exit(result.exitCode);
    },
    description: 'Run pre-flight checks to validate project configuration'
  },
  history: {
    fn: async () => {
      const flags = parseFlags(args);
      if (subArg === 'clear') {
        await clearHistory({ force: flags.force });
      } else if (subArg === 'export') {
        const exportOpts = {};
        for (const arg of args) {
          if (arg.startsWith('--format=')) exportOpts.format = arg.split('=')[1];
          if (arg.startsWith('--since=')) exportOpts.since = arg.split('=')[1];
          if (arg.startsWith('--until=')) exportOpts.until = arg.split('=')[1];
          if (arg.startsWith('--status=')) exportOpts.status = arg.split('=')[1];
          if (arg.startsWith('--feature=')) exportOpts.feature = arg.split('=')[1];
          if (arg.startsWith('--output=')) exportOpts.output = arg.split('=')[1];
        }
        const result = await exportHistory(exportOpts);
        if (result.exitCode) {
          console.error(`Error: ${result.error}`);
          process.exit(result.exitCode);
        }
        if (result.message) {
          console.log(result.message);
        } else if (result.output) {
          console.log(result.output);
        }
      } else if (flags.stats) {
        showStats();
      } else {
        displayHistory({ all: flags.all });
      }
    },
    description: 'View pipeline execution history'
  },
  insights: {
    fn: () => {
      const flags = parseFlags(args);
      if (flags.feedback) {
        displayFeedbackInsights({ json: flags.json });
      } else {
        displayInsights({
          bottlenecks: flags.bottlenecks,
          failures: flags.failures,
          json: flags.json
        });
      }
    },
    description: 'Analyze pipeline history for bottlenecks, failures, and trends'
  },
  'retry-config': {
    fn: () => {
      if (subArg === 'set') {
        const key = args[2];
        const value = args[3];
        if (!key || !value) {
          console.error('Usage: retry-config set <key> <value>');
          console.error('Valid keys: maxRetries, windowSize, highFailureThreshold');
          process.exit(1);
        }
        setConfigValue(key, value);
      } else if (subArg === 'reset') {
        resetConfig();
        console.log('Retry configuration reset to defaults.');
      } else {
        displayConfig();
      }
    },
    description: 'Manage retry configuration for adaptive retry logic'
  },
  'feedback-config': {
    fn: () => {
      if (subArg === 'set') {
        const key = args[2];
        const value = args[3];
        if (!key || !value) {
          console.error('Usage: feedback-config set <key> <value>');
          console.error('Valid keys: minRatingThreshold, enabled');
          process.exit(1);
        }
        setFeedbackConfigValue(key, value);
      } else if (subArg === 'reset') {
        resetFeedbackConfig();
        console.log('Feedback configuration reset to defaults.');
      } else {
        displayFeedbackConfig();
      }
    },
    description: 'Manage feedback loop configuration'
  },
  'stack-config': {
    fn: () => {
      if (subArg === 'set') {
        const key = args[2];
        const value = args[3];
        if (!key || !value) {
          console.error('Usage: stack-config set <key> <value>');
          console.error('Valid keys: language, runtime, packageManager, frameworks, testRunner, testCommand, linter, tools');
          process.exit(1);
        }
        setStackConfigValue(key, value);
      } else if (subArg === 'reset') {
        resetStackConfig();
        console.log('Stack configuration reset to defaults.');
      } else {
        displayStackConfig();
      }
    },
    description: 'View or modify project tech stack configuration'
  },
  'murm-config': {
    fn: () => {
      if (subArg === 'set') {
        const key = args[2];
        const value = args[3];
        if (!key || !value) {
          console.error('Usage: murm-config set <key> <value>');
          console.error('Valid keys: cli, skill, skillFlags, worktreeDir, maxConcurrency, queueFile');
          process.exit(1);
        }
        const config = readMurmConfig();
        if (key === 'maxConcurrency') {
          config[key] = parseInt(value, 10);
        } else {
          config[key] = value;
        }
        writeMurmConfig(config);
        console.log(`Set ${key} = ${value}`);
      } else if (subArg === 'reset') {
        writeMurmConfig(getDefaultMurmConfig());
        console.log('Murmuration configuration reset to defaults.');
      } else {
        const config = readMurmConfig();
        console.log('Murmuration Configuration\n');
        console.log(`  cli:            ${config.cli}`);
        console.log(`  skill:          ${config.skill}`);
        console.log(`  skillFlags:     ${config.skillFlags}`);
        console.log(`  worktreeDir:    ${config.worktreeDir}`);
        console.log(`  maxConcurrency: ${config.maxConcurrency}`);
        console.log(`  maxFeatures:    ${config.maxFeatures}`);
        console.log(`  timeout:        ${config.timeout} min`);
        console.log(`  minDiskSpaceMB: ${config.minDiskSpaceMB}`);
        console.log(`  queueFile:      ${config.queueFile}`);
        console.log('\nTo change: murmur8 murm-config set <key> <value>');
        console.log('Run pipelines: murmur8 murm <slug1> <slug2> ...');
      }
    },
    description: 'View or modify murmuration pipeline configuration'
  },
  'parallel-config': {
    fn: null, // alias — set below
    description: 'View or modify murmuration pipeline configuration (alias for murm-config)'
  },
  parallel: {
    fn: async () => {
      if (subArg === 'status') {
        const detailed = args.includes('--detailed') || args.includes('-d');
        const lock = getLockInfo();

        if (detailed) {
          const details = getDetailedStatus();
          console.log(formatDetailedStatus(details));
        } else {
          const queue = loadQueue();

          if (!queue.features || queue.features.length === 0) {
            if (lock) {
              console.log(`Murmuration execution in progress (PID: ${lock.pid})`);
              console.log(`Started: ${lock.startedAt}`);
              console.log(`Features: ${lock.features.join(', ')}`);
            } else {
              console.log('No murmuration pipelines active.');
            }
            return;
          }

          console.log('Murmuration Pipeline Status\n');
          console.log(formatStatus(queue.features));
          const summary = {
            running: queue.features.filter(f => f.status === 'murm_running').length,
            pending: queue.features.filter(f => f.status === 'murm_queued').length,
            completed: queue.features.filter(f => f.status === 'murm_complete').length,
            failed: queue.features.filter(f => f.status === 'murm_failed').length,
            conflicts: queue.features.filter(f => f.status === 'merge_conflict').length
          };
          console.log(`\nRunning: ${summary.running} | Pending: ${summary.pending} | Completed: ${summary.completed} | Failed: ${summary.failed} | Conflicts: ${summary.conflicts}`);

          // Show log paths for running/failed
          const withLogs = queue.features.filter(f =>
            f.logPath && (f.status === 'murm_running' || f.status === 'murm_failed')
          );
          if (withLogs.length > 0) {
            console.log('\nLog files:');
            withLogs.forEach(f => console.log(`  ${f.slug}: ${f.logPath}`));
          }

          console.log('\nTip: Use --detailed for progress bars');
        }
      } else if (subArg === 'rollback') {
        const dryRunFlag = args.includes('--dry-run');
        const forceFlag = args.includes('--force');
        await rollbackMurm({ dryRun: dryRunFlag, force: forceFlag });
      } else if (subArg === 'cleanup') {
        const cleaned = await cleanupWorktrees();
        console.log(`Cleaned ${cleaned} worktree(s).`);
      } else if (subArg === 'abort') {
        const cleanupFlag = args.includes('--cleanup');
        await abortMurm({ cleanup: cleanupFlag });
      } else {
        const slugs = args.slice(1).filter(a => !a.startsWith('--') && !a.startsWith('-'));
        if (slugs.length === 0) {
          console.error('Usage: murmur8 murm <slug1> <slug2> ... [options]');
          console.error('\nOptions:');
          console.error('  --dry-run            Preview execution plan without running');
          console.error('  --yes, -y            Skip confirmation prompt');
          console.error('  --force              Override existing lock');
          console.error('  --verbose            Stream output to console (not just logs)');
          console.error('  --skip-preflight     Skip feature validation checks');
          console.error('  --max-concurrency=N  Set max parallel pipelines (default: 3)');
          console.error('\nSubcommands:');
          console.error('  murm status    Show status of all pipelines');
          console.error('  murm abort     Stop all running pipelines');
          console.error('  murm cleanup   Remove completed/aborted worktrees');
          process.exit(1);
        }

        const maxFlag = args.find(a => a.startsWith('--max-concurrency='));
        const options = {
          dryRun: args.includes('--dry-run'),
          yes: args.includes('--yes') || args.includes('-y'),
          force: args.includes('--force'),
          verbose: args.includes('--verbose'),
          skipPreflight: args.includes('--skip-preflight')
        };
        if (maxFlag) {
          options.maxConcurrency = parseInt(maxFlag.split('=')[1], 10);
        }
        const result = await runMurm(slugs, options);
        process.exit(result.success ? 0 : 1);
      }
    },
    description: 'Run multiple feature pipelines in parallel using git worktrees'
  },
  murm: {
    fn: null, // alias — set below
    description: 'Run multiple feature pipelines in parallel (murmuration)'
  },
  murmuration: {
    fn: null, // alias — set below
    description: 'Run multiple feature pipelines in parallel (murmuration)'
  },
  help: {
    fn: showHelp,
    description: 'Show this help message'
  }
};

// Wire aliases
commands.murm.fn = commands.parallel.fn;
commands.murmuration.fn = commands.parallel.fn;
commands['parallel-config'].fn = commands['murm-config'].fn;

function showHelp() {
  console.log(`
murmur8 - Multi-agent workflow framework

Usage: murmur8 <command> [options]

Commands:
  init                  Initialize .blueprint directory in current project
  update                Update agents, templates, and rituals (preserves your content)
  validate              Run pre-flight checks to validate project configuration
  queue                 Show current queue state for /implement-feature pipeline
  queue reset           Clear the queue and reset all state
  history               View recent pipeline runs (last 10 by default)
  history --all         View all pipeline runs
  history --stats       View aggregate statistics
  history clear         Clear all pipeline history (with confirmation)
  history clear --force Clear all pipeline history (no confirmation)
  history export        Export history as CSV (default) or JSON
  history export --format=json  Export as JSON
  history export --since=YYYY-MM-DD  Filter entries on or after date
  history export --until=YYYY-MM-DD  Filter entries on or before date
  history export --status=<status>   Filter by status (success|failed|paused)
  history export --feature=<slug>    Filter by feature slug
  history export --output=<path>     Write to file instead of stdout
  insights              Analyze pipeline for bottlenecks, failures, and trends
  insights --bottlenecks Show only bottleneck analysis
  insights --failures   Show only failure patterns
  insights --feedback   Show feedback loop insights (calibration, correlations)
  insights --json       Output analysis as JSON
  retry-config          View current retry configuration
  retry-config set <key> <value>  Modify a config value (maxRetries, windowSize, highFailureThreshold)
  retry-config reset    Reset retry configuration to defaults
  feedback-config       View current feedback loop configuration
  feedback-config set <key> <value>  Modify a config value (minRatingThreshold, enabled)
  feedback-config reset Reset feedback configuration to defaults
  stack-config          View current tech stack configuration
  stack-config set <key> <value>  Modify a config value (language, runtime, frameworks, etc.)
  stack-config reset    Reset tech stack configuration to defaults
  murm <slugs...>       Run multiple feature pipelines in parallel (murmuration)
  murm <slugs...> --dry-run  Show execution plan without running
  murm <slugs...> --yes      Skip confirmation prompt
  murm <slugs...> --verbose  Stream output to console
  murm <slugs...> --skip-preflight  Skip feature validation checks
  murm status           Show status of all parallel pipelines
  murm status --detailed  Show progress bars and stage info
  murm abort            Stop all running pipelines
  murm abort --cleanup  Stop all and remove worktrees
  murm rollback         Undo completed merges and cleanup failures
  murm rollback --dry-run  Preview what would be rolled back
  murm cleanup          Remove completed/aborted worktrees
  murm-config           View murmuration pipeline configuration
  murm-config set <key> <value>  Modify config (cli, skill, skillFlags, etc.)
  murm-config reset     Reset murmuration configuration to defaults
  help                  Show this help message

  Aliases: parallel, murmuration (same as murm)
           parallel-config (same as murm-config)

Examples:
  npx murmur8 init
  npx murmur8 update
  npx murmur8 validate
  npx murmur8 queue
  npx murmur8 history
  npx murmur8 history --stats
  npx murmur8 insights --feedback
  npx murmur8 murm user-auth dashboard --dry-run
`);
}

async function main() {
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    showHelp();
    process.exit(0);
  }

  const cmd = commands[command];
  if (!cmd) {
    console.error(`Unknown command: ${command}`);
    console.error('Run "agent-workflow help" for usage information.');
    process.exit(1);
  }

  try {
    await cmd.fn();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

main();
