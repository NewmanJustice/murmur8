/**
 * telemetry-config command - View telemetry configuration and queue status
 */
const { loadConfig, formatTelemetryConfig } = require('../telemetry');

const description = 'View telemetry configuration and failed-send queue status';

const QUEUE_PATH = '.claude/telemetry-failed.json';

async function run(_args) {
  const config = loadConfig('.env');
  const output = formatTelemetryConfig(config, QUEUE_PATH);
  console.log(output);
}

module.exports = { run, description };
