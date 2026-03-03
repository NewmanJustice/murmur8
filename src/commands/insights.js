/**
 * insights command - Analyze pipeline history for bottlenecks, failures, and trends
 */
const { displayInsights, displayFeedbackInsights } = require('../insights');
const { parseFlags } = require('./utils');

const description = 'Analyze pipeline history for bottlenecks, failures, and trends';

async function run(args) {
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
}

module.exports = { run, description };
