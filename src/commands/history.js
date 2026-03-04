/**
 * history command - View pipeline execution history
 */
const { displayHistory, showStats, clearHistory, exportHistory } = require('../history');
const { parseFlags } = require('./utils');

const description = 'View pipeline execution history';

async function run(args) {
  const flags = parseFlags(args);
  const subArg = args[1];

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
    showStats({ cost: flags.cost });
  } else {
    displayHistory({ all: flags.all, cost: flags.cost });
  }
}

module.exports = { run, description };
