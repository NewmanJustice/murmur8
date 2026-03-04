/**
 * cost-config command - Manage pricing configuration for cost tracking
 */
const { displayConfig, setConfigValue, resetConfig } = require('../cost');

const description = 'Manage pricing configuration for cost tracking';

async function run(args) {
  const subArg = args[1];

  if (subArg === 'set') {
    const key = args[2];
    const value = args[3];
    if (!key || !value) {
      console.error('Usage: cost-config set <key> <value>');
      console.error('Valid keys: inputPricePerMillion, outputPricePerMillion');
      process.exit(1);
    }
    setConfigValue(key, value);
  } else if (subArg === 'reset') {
    resetConfig();
    console.log('Cost configuration reset to defaults.');
  } else {
    displayConfig();
  }
}

module.exports = { run, description };
