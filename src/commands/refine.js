'use strict';

const { loadRefinementContext, isPauseBypassable } = require('../refine');

const description = 'Refine an existing feature spec and propagate changes through stories, tests, and implementation';

async function run(argv) {
  const { parseRefinementArgs } = require('../refine');
  const { slug } = parseRefinementArgs(argv);

  if (!slug) {
    console.error('Usage: murmur8 refine-feature <slug>');
    console.error('Example: murmur8 refine-feature user-auth');
    process.exit(1);
  }

  console.log(`Loading refinement context for "${slug}"...`);

  let ctx;
  try {
    ctx = await loadRefinementContext(slug, process.cwd());
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }

  const storyCount = ctx.stories.length;
  const lastStatus = ctx.lastRunStatus ? ` (last run: ${ctx.lastRunStatus})` : '';
  console.log(`Feature: ${ctx.slug}${lastStatus}`);
  console.log(`Stories: ${storyCount}`);
  console.log(`Feature ID: ${ctx.featureId}`);
  console.log('');
  console.log('To refine this feature, use the /refine-feature skill in Claude Code:');
  console.log(`  /refine-feature "${slug}"`);
}

module.exports = { run, description };
