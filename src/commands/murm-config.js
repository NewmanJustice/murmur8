/**
 * murm-config command - View or modify murmuration pipeline configuration
 */
const {
  readMurmConfig,
  writeMurmConfig,
  getDefaultMurmConfig
} = require('../murm');

const description = 'View or modify murmuration pipeline configuration';
const aliases = ['parallel-config'];

async function run(args) {
  const subArg = args[1];

  if (subArg === 'set') {
    const key = args[2];
    const value = args[3];
    if (!key || !value) {
      console.error('Usage: murm-config set <key> <value>');
      console.error('Valid keys: cli, skill, skillFlags, worktreeDir, maxConcurrency, queueFile');
      process.exit(1);
    }
    const config = readMurmConfig();
    if (key === 'maxConcurrency') {
      config[key] = parseInt(value, 10);
    } else {
      config[key] = value;
    }
    writeMurmConfig(config);
    console.log(`Set ${key} = ${value}`);
  } else if (subArg === 'reset') {
    writeMurmConfig(getDefaultMurmConfig());
    console.log('Murmuration configuration reset to defaults.');
  } else {
    const config = readMurmConfig();
    console.log('Murmuration Configuration\n');
    console.log(`  cli:            ${config.cli}`);
    console.log(`  skill:          ${config.skill}`);
    console.log(`  skillFlags:     ${config.skillFlags}`);
    console.log(`  worktreeDir:    ${config.worktreeDir}`);
    console.log(`  maxConcurrency: ${config.maxConcurrency}`);
    console.log(`  maxFeatures:    ${config.maxFeatures}`);
    console.log(`  timeout:        ${config.timeout} min`);
    console.log(`  minDiskSpaceMB: ${config.minDiskSpaceMB}`);
    console.log(`  queueFile:      ${config.queueFile}`);
    console.log('\nTo change: murmur8 murm-config set <key> <value>');
    console.log('Run pipelines: murmur8 murm <slug1> <slug2> ...');
  }
}

module.exports = { run, description, aliases };
