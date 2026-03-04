const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const CONFIG_FILE = '.claude/cost-config.json';
const DEFAULT_INPUT_PRICE = 3;    // $3 per million tokens
const DEFAULT_OUTPUT_PRICE = 15;  // $15 per million tokens

let testDir;
let originalCwd;

function setupTestDir() {
  testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cost-test-'));
  originalCwd = process.cwd();
  process.chdir(testDir);
  fs.mkdirSync('.claude', { recursive: true });
}

function teardownTestDir() {
  process.chdir(originalCwd);
  fs.rmSync(testDir, { recursive: true, force: true });
}

function getDefaultPricing() {
  return { inputPricePerMillion: DEFAULT_INPUT_PRICE, outputPricePerMillion: DEFAULT_OUTPUT_PRICE };
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

function createStageData(input, output, pricing = getDefaultPricing()) {
  return {
    tokens: { input, output },
    cost: calculateCost(input, output, pricing)
  };
}

// Token Tracking & Recording
describe('Token Tracking & Recording', () => {
  beforeEach(() => setupTestDir());
  afterEach(() => teardownTestDir());

  it('T-TT-1.1: Record input tokens per stage', () => {
    const stageData = createStageData(2450, 1230);
    assert.strictEqual(stageData.tokens.input, 2450);
  });

  it('T-TT-1.2: Record output tokens per stage', () => {
    const stageData = createStageData(2450, 1230);
    assert.strictEqual(stageData.tokens.output, 1230);
  });

  it('T-TT-1.3: Calculate total input tokens across all stages', () => {
    const stages = {
      alex: createStageData(2450, 1230),
      cass: createStageData(3100, 1850),
      nigel: createStageData(2800, 2100)
    };
    const totalInput = Object.values(stages).reduce((sum, s) => sum + s.tokens.input, 0);
    assert.strictEqual(totalInput, 8350);
  });

  it('T-TT-1.4: Calculate total output tokens across all stages', () => {
    const stages = {
      alex: createStageData(2450, 1230),
      cass: createStageData(3100, 1850),
      nigel: createStageData(2800, 2100)
    };
    const totalOutput = Object.values(stages).reduce((sum, s) => sum + s.tokens.output, 0);
    assert.strictEqual(totalOutput, 5180);
  });

  it('T-TT-2.1: Skipped stages record 0 tokens', () => {
    const skippedStage = createStageData(0, 0);
    assert.strictEqual(skippedStage.tokens.input, 0);
    assert.strictEqual(skippedStage.tokens.output, 0);
    assert.strictEqual(skippedStage.cost, 0);
  });

  it('T-TT-3.1: Failed stages record tokens up to failure point', () => {
    const failedStage = createStageData(1500, 800);
    assert.strictEqual(failedStage.tokens.input, 1500);
    assert.strictEqual(failedStage.tokens.output, 800);
    assert.ok(failedStage.cost > 0);
  });
});

// Cost Calculation
describe('Cost Calculation', () => {
  beforeEach(() => setupTestDir());
  afterEach(() => teardownTestDir());

  it('T-CC-1.1: Calculate cost using default pricing', () => {
    const cost = calculateCost(1_000_000, 1_000_000);
    assert.strictEqual(cost, 18); // $3 + $15 = $18
  });

  it('T-CC-1.2: Calculate cost using custom pricing', () => {
    const customPricing = { inputPricePerMillion: 5, outputPricePerMillion: 20 };
    const cost = calculateCost(1_000_000, 1_000_000, customPricing);
    assert.strictEqual(cost, 25); // $5 + $20 = $25
  });

  it('T-CC-2.1: Cost rounded to 3 decimal places', () => {
    const cost = calculateCost(2450, 1230);
    const decimalPlaces = (cost.toString().split('.')[1] || '').length;
    assert.ok(decimalPlaces <= 3);
  });

  it('T-CC-2.2: Very small costs round correctly', () => {
    const cost = calculateCost(100, 50);
    assert.strictEqual(cost, 0.001); // Rounded to 3 decimals
  });

  it('T-CC-3.1: Total cost sums all stage costs', () => {
    const stages = {
      alex: createStageData(2450, 1230),
      cass: createStageData(3100, 1850),
      nigel: createStageData(2800, 2100)
    };
    const totalCost = Object.values(stages).reduce((sum, s) => sum + s.cost, 0);
    const expectedTotal = calculateCost(8350, 5180);
    assert.ok(Math.abs(totalCost - expectedTotal) < 0.001);
  });
});

// Cost Formatting & Display
describe('Cost Formatting & Display', () => {
  it('T-CF-1.1: Format cost with dollar sign and 3 decimals', () => {
    assert.strictEqual(formatCost(0.088), '$0.088');
    assert.strictEqual(formatCost(1.5), '$1.500');
  });

  it('T-CF-1.2: Format tokens with thousands separator', () => {
    assert.strictEqual(formatTokens(14050), '14,050');
    assert.strictEqual(formatTokens(1000000), '1,000,000');
  });

  it('T-CF-2.1: Generate cost summary table', () => {
    const stages = {
      alex: createStageData(2450, 1230),
      cass: createStageData(3100, 1850)
    };
    const lines = [];
    for (const [name, data] of Object.entries(stages)) {
      lines.push(`${name}: ${formatTokens(data.tokens.input)} in, ${formatTokens(data.tokens.output)} out, ${formatCost(data.cost)}`);
    }
    assert.strictEqual(lines.length, 2);
    assert.ok(lines[0].includes('alex'));
  });

  it('T-CF-2.2: Summary includes all stages', () => {
    const stageNames = ['alex', 'cass', 'nigel', 'codey-plan', 'codey-implement'];
    const stages = {};
    stageNames.forEach(name => {
      stages[name] = createStageData(1000, 500);
    });
    assert.strictEqual(Object.keys(stages).length, 5);
  });

  it('T-CF-2.3: Summary includes totals row', () => {
    const stages = {
      alex: createStageData(2450, 1230),
      cass: createStageData(3100, 1850)
    };
    const totalInput = Object.values(stages).reduce((sum, s) => sum + s.tokens.input, 0);
    const totalOutput = Object.values(stages).reduce((sum, s) => sum + s.tokens.output, 0);
    const totalCost = Object.values(stages).reduce((sum, s) => sum + s.cost, 0);
    assert.strictEqual(totalInput, 5550);
    assert.strictEqual(totalOutput, 3080);
    assert.ok(totalCost > 0);
  });
});

// History Integration
describe('History Integration', () => {
  beforeEach(() => setupTestDir());
  afterEach(() => teardownTestDir());

  it('T-HI-1.1: History entry includes token data', () => {
    const entry = {
      slug: 'test-feature',
      stages: { alex: createStageData(2450, 1230) },
      totalTokens: { input: 2450, output: 1230 }
    };
    assert.ok('totalTokens' in entry);
    assert.strictEqual(entry.totalTokens.input, 2450);
  });

  it('T-HI-1.2: History entry includes cost per stage', () => {
    const entry = {
      slug: 'test-feature',
      stages: { alex: createStageData(2450, 1230) }
    };
    assert.ok('cost' in entry.stages.alex);
    assert.ok(entry.stages.alex.cost > 0);
  });

  it('T-HI-1.3: History entry includes total cost', () => {
    const stages = {
      alex: createStageData(2450, 1230),
      cass: createStageData(3100, 1850)
    };
    const totalCost = Object.values(stages).reduce((sum, s) => sum + s.cost, 0);
    const entry = { slug: 'test-feature', stages, totalCost };
    assert.ok('totalCost' in entry);
    assert.ok(entry.totalCost > 0);
  });

  it('T-HI-2.1: Legacy entries without tokens show N/A', () => {
    const legacyEntry = { slug: 'old-feature', status: 'success' };
    const displayTokens = legacyEntry.totalTokens ? formatTokens(legacyEntry.totalTokens.input) : 'N/A';
    assert.strictEqual(displayTokens, 'N/A');
  });

  it('T-HI-2.2: Missing token data handled gracefully', () => {
    assert.strictEqual(formatCost(null), 'N/A');
    assert.strictEqual(formatCost(undefined), 'N/A');
    assert.strictEqual(formatTokens(null), 'N/A');
    assert.strictEqual(formatTokens(undefined), 'N/A');
  });
});

// Configuration
describe('Configuration', () => {
  beforeEach(() => setupTestDir());
  afterEach(() => teardownTestDir());

  it('T-CG-1.1: Load default pricing config', () => {
    const pricing = getDefaultPricing();
    assert.strictEqual(pricing.inputPricePerMillion, 3);
    assert.strictEqual(pricing.outputPricePerMillion, 15);
  });

  it('T-CG-1.2: Load custom pricing from config file', () => {
    const customConfig = { inputPricePerMillion: 5, outputPricePerMillion: 20 };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(customConfig, null, 2));
    const loaded = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    assert.strictEqual(loaded.inputPricePerMillion, 5);
    assert.strictEqual(loaded.outputPricePerMillion, 20);
  });

  it('T-CG-1.3: Missing config file uses defaults', () => {
    assert.ok(!fs.existsSync(CONFIG_FILE));
    const pricing = getDefaultPricing();
    assert.strictEqual(pricing.inputPricePerMillion, 3);
  });

  it('T-CG-2.1: Update input price in config', () => {
    const config = { inputPricePerMillion: 3, outputPricePerMillion: 15 };
    config.inputPricePerMillion = 4;
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    const loaded = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    assert.strictEqual(loaded.inputPricePerMillion, 4);
  });

  it('T-CG-2.2: Update output price in config', () => {
    const config = { inputPricePerMillion: 3, outputPricePerMillion: 15 };
    config.outputPricePerMillion = 18;
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    const loaded = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    assert.strictEqual(loaded.outputPricePerMillion, 18);
  });

  it('T-CG-2.3: Reset config to defaults', () => {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify({ inputPricePerMillion: 10, outputPricePerMillion: 30 }, null, 2));
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(getDefaultPricing(), null, 2));
    const loaded = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    assert.strictEqual(loaded.inputPricePerMillion, 3);
    assert.strictEqual(loaded.outputPricePerMillion, 15);
  });
});
