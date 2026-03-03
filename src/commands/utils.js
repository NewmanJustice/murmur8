/**
 * Shared utilities for CLI commands
 */

/**
 * Parse common flags from command line arguments
 * @param {string[]} args - Command line arguments
 * @returns {Object} Parsed flags
 */
function parseFlags(args) {
  const flags = {};
  for (const arg of args) {
    if (arg === '--all') flags.all = true;
    if (arg === '--stats') flags.stats = true;
    if (arg === '--force') flags.force = true;
    if (arg === '--bottlenecks') flags.bottlenecks = true;
    if (arg === '--failures') flags.failures = true;
    if (arg === '--json') flags.json = true;
    if (arg === '--feedback') flags.feedback = true;
  }
  return flags;
}

module.exports = { parseFlags };
