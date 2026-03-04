'use strict';

const { createConfigModule } = require('./config-factory');

const DEFAULT_INPUT_PRICE = 3;
const DEFAULT_OUTPUT_PRICE = 15;

const costConfig = createConfigModule({
  name: 'Cost',
  file: '.claude/cost-config.json',
  defaults: {
    inputPricePerMillion: DEFAULT_INPUT_PRICE,
    outputPricePerMillion: DEFAULT_OUTPUT_PRICE
  },
  validators: {
    inputPricePerMillion: (v) => v >= 0 || 'Must be non-negative',
    outputPricePerMillion: (v) => v >= 0 || 'Must be non-negative'
  }
});

function getDefaultPricing() {
  return {
    inputPricePerMillion: DEFAULT_INPUT_PRICE,
    outputPricePerMillion: DEFAULT_OUTPUT_PRICE
  };
}

function loadPricingConfig() {
  return costConfig.read();
}

function savePricingConfig(config) {
  costConfig.write(config);
}

function calculateCost(inputTokens, outputTokens, pricing = getDefaultPricing()) {
  const inputCost = (inputTokens / 1_000_000) * pricing.inputPricePerMillion;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPricePerMillion;
  return Math.round((inputCost + outputCost) * 1000) / 1000;
}

function formatCost(cost) {
  if (cost === null || cost === undefined) return 'N/A';
  return `$${cost.toFixed(3)}`;
}

function formatTokens(tokens) {
  if (tokens === null || tokens === undefined) return 'N/A';
  return tokens.toLocaleString();
}

function getCostSummary(stages, pricing = loadPricingConfig()) {
  const lines = [];
  let totalInput = 0;
  let totalOutput = 0;
  let totalCost = 0;

  for (const [name, data] of Object.entries(stages)) {
    if (data && data.tokens) {
      const input = data.tokens.input || 0;
      const output = data.tokens.output || 0;
      const cost = data.cost !== undefined ? data.cost : calculateCost(input, output, pricing);

      totalInput += input;
      totalOutput += output;
      totalCost += cost;

      lines.push({
        stage: name,
        input,
        output,
        cost
      });
    }
  }

  return {
    stages: lines,
    totals: {
      input: totalInput,
      output: totalOutput,
      cost: totalCost
    }
  };
}

function displayCostSummary(slug, stages) {
  const summary = getCostSummary(stages);

  console.log(`\nCost Summary for feature: ${slug}\n`);
  console.log('STAGE            INPUT     OUTPUT    COST');

  for (const s of summary.stages) {
    const stage = s.stage.padEnd(16);
    const input = formatTokens(s.input).padStart(9);
    const output = formatTokens(s.output).padStart(10);
    const cost = formatCost(s.cost).padStart(8);
    console.log(`${stage} ${input} ${output}    ${cost}`);
  }

  console.log('─'.repeat(45));
  const totalStage = 'TOTAL'.padEnd(16);
  const totalInput = formatTokens(summary.totals.input).padStart(9);
  const totalOutput = formatTokens(summary.totals.output).padStart(10);
  const totalCost = formatCost(summary.totals.cost).padStart(8);
  console.log(`${totalStage} ${totalInput} ${totalOutput}    ${totalCost}`);
}

module.exports = {
  CONFIG_FILE: costConfig.CONFIG_FILE,
  getDefaultPricing,
  loadPricingConfig,
  savePricingConfig,
  calculateCost,
  formatCost,
  formatTokens,
  getCostSummary,
  displayCostSummary,
  displayConfig: costConfig.display,
  setConfigValue: costConfig.setValue,
  resetConfig: costConfig.reset
};
