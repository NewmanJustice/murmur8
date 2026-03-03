const fs = require('fs');
const path = require('path');
const { colorize } = require('./theme');

const CONFIG_FILE = '.claude/feedback-config.json';

/**
 * Normalizes abbreviated keys to full names.
 * Converts "rec" to "recommendation" while preserving existing full key.
 * @param {Object} feedback - Raw feedback object
 * @returns {Object} - Normalized feedback object
 */
function normalizeFeedbackKeys(feedback) {
  const normalized = { ...feedback };
  if ('rec' in normalized && !('recommendation' in normalized)) {
    normalized.recommendation = normalized.rec;
    delete normalized.rec;
  }
  return normalized;
}

/**
 * Parses FEEDBACK: JSON from agent output text.
 * @param {string} output - Raw agent output
 * @returns {Object|null} - Parsed feedback or null if not found/invalid
 */
function parseFeedbackFromOutput(output) {
  const match = output.match(/FEEDBACK:\s*(\{[^}]+\})/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

/**
 * Returns the default feedback configuration.
 * Per FEATURE_SPEC.md defaults.
 */
function getDefaultConfig() {
  return {
    minRatingThreshold: 3.0,
    enabled: true,
    issueMappings: {
      'missing-error-handling': 'add-context',
      'unclear-scope': 'simplify-prompt',
      'too-complex': 'simplify-prompt',
      'too-many-stories': 'reduce-stories',
      'untestable-criteria': 'simplify-tests',
      'missing-edge-cases': 'add-context'
    }
  };
}

/**
 * Ensures the .claude directory exists.
 */
function ensureConfigDir() {
  const dir = path.dirname(CONFIG_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Reads the feedback config from file.
 * Returns defaults if file is missing or corrupted.
 */
function readConfig() {
  ensureConfigDir();
  if (!fs.existsSync(CONFIG_FILE)) {
    return getDefaultConfig();
  }
  try {
    const content = fs.readFileSync(CONFIG_FILE, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    return getDefaultConfig();
  }
}

/**
 * Writes the feedback config to file.
 */
function writeConfig(config) {
  ensureConfigDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

/**
 * Validates a feedback object against the schema.
 * Per FEATURE_SPEC.md:Rule 1.
 * Accepts both "rec" and "recommendation" keys for recommendation field.
 * @param {object} feedback - Feedback object to validate
 * @returns {object} { valid: boolean, errors: string[] }
 */
function validateFeedback(feedback) {
  const errors = [];

  // Rating validation
  if (typeof feedback.rating !== 'number' || !Number.isInteger(feedback.rating)) {
    errors.push('rating must be an integer');
  } else if (feedback.rating < 1 || feedback.rating > 5) {
    errors.push('rating must be between 1 and 5');
  }

  // Issues validation
  if (!Array.isArray(feedback.issues)) {
    errors.push('issues must be an array');
  } else if (!feedback.issues.every(i => typeof i === 'string')) {
    errors.push('issues must be an array of strings');
  }

  // Recommendation validation - accept both "rec" and "recommendation" keys
  const rec = feedback.recommendation || feedback.rec;
  const validRecs = ['proceed', 'pause', 'revise'];
  if (!validRecs.includes(rec)) {
    errors.push(`recommendation must be one of: ${validRecs.join(', ')}`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Determines whether the pipeline should pause based on feedback.
 * Per FEATURE_SPEC.md:Rule 2.
 * @param {object} feedback - Validated feedback object
 * @param {object} config - Feedback configuration
 * @returns {boolean} True if pipeline should pause
 */
function shouldPause(feedback, config) {
  return feedback.rating < config.minRatingThreshold ||
         feedback.recommendation === 'pause';
}

/**
 * Validates and sets a config value.
 * @param {string} key - Config key
 * @param {string} value - New value (will be parsed)
 */
function setConfigValue(key, value) {
  const config = readConfig();

  if (key === 'minRatingThreshold') {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 1.0 || numValue > 5.0) {
      throw new Error(
        'minRatingThreshold must be a number between 1.0 and 5.0'
      );
    }
    config.minRatingThreshold = numValue;
  } else if (key === 'enabled') {
    if (value !== 'true' && value !== 'false') {
      throw new Error('enabled must be true or false');
    }
    config.enabled = value === 'true';
  } else {
    throw new Error(
      `Unknown config key: ${key}. Valid keys: minRatingThreshold, enabled`
    );
  }

  writeConfig(config);
  console.log(`Set ${key} = ${config[key]}`);
}

/**
 * Displays the current feedback configuration.
 */
function displayConfig() {
  const config = readConfig();
  const useColor = process.stdout.isTTY;

  console.log('\n' + colorize('Feedback Configuration', 'cyan', useColor) + '\n');
  console.log(`  Min rating threshold:   ${config.minRatingThreshold}`);
  console.log(`  Enabled:                ${config.enabled}`);
  console.log('\n  ' + colorize('Issue Mappings:', 'cyan', useColor));
  for (const [issue, strategy] of Object.entries(config.issueMappings)) {
    console.log(`    ${issue.padEnd(24)}: ${strategy}`);
  }
  console.log('');
}

/**
 * Resets feedback config to defaults.
 */
function resetConfig() {
  writeConfig(getDefaultConfig());
}

module.exports = {
  CONFIG_FILE,
  getDefaultConfig,
  readConfig,
  writeConfig,
  normalizeFeedbackKeys,
  parseFeedbackFromOutput,
  validateFeedback,
  shouldPause,
  setConfigValue,
  displayConfig,
  resetConfig
};
