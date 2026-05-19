const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const {
  validateFeedback,
  normalizeFeedbackKeys,
  parseFeedbackFromOutput,
  shouldPause,
  getDefaultConfig,
  readConfig,
  writeConfig,
  setConfigValue,
  resetConfig,
  displayConfig
} = require('../src/feedback');

// ---------------------------------------------------------------------------
// Story: Validation and Normalisation Functions
// Ref: .blueprint/features/feature_feedback-test/story-validation-normalisation.md
// ---------------------------------------------------------------------------

describe('validateFeedback', () => {
  it('T-VN-1.1: valid feedback with integer rating 1-5 returns valid:true', () => {
    for (const rating of [1, 3, 5]) {
      const result = validateFeedback({ rating, issues: [], recommendation: 'proceed' });
      assert.strictEqual(result.valid, true, `expected valid for rating ${rating}`);
      assert.deepStrictEqual(result.errors, []);
    }
  });

  it('T-VN-1.2a: rating 0 (below range) returns valid:false with error', () => {
    const result = validateFeedback({ rating: 0, issues: [], recommendation: 'proceed' });
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.length > 0);
  });

  it('T-VN-1.2b: rating 6 (above range) returns valid:false with error', () => {
    const result = validateFeedback({ rating: 6, issues: [], recommendation: 'proceed' });
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.length > 0);
  });

  it('T-VN-1.2c: rating 3.5 (non-integer) returns valid:false with error', () => {
    const result = validateFeedback({ rating: 3.5, issues: [], recommendation: 'proceed' });
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.length > 0);
  });

  it('T-VN-1.2d: rating not a number returns valid:false with error', () => {
    const result = validateFeedback({ rating: 'high', issues: [], recommendation: 'proceed' });
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('rating')));
  });

  it('T-VN-1.3a: issues not an array returns valid:false with error', () => {
    const result = validateFeedback({ rating: 3, issues: 'none', recommendation: 'proceed' });
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('issues')));
  });

  it('T-VN-1.3b: issues array with non-string elements returns valid:false with error', () => {
    const result = validateFeedback({ rating: 3, issues: [42, true], recommendation: 'proceed' });
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('issues')));
  });
});

describe('normalizeFeedbackKeys', () => {
  it('T-VN-2.1: rec-only is renamed to recommendation and rec is removed', () => {
    const result = normalizeFeedbackKeys({ rating: 4, issues: [], rec: 'proceed' });
    assert.strictEqual(result.recommendation, 'proceed');
    assert.ok(!('rec' in result), 'rec key should be removed');
  });

  it('both rec and recommendation present — recommendation unchanged, rec preserved', () => {
    const result = normalizeFeedbackKeys({ rating: 4, issues: [], rec: 'pause', recommendation: 'proceed' });
    assert.strictEqual(result.recommendation, 'proceed');
    assert.ok('rec' in result, 'rec key should be preserved per production implementation');
    assert.strictEqual(result.rec, 'pause');
  });

  it('recommendation-only — object returned unchanged', () => {
    const input = { rating: 4, issues: [], recommendation: 'revise' };
    const result = normalizeFeedbackKeys(input);
    assert.strictEqual(result.recommendation, 'revise');
    assert.ok(!('rec' in result));
  });

  it('neither rec nor recommendation — object returned unchanged', () => {
    const input = { rating: 4, issues: [] };
    const result = normalizeFeedbackKeys(input);
    assert.ok(!('rec' in result));
    assert.ok(!('recommendation' in result));
  });
});

describe('parseFeedbackFromOutput', () => {
  it('T-VN-3.1: valid FEEDBACK block returns parsed object', () => {
    const output = 'Some text\nFEEDBACK: {"rating": 4, "issues": [], "recommendation": "proceed"}\nMore text';
    const result = parseFeedbackFromOutput(output);
    assert.ok(result !== null);
    assert.strictEqual(result.rating, 4);
    assert.deepStrictEqual(result.issues, []);
    assert.strictEqual(result.recommendation, 'proceed');
  });

  it('T-VN-3.2: no FEEDBACK marker returns null', () => {
    const result = parseFeedbackFromOutput('Agent completed successfully. No feedback block.');
    assert.strictEqual(result, null);
  });

  it('T-VN-3.3: malformed JSON after FEEDBACK: returns null', () => {
    const result = parseFeedbackFromOutput('FEEDBACK: {bad json here}');
    assert.strictEqual(result, null);
  });
});

describe('shouldPause', () => {
  const config = { minRatingThreshold: 3.0 };

  it('T-VN-4.1: recommendation pause triggers pause regardless of rating', () => {
    const result = shouldPause({ rating: 4, recommendation: 'pause' }, config);
    assert.strictEqual(result, true);
  });

  it('T-VN-4.2: rating below threshold triggers pause (recommendation: proceed)', () => {
    const result = shouldPause({ rating: 2, recommendation: 'proceed' }, config);
    assert.strictEqual(result, true);
  });

  it('T-VN-4.3: proceed recommendation and rating above threshold does not pause', () => {
    const result = shouldPause({ rating: 4, recommendation: 'proceed' }, config);
    assert.strictEqual(result, false);
  });

  it('both low rating and pause recommendation triggers pause', () => {
    const result = shouldPause({ rating: 2, recommendation: 'pause' }, config);
    assert.strictEqual(result, true);
  });
});

// ---------------------------------------------------------------------------
// Story: Config Management Functions
// Ref: .blueprint/features/feature_feedback-test/story-config-management.md
// ---------------------------------------------------------------------------

describe('Config Management', () => {
  let testDir;
  let originalCwd;

  before(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'feedback-test-'));
    originalCwd = process.cwd();
    process.chdir(testDir);
  });

  after(() => {
    process.chdir(originalCwd);
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('T-CM-1.1: getDefaultConfig returns correct shape and values', () => {
    const config = getDefaultConfig();
    assert.strictEqual(config.minRatingThreshold, 3.0);
    assert.strictEqual(config.enabled, true);
    assert.ok(typeof config.issueMappings === 'object');
    const expectedKeys = [
      'missing-error-handling',
      'unclear-scope',
      'too-complex',
      'too-many-stories',
      'untestable-criteria',
      'missing-edge-cases'
    ];
    for (const key of expectedKeys) {
      assert.ok(key in config.issueMappings, `issueMappings should contain "${key}"`);
    }
  });

  it('T-CM-2.1: readConfig with no file returns defaults without throwing', () => {
    const result = readConfig();
    assert.deepStrictEqual(result, getDefaultConfig());
  });

  it('T-CM-2.2: readConfig with valid file returns parsed content', () => {
    const configData = { minRatingThreshold: 4.0, enabled: false, issueMappings: {} };
    fs.mkdirSync('.claude', { recursive: true });
    fs.writeFileSync('.claude/feedback-config.json', JSON.stringify(configData, null, 2));
    const result = readConfig();
    assert.deepStrictEqual(result, configData);
    fs.rmSync('.claude/feedback-config.json');
  });

  it('T-CM-2.3: readConfig with malformed JSON returns defaults without throwing', () => {
    fs.mkdirSync('.claude', { recursive: true });
    fs.writeFileSync('.claude/feedback-config.json', '{bad json');
    const result = readConfig();
    assert.deepStrictEqual(result, getDefaultConfig());
    fs.rmSync('.claude/feedback-config.json');
  });

  it('T-CM-3.1: writeConfig creates file with correct content', () => {
    const configToWrite = { minRatingThreshold: 2.5, enabled: true, issueMappings: {} };
    writeConfig(configToWrite);
    assert.ok(fs.existsSync('.claude/feedback-config.json'));
    const written = JSON.parse(fs.readFileSync('.claude/feedback-config.json', 'utf8'));
    assert.deepStrictEqual(written, configToWrite);
    fs.rmSync('.claude/feedback-config.json');
  });

  it('T-CM-4.1: setConfigValue minRatingThreshold updates persisted config', () => {
    setConfigValue('minRatingThreshold', '4.5');
    const result = readConfig();
    assert.strictEqual(result.minRatingThreshold, 4.5);
  });

  it('T-CM-4.2: setConfigValue enabled false persists as boolean false', () => {
    setConfigValue('enabled', 'false');
    const result = readConfig();
    assert.strictEqual(result.enabled, false);
  });

  it('T-CM-4.3: setConfigValue unknown key throws with "Unknown config key"', () => {
    assert.throws(
      () => setConfigValue('nonExistentKey', 'val'),
      (err) => {
        assert.ok(err.message.includes('Unknown config key'));
        return true;
      }
    );
  });

  it('T-CM-4.4: setConfigValue minRatingThreshold out of range throws', () => {
    assert.throws(() => setConfigValue('minRatingThreshold', '0.5'));
    assert.throws(() => setConfigValue('minRatingThreshold', '5.5'));
    assert.throws(() => setConfigValue('minRatingThreshold', 'abc'));
  });

  it('T-CM-4.5: setConfigValue enabled invalid value throws', () => {
    assert.throws(() => setConfigValue('enabled', 'yes'));
  });

  it('T-CM-5.1: resetConfig restores defaults', () => {
    writeConfig({ minRatingThreshold: 4.5, enabled: false, issueMappings: {} });
    resetConfig();
    const result = readConfig();
    assert.deepStrictEqual(result, getDefaultConfig());
  });

  it('T-CM-6.1: displayConfig does not throw (smoke test)', () => {
    assert.doesNotThrow(() => displayConfig());
  });
});

// ---------------------------------------------------------------------------
// Story: End-to-End Parse Pipeline
// Ref: .blueprint/features/feature_feedback-test/story-parse-pipeline.md
// ---------------------------------------------------------------------------

describe('Parse Pipeline', () => {
  it('T-PP-1.1: valid rec output chains through all three steps correctly', () => {
    const output = 'FEEDBACK: {"rating": 4, "issues": [], "rec": "proceed"}';
    const parsed = parseFeedbackFromOutput(output);
    assert.ok(parsed !== null);
    const normalised = normalizeFeedbackKeys(parsed);
    assert.strictEqual(normalised.recommendation, 'proceed');
    assert.ok(!('rec' in normalised));
    const validation = validateFeedback(normalised);
    assert.deepStrictEqual(validation, { valid: true, errors: [] });
  });

  it('T-PP-1.2: pause rec chain produces valid feedback with recommendation:pause', () => {
    const output = 'FEEDBACK: {"rating": 2, "issues": ["unclear-scope"], "rec": "pause"}';
    const parsed = parseFeedbackFromOutput(output);
    assert.ok(parsed !== null);
    const normalised = normalizeFeedbackKeys(parsed);
    assert.strictEqual(normalised.recommendation, 'pause');
    const validation = validateFeedback(normalised);
    assert.deepStrictEqual(validation, { valid: true, errors: [] });
  });

  it('T-PP-1.3: invalid rating 0 propagates to validateFeedback returning invalid', () => {
    const output = 'FEEDBACK: {"rating": 0, "issues": [], "recommendation": "proceed"}';
    const parsed = parseFeedbackFromOutput(output);
    assert.ok(parsed !== null);
    const normalised = normalizeFeedbackKeys(parsed);
    const validation = validateFeedback(normalised);
    assert.strictEqual(validation.valid, false);
    assert.ok(validation.errors.length > 0);
  });

  it('T-PP-2.1: no FEEDBACK marker returns null and pipeline terminates', () => {
    const output = 'Agent completed the task successfully.';
    const parsed = parseFeedbackFromOutput(output);
    assert.strictEqual(parsed, null);
  });
});
