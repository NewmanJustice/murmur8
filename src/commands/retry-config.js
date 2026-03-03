/**
 * retry-config command - Manage retry configuration for adaptive retry logic
 */
const { displayConfig, setConfigValue, resetConfig } = require('../retry');

const description = 'Manage retry configuration for adaptive retry logic';

async function run(args) {
  const subArg = args[1];

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
}

module.exports = { run, description };
