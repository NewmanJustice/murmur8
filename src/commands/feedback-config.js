/**
 * feedback-config command - Manage feedback loop configuration
 */
const {
  displayConfig: displayFeedbackConfig,
  setConfigValue: setFeedbackConfigValue,
  resetConfig: resetFeedbackConfig
} = require('../feedback');

const description = 'Manage feedback loop configuration';

async function run(args) {
  const subArg = args[1];

  if (subArg === 'set') {
    const key = args[2];
    const value = args[3];
    if (!key || !value) {
      console.error('Usage: feedback-config set <key> <value>');
      console.error('Valid keys: minRatingThreshold, enabled');
      process.exit(1);
    }
    setFeedbackConfigValue(key, value);
  } else if (subArg === 'reset') {
    resetFeedbackConfig();
    console.log('Feedback configuration reset to defaults.');
  } else {
    displayFeedbackConfig();
  }
}

module.exports = { run, description };
