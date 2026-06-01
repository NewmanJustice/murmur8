'use strict';

/**
 * version command - Print the installed murmur8 version
 */

const fs = require('fs');
const path = require('path');

const description = 'Print the installed murmur8 version';

function run(args, options = {}) {
  const pkgRoot = options.pkgRoot || path.join(__dirname, '../../');
  const pkgPath = path.join(pkgRoot, 'package.json');

  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  } catch (err) {
    process.stderr.write(`Error: could not read package.json: ${err.message}\n`);
    process.exit(1);
  }

  process.stdout.write(pkg.version + '\n');
  process.exit(0);
}

module.exports = { run, description };
