/**
 * murm command - Run multiple feature pipelines in parallel using git worktrees
 */
const {
  formatStatus,
  runMurm,
  loadQueue,
  cleanupWorktrees,
  abortMurm,
  getLockInfo,
  getDetailedStatus,
  formatDetailedStatus,
  rollbackMurm
} = require('../murm');

const description = 'Run multiple feature pipelines in parallel using git worktrees';
const aliases = ['parallel', 'murmuration'];

async function run(args) {
  const subArg = args[1];

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
}

module.exports = { run, description, aliases };
