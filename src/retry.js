const fs = require('fs');
const path = require('path');
const { readHistoryFile } = require('./history');
const { colorize } = require('./theme');

const CONFIG_FILE = '.claude/retry-config.json';

/**
 * Returns the default retry configuration.
 * Per FEATURE_SPEC.md defaults.
 */
function getDefaultConfig() {
  return {
    maxRetries: 3,
    windowSize: 10,
    highFailureThreshold: 0.2,
    strategies: {
      alex: ['simplify-prompt', 'add-context'],
      cass: ['reduce-stories', 'simplify-prompt'],
      nigel: ['simplify-tests', 'add-context'],
      'codey-plan': ['add-context', 'simplify-prompt'],
      'codey-implement': ['incremental', 'rollback']
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
 * Reads the retry config from file.
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
    // Graceful degradation: return defaults on parse error
    return getDefaultConfig();
  }
}

/**
 * Writes the retry config to file.
 * Creates .claude directory if needed.
 */
function writeConfig(config) {
  ensureConfigDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

/**
 * Resets config to defaults by writing default config to file.
 */
function resetConfig() {
  writeConfig(getDefaultConfig());
}

/**
 * Calculates failure rate for a stage over a sliding window.
 * @param {string} stage - The pipeline stage name
 * @param {Array} history - Array of history entries
 * @param {number} windowSize - Number of recent entries to consider
 * @returns {number} Failure rate between 0 and 1
 */
function calculateFailureRate(stage, history, windowSize = 10) {
  // Handle corrupted history gracefully
  if (!Array.isArray(history) || history.length === 0) {
    return 0;
  }
  const recent = history.slice(-windowSize);
  if (recent.length === 0) return 0;
  const failedAtStage = recent.filter(
    e => e.status === 'failed' && e.failedStage === stage
  ).length;
  return failedAtStage / recent.length;
}

/**
 * Recommends a retry strategy based on attempt count and failure rate.
 * @param {string} stage - The pipeline stage name
 * @param {number} attemptCount - Current attempt number (1-based)
 * @param {number} failureRate - Calculated failure rate (0-1)
 * @param {object} config - Retry configuration object
 * @returns {string} Strategy name or 'abort-recommended'
 */
function recommendStrategy(stage, attemptCount, failureRate, config) {
  if (attemptCount > config.maxRetries) {
    return 'abort-recommended';
  }
  if (failureRate > config.highFailureThreshold) {
    const strategies = config.strategies[stage] || [];
    const idx = Math.min(attemptCount - 1, strategies.length - 1);
    return strategies[idx] || 'retry';
  }
  return 'retry';
}

/**
 * Applies a strategy by modifying the prompt.
 * @param {string} strategy - The strategy name
 * @param {string} originalPrompt - The original prompt text
 * @returns {string} Modified prompt or original if no modification needed
 */
function applyStrategy(strategy, originalPrompt) {
  const modifications = {
    'retry': null,
    'simplify-prompt': 'Focus on core requirements only. Skip edge cases and optional sections.',
    'reduce-stories': 'Write only the 2-3 most critical user stories. Defer others to follow-up.',
    'simplify-tests': 'Write only happy-path tests for each AC. Skip edge cases.',
    'add-context': '[Context from previous stage prepended]',
    'incremental': 'Implement one test at a time. Stop and report after each.',
    'rollback': 'git checkout -- .'
  };
  const mod = modifications[strategy];
  return mod ? `${originalPrompt}\n\n${mod}` : originalPrompt;
}

/**
 * Orchestrator entry point: determines if/how to retry a failed stage.
 * @param {string} stage - The pipeline stage that failed
 * @param {string} featureSlug - The feature being implemented
 * @param {Array|null} history - History entries (pass null to read from file)
 * @param {object|null} config - Config object (pass null to read from file)
 * @param {number} attemptCount - Current attempt number (1-based)
 * @returns {object} Recommendation object with strategy and metadata
 */
function shouldRetry(stage, featureSlug, history, config, attemptCount) {
  // Read history from file if not provided
  let historyData = history;
  if (historyData === null || historyData === undefined) {
    historyData = readHistoryFile();
    // Handle corrupted history
    if (historyData && historyData.error === 'corrupted') {
      historyData = [];
    }
  }

  // Read config from file if not provided
  const configData = config || readConfig();

  const failureRate = calculateFailureRate(
    stage,
    historyData,
    configData.windowSize
  );

  const strategy = recommendStrategy(
    stage,
    attemptCount,
    failureRate,
    configData
  );

  return {
    stage,
    featureSlug,
    attemptCount,
    failureRate,
    strategy,
    shouldRetry: strategy !== 'abort-recommended',
    maxRetries: configData.maxRetries
  };
}

/**
 * Displays the current retry configuration.
 */
function displayConfig() {
  const config = readConfig();
  const useColor = process.stdout.isTTY;

  console.log('\n' + colorize('Retry Configuration', 'cyan', useColor) + '\n');
  console.log(`  Max retries:            ${config.maxRetries}`);
  console.log(`  Window size:            ${config.windowSize}`);
  console.log(`  High failure threshold: ${config.highFailureThreshold}`);
  console.log('\n  ' + colorize('Stage Strategies:', 'cyan', useColor));
  for (const [stage, strategies] of Object.entries(config.strategies)) {
    console.log(`    ${stage.padEnd(16)}: ${strategies.join(' -> ')}`);
  }
  console.log('');
}

/**
 * Sets a config value by key.
 * @param {string} key - Config key (maxRetries, windowSize, highFailureThreshold)
 * @param {string} value - New value (will be parsed appropriately)
 */
function setConfigValue(key, value) {
  const config = readConfig();
  const numericKeys = ['maxRetries', 'windowSize', 'highFailureThreshold'];

  if (!numericKeys.includes(key)) {
    throw new Error(
      `Unknown config key: ${key}. Valid keys: ${numericKeys.join(', ')}`
    );
  }

  const numValue = parseFloat(value);
  if (isNaN(numValue)) {
    throw new Error(`Invalid value for ${key}: ${value}. Must be a number.`);
  }

  // Validate specific constraints
  if (key === 'maxRetries' && (numValue < 0 || !Number.isInteger(numValue))) {
    throw new Error('maxRetries must be a non-negative integer.');
  }
  if (key === 'windowSize' && (numValue < 1 || !Number.isInteger(numValue))) {
    throw new Error('windowSize must be a positive integer.');
  }
  if (key === 'highFailureThreshold' && (numValue < 0 || numValue > 1)) {
    throw new Error('highFailureThreshold must be between 0 and 1.');
  }

  config[key] = numValue;
  writeConfig(config);
  console.log(`Set ${key} = ${numValue}`);
}

/**
 * Maps feedback issues to retry strategies using issue mappings config.
 * Per FEATURE_SPEC.md:Rule 3.
 * @param {Array} issues - Array of issue codes from feedback
 * @param {object} config - Config with issueMappings (from feedback config)
 * @returns {Array} Array of recommended strategies
 */
function mapIssuesToStrategies(issues, config) {
  if (!issues || !Array.isArray(issues) || issues.length === 0) {
    return ['retry'];
  }

  const mappings = config?.issueMappings || {
    'missing-error-handling': 'add-context',
    'unclear-scope': 'simplify-prompt',
    'too-complex': 'simplify-prompt',
    'too-many-stories': 'reduce-stories',
    'untestable-criteria': 'simplify-tests',
    'missing-edge-cases': 'add-context'
  };

  const strategies = [];
  for (const issue of issues) {
    const strategy = mappings[issue];
    if (strategy && !strategies.includes(strategy)) {
      strategies.push(strategy);
    }
  }

  return strategies.length > 0 ? strategies : ['retry'];
}

module.exports = {
  CONFIG_FILE,
  getDefaultConfig,
  readConfig,
  writeConfig,
  resetConfig,
  calculateFailureRate,
  recommendStrategy,
  applyStrategy,
  shouldRetry,
  displayConfig,
  setConfigValue,
  mapIssuesToStrategies
};
