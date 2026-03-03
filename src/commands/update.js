/**
 * update command - Update agents, templates, and rituals (preserves your content)
 */
const { update } = require('../update');

const description = 'Update agents, templates, and rituals (preserves your content)';

async function run(args) {
  await update();
}

module.exports = { run, description };
