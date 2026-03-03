'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Factory function to create a standardized config module.
 *
 * @param {Object} options - Configuration options
 * @param {string} options.name - Display name for the config (e.g., 'Retry', 'Feedback')
 * @param {string} options.file - Path to config file (e.g., '.claude/retry-config.json')
 * @param {Object} options.defaults - Default configuration values
 * @param {Object} [options.validators] - Map of key -> validator function
 *   Validator returns true for valid, or error string for invalid
 * @param {Object} [options.formatters] - Map of key -> display formatter function
 * @param {string[]} [options.arrayKeys] - Keys that accept JSON array values
 * @returns {Object} Config module with standard methods
 */
function createConfigModule(options) {
  const {
    name,
    file,
    defaults,
    validators = {},
    formatters = {},
    arrayKeys = []
  } = options;

  /**
   * Ensures the config directory exists.
   */
  function ensureConfigDir() {
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Returns a copy of the default configuration.
   */
  function getDefault() {
    return JSON.parse(JSON.stringify(defaults));
  }

  /**
   * Reads the config from file.
   * Returns defaults if file is missing or corrupted.
   * Merges missing keys from defaults.
   */
  function read() {
    ensureConfigDir();
    if (!fs.existsSync(file)) {
      return getDefault();
    }
    try {
      const content = fs.readFileSync(file, 'utf8');
      const parsed = JSON.parse(content);
      // Merge missing keys from defaults
      const merged = { ...getDefault(), ...parsed };
      return merged;
    } catch (err) {
      // Graceful degradation: return defaults on parse error
      return getDefault();
    }
  }

  /**
   * Writes the config to file.
   * Creates directory if needed.
   */
  function write(config) {
    ensureConfigDir();
    fs.writeFileSync(file, JSON.stringify(config, null, 2));
  }

  /**
   * Resets config to defaults by writing default config to file.
   */
  function reset() {
    write(getDefault());
  }

  /**
   * Sets a config value by key.
   * @param {string} key - Config key
   * @param {string} value - New value (will be parsed appropriately)
   */
  function setValue(key, value) {
    const validKeys = Object.keys(defaults);

    if (!validKeys.includes(key)) {
      throw new Error(
        `Unknown config key: ${key}. Valid keys: ${validKeys.join(', ')}`
      );
    }

    let parsed = value;

    // Handle array keys
    if (arrayKeys.includes(key)) {
      try {
        parsed = JSON.parse(value);
        if (!Array.isArray(parsed)) {
          throw new Error(`${key} must be a JSON array, e.g. '["a","b"]'`);
        }
      } catch (err) {
        if (err.message.includes('must be a JSON array')) throw err;
        throw new Error(`${key} must be a valid JSON array, e.g. '["a","b"]'`);
      }
    } else {
      // Type coercion based on default value type
      const defaultType = typeof defaults[key];
      if (defaultType === 'number') {
        parsed = parseFloat(value);
        if (isNaN(parsed)) {
          throw new Error(`Invalid value for ${key}: ${value}. Must be a number.`);
        }
      } else if (defaultType === 'boolean') {
        if (value !== 'true' && value !== 'false') {
          throw new Error(`Invalid value for ${key}: ${value}. Must be true or false.`);
        }
        parsed = value === 'true';
      }
    }

    // Run custom validator if provided
    if (validators[key]) {
      const result = validators[key](parsed);
      if (result !== true) {
        throw new Error(`Invalid value for ${key}: ${value}. ${result}`);
      }
    }

    const config = read();
    config[key] = parsed;
    write(config);

    // Log confirmation
    const display = Array.isArray(config[key]) ? JSON.stringify(config[key]) : config[key];
    console.log(`Set ${key} = ${display}`);
  }

  /**
   * Displays the current configuration.
   */
  function display() {
    const config = read();
    console.log(`\n${name} Configuration\n`);

    for (const [key, value] of Object.entries(config)) {
      let displayValue;

      // Use custom formatter if available
      if (formatters[key]) {
        displayValue = formatters[key](value);
      } else if (Array.isArray(value)) {
        displayValue = value.length > 0 ? value.join(', ') : '(not set)';
      } else if (typeof value === 'object' && value !== null) {
        // For nested objects, format each entry
        console.log(`\n  ${key}:`);
        for (const [subKey, subValue] of Object.entries(value)) {
          const subDisplay = Array.isArray(subValue) ? subValue.join(' -> ') : subValue;
          console.log(`    ${subKey.padEnd(20)}: ${subDisplay}`);
        }
        continue;
      } else if (value === '' || value === null || value === undefined) {
        displayValue = '(not set)';
      } else {
        displayValue = String(value);
      }

      console.log(`  ${key.padEnd(20)}: ${displayValue}`);
    }

    console.log('');
  }

  return {
    CONFIG_FILE: file,
    getDefault,
    read,
    write,
    reset,
    setValue,
    display
  };
}

module.exports = { createConfigModule };
