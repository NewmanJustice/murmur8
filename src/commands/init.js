/**
 * init command - Initialize .blueprint directory in current project
 */
const { init } = require('../init');

const description = 'Initialize .blueprint directory in current project';

async function run(args) {
  await init();
}

module.exports = { run, description };
