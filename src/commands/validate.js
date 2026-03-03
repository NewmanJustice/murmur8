/**
 * validate command - Run pre-flight checks to validate project configuration
 */
const { validate, formatOutput } = require('../validate');

const description = 'Run pre-flight checks to validate project configuration';

async function run(args) {
  const result = await validate();
  const useColor = process.stdout.isTTY || false;
  console.log(formatOutput(result, useColor));
  process.exit(result.exitCode);
}

module.exports = { run, description };
