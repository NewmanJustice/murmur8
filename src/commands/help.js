/**
 * help command - Show help message
 */

const description = 'Show this help message';

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

async function run(args) {
  showHelp();
}

module.exports = { run, description };
