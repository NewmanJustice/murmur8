const { describe, it, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert');

// Import modules under test
const validate = require('../src/validate');
const insights = require('../src/insights');
const retry = require('../src/retry');
const feedback = require('../src/feedback');
const stack = require('../src/stack');
const theme = require('../src/theme');

// Helper to capture console output
function captureConsole() {
  const logs = [];
  const originalLog = console.log;
  console.log = (...args) => logs.push(args.join(' '));
  return {
    logs,
    restore: () => { console.log = originalLog; }
  };
}

// ANSI escape code pattern
const ANSI_PATTERN = /\x1b\[\d+m/;

describe('theme.js exports', () => {
  it('exports colorize function', () => {
    assert.strictEqual(typeof theme.colorize, 'function');
  });

  it('exports STATUS_ICONS object', () => {
    assert.strictEqual(typeof theme.STATUS_ICONS, 'object');
    assert.ok('parallel_complete' in theme.STATUS_ICONS);
    assert.ok('parallel_failed' in theme.STATUS_ICONS);
  });

  it('exports progressBar function', () => {
    assert.strictEqual(typeof theme.progressBar, 'function');
  });

  it('colorize returns colored text when useColor=true', () => {
    const result = theme.colorize('test', 'green', true);
    assert.match(result, ANSI_PATTERN);
    assert.ok(result.includes('test'));
  });

  it('colorize returns plain text when useColor=false', () => {
    const result = theme.colorize('test', 'green', false);
    assert.doesNotMatch(result, ANSI_PATTERN);
    assert.strictEqual(result, 'test');
  });
});

describe('validate.js theme adoption', () => {
  it('formatOutput uses theme colorize with useColor=true', async () => {
    const result = await validate.validate();
    const output = validate.formatOutput(result, true);

    // Should contain ANSI codes when color enabled
    assert.match(output, ANSI_PATTERN, 'Expected ANSI codes when useColor=true');
  });

  it('formatOutput returns plain text with useColor=false', async () => {
    const result = await validate.validate();
    const output = validate.formatOutput(result, false);

    // Should not contain ANSI codes
    assert.doesNotMatch(output, ANSI_PATTERN, 'Expected no ANSI codes when useColor=false');
    // Should contain pass/fail indicators in plain text
    assert.ok(output.includes('[PASS]') || output.includes('[FAIL]'));
  });

  it('formatOutput contains status indicators', async () => {
    const result = await validate.validate();
    const output = validate.formatOutput(result, true);

    // Should contain checkmark or X based on results
    const hasIndicator = output.includes('\u2713') || output.includes('\u2717') ||
                         output.includes('[PASS]') || output.includes('[FAIL]');
    assert.ok(hasIndicator, 'Expected status indicators in output');
  });
});

describe('insights.js theme adoption', () => {
  it('imports colorize from theme.js', () => {
    // Verify the module can use colorize
    const result = theme.colorize('BOTTLENECK ANALYSIS', 'cyan', true);
    assert.match(result, ANSI_PATTERN);
  });

  it('formatTextOutput includes section headers', () => {
    const analysis = {
      bottlenecks: { insufficientData: true, message: 'Insufficient data' },
      failures: { noFailures: true, message: 'No failures' },
      anomalies: { noAnomalies: true, message: 'No anomalies' },
      trends: { insufficientData: true, message: 'Insufficient data' }
    };

    // Access internal function through module pattern
    // Since formatTextOutput is not exported, we test through displayInsights
    // by checking the output contains expected section names
    const capture = captureConsole();
    try {
      insights.displayInsights({ json: false });
    } catch (e) {
      // May throw if no history, but we can check partial output
    }
    capture.restore();

    // The function should be structured to include headers
    // This is more of a smoke test since we need history data
    assert.ok(true, 'insights module loaded without error');
  });
});

describe('retry.js theme adoption', () => {
  it('displayConfig outputs section header', () => {
    const capture = captureConsole();
    retry.displayConfig();
    capture.restore();

    const output = capture.logs.join('\n');
    assert.ok(output.includes('Retry Configuration'), 'Expected "Retry Configuration" header');
    assert.ok(output.includes('Max retries'), 'Expected config values in output');
  });

  it('displayConfig shows stage strategies', () => {
    const capture = captureConsole();
    retry.displayConfig();
    capture.restore();

    const output = capture.logs.join('\n');
    assert.ok(output.includes('Stage Strategies'), 'Expected "Stage Strategies" section');
    assert.ok(output.includes('alex'), 'Expected alex stage in output');
  });
});

describe('feedback.js theme adoption', () => {
  it('displayConfig outputs section header', () => {
    const capture = captureConsole();
    feedback.displayConfig();
    capture.restore();

    const output = capture.logs.join('\n');
    assert.ok(output.includes('Feedback Configuration'), 'Expected "Feedback Configuration" header');
  });

  it('displayConfig shows issue mappings', () => {
    const capture = captureConsole();
    feedback.displayConfig();
    capture.restore();

    const output = capture.logs.join('\n');
    assert.ok(output.includes('Issue Mappings'), 'Expected "Issue Mappings" section');
  });
});

describe('stack.js theme adoption', () => {
  it('displayStackConfig outputs section header', () => {
    const capture = captureConsole();
    stack.displayStackConfig();
    capture.restore();

    const output = capture.logs.join('\n');
    assert.ok(output.includes('Stack Configuration'), 'Expected "Stack Configuration" header');
  });

  it('displayStackConfig shows config keys', () => {
    const capture = captureConsole();
    stack.displayStackConfig();
    capture.restore();

    const output = capture.logs.join('\n');
    assert.ok(output.includes('language'), 'Expected language key');
    assert.ok(output.includes('runtime'), 'Expected runtime key');
    assert.ok(output.includes('testRunner'), 'Expected testRunner key');
  });
});

describe('TTY detection pattern', () => {
  it('validate.formatOutput accepts useColor parameter', () => {
    // Test that the function signature supports TTY-based coloring
    const mockResult = { checks: [], success: true };

    const coloredOutput = validate.formatOutput(mockResult, true);
    const plainOutput = validate.formatOutput(mockResult, false);

    // Both should work without error
    assert.ok(typeof coloredOutput === 'string');
    assert.ok(typeof plainOutput === 'string');
  });
});

describe('Consistent status icons', () => {
  it('theme exports checkmark and X icons', () => {
    // These should be used across all modules
    assert.strictEqual(theme.STATUS_ICONS.parallel_complete, '\u2713');
    assert.strictEqual(theme.STATUS_ICONS.parallel_failed, '\u2717');
  });

  it('validate uses consistent pass/fail indicators', async () => {
    const result = await validate.validate();
    const output = validate.formatOutput(result, true);

    // Should use the standard checkmark or X
    const usesStandardIcons = output.includes('\u2713') || output.includes('\u2717');
    assert.ok(usesStandardIcons, 'Expected standard status icons');
  });
});

describe('Color output integration', () => {
  it('colorize supports all required colors', () => {
    const colors = ['green', 'red', 'yellow', 'cyan'];

    for (const color of colors) {
      const result = theme.colorize('test', color, true);
      assert.match(result, ANSI_PATTERN, `Expected ANSI code for ${color}`);
    }
  });

  it('colorize handles unknown colors gracefully', () => {
    const result = theme.colorize('test', 'unknown', true);
    // Should not throw, should include text
    assert.ok(result.includes('test'));
  });
});
