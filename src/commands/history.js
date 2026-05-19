/**
 * history command - View pipeline execution history
 */
const { displayHistory, showStats, clearHistory, exportHistory, recordHistory, updateStage } = require('../history');
const { parseFlags } = require('./utils');

const description = 'View pipeline execution history';

async function run(args) {
  const flags = parseFlags(args);
  const subArg = args[1];

  if (subArg === 'record') {
    const jsonArg = args[2];
    if (!jsonArg) {
      console.error('Usage: history record \'{"slug":"...","status":"...","startedAt":"...","completedAt":"...","totalDurationMs":N}\'');
      process.exit(1);
    }
    let entry;
    try {
      entry = JSON.parse(jsonArg);
    } catch (err) {
      console.error(`Invalid JSON: ${err.message}`);
      process.exit(1);
    }
    if (!entry.slug || !entry.status || !entry.startedAt || !entry.completedAt || entry.totalDurationMs === undefined) {
      console.error('Entry must include: slug, status, startedAt, completedAt, totalDurationMs');
      process.exit(1);
    }
    const ok = recordHistory(entry);
    if (!ok) process.exit(1);
    console.log(`Recorded history entry for "${entry.slug}" (${entry.status})`);
  } else if (subArg === 'update-stage') {
    // history update-stage <slug> <stage> '<json>'
    const slug = args[2];
    const stage = args[3];
    const jsonArg = args[4];
    if (!slug || !stage || !jsonArg) {
      console.error('Usage: history update-stage <slug> <stage> \'{"durationMs":N,"status":"success"}\'');
      process.exit(1);
    }
    let stageData;
    try {
      stageData = JSON.parse(jsonArg);
    } catch (err) {
      console.error(`Invalid JSON: ${err.message}`);
      process.exit(1);
    }
    const ok = updateStage(slug, stage, stageData);
    if (!ok) process.exit(1);
    console.log(`Updated stage "${stage}" for "${slug}"`);
  } else if (subArg === 'clear') {
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
    showStats({ cost: flags.cost });
  } else {
    displayHistory({ all: flags.all, cost: flags.cost });
  }
}

module.exports = { run, description };
