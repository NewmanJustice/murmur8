/**
 * stack-config command - View or modify project tech stack configuration
 */
const {
  displayStackConfig,
  setStackConfigValue,
  resetStackConfig
} = require('../stack');

const description = 'View or modify project tech stack configuration';

async function run(args) {
  const subArg = args[1];

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
}

module.exports = { run, description };
