#!/usr/bin/env node

const path = require('path');
const fs = require('fs');

const args = process.argv.slice(2);
const command = args[0];

// Alias resolution
const aliases = {
  'parallel': 'murm',
  'murmuration': 'murm',
  'parallel-config': 'murm-config'
};

const resolvedCommand = aliases[command] || command;

// Dynamic command loading
async function main() {
  // Handle help/no command
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    const help = require('../src/commands/help');
    await help.run(args);
    return;
  }

  // Load and run the command
  const cmdPath = path.join(__dirname, '../src/commands', `${resolvedCommand}.js`);

  if (!fs.existsSync(cmdPath)) {
    console.error(`Unknown command: ${command}`);
    console.error('Run "murmur8 help" for usage information.');
    process.exit(1);
  }

  try {
    const cmd = require(cmdPath);
    await cmd.run(args);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

main();
