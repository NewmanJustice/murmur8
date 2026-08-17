/**
 * telemetry-config command - View telemetry configuration and queue status
 */
const { loadConfig, formatTelemetryConfig } = require('../telemetry');

const description = 'View telemetry configuration and failed-send queue status';

async function run(_args) {
  const config = loadConfig('.env');
  // queuePath comes from loadConfig (MURMUR8_TELEMETRY_QUEUE, else .claude/telemetry-failed.json)
  const output = formatTelemetryConfig(config);
  console.log(output);
}

module.exports = { run, description };
