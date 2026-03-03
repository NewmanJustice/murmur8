const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const theme = require('../src/theme');

describe('theme module exports', () => {
  it('exports BANNER as a non-empty string', () => {
    assert.equal(typeof theme.BANNER, 'string');
    assert.ok(theme.BANNER.length > 0);
    assert.ok(theme.BANNER.includes('}'));
  });

  it('exports STAGE_GLYPH as }', () => {
    assert.equal(theme.STAGE_GLYPH, '}');
  });

  it('exports STAGE_LABELS for all pipeline stages', () => {
    const stages = ['alex', 'cass', 'nigel', 'codey-plan', 'codey-implement'];
    for (const stage of stages) {
      assert.equal(typeof theme.STAGE_LABELS[stage], 'string');
      assert.ok(theme.STAGE_LABELS[stage].length > 0);
    }
  });

  it('exports STAGE_NAMES for all pipeline stages', () => {
    assert.equal(theme.STAGE_NAMES['alex'], 'Alex');
    assert.equal(theme.STAGE_NAMES['cass'], 'Cass');
    assert.equal(theme.STAGE_NAMES['nigel'], 'Nigel');
    assert.equal(theme.STAGE_NAMES['codey-plan'], 'Codey');
    assert.equal(theme.STAGE_NAMES['codey-implement'], 'Codey');
  });

  it('exports SPINNER_FRAMES as array of strings', () => {
    assert.ok(Array.isArray(theme.SPINNER_FRAMES));
    assert.ok(theme.SPINNER_FRAMES.length > 0);
    for (const frame of theme.SPINNER_FRAMES) {
      assert.equal(typeof frame, 'string');
      assert.ok(frame.includes('}'));
    }
  });
});

describe('STATUS_ICONS', () => {
  it('has entries for all parallel statuses', () => {
    const statuses = [
      'parallel_queued',
      'worktree_created',
      'parallel_running',
      'merge_pending',
      'parallel_complete',
      'parallel_failed',
      'merge_conflict',
      'aborted'
    ];
    for (const status of statuses) {
      assert.equal(typeof theme.STATUS_ICONS[status], 'string');
      assert.ok(theme.STATUS_ICONS[status].length > 0);
    }
  });
});

describe('MESSAGES', () => {
  it('startingFlock returns string with count', () => {
    const msg = theme.MESSAGES.startingFlock(3);
    assert.equal(typeof msg, 'string');
    assert.ok(msg.includes('3'));
    assert.ok(msg.includes('murmuration'));
  });

  it('startingFlock uses singular for count=1', () => {
    const msg = theme.MESSAGES.startingFlock(1);
    assert.ok(msg.includes('1 feature'));
    assert.ok(!msg.includes('features'));
  });

  it('startingFlock uses plural for count>1', () => {
    const msg = theme.MESSAGES.startingFlock(5);
    assert.ok(msg.includes('features'));
  });

  it('has all expected message keys', () => {
    const keys = [
      'landed', 'mergedAndLanded', 'turbulence', 'lostFormation',
      'timedOut', 'flockScattering', 'takingFlight',
      'murmurationComplete', 'conflictsHeader', 'failuresHeader'
    ];
    for (const key of keys) {
      assert.ok(theme.MESSAGES[key] !== undefined, `Missing key: ${key}`);
      assert.equal(typeof theme.MESSAGES[key], 'string');
    }
  });

  it('landed contains expected keyword', () => {
    assert.ok(theme.MESSAGES.landed.toLowerCase().includes('landed'));
  });

  it('turbulence contains expected keyword', () => {
    assert.ok(theme.MESSAGES.turbulence.toLowerCase().includes('turbulence'));
  });

  it('lostFormation contains expected keyword', () => {
    assert.ok(theme.MESSAGES.lostFormation.toLowerCase().includes('formation'));
  });
});

describe('colorize()', () => {
  it('returns plain text when useColor is false', () => {
    assert.equal(theme.colorize('hello', 'green', false), 'hello');
  });

  it('wraps text with ANSI codes when useColor is true', () => {
    const result = theme.colorize('hello', 'green', true);
    assert.ok(result.includes('\x1b[32m'));
    assert.ok(result.includes('\x1b[0m'));
    assert.ok(result.includes('hello'));
  });

  it('handles all supported colors', () => {
    for (const color of ['green', 'red', 'yellow', 'cyan']) {
      const result = theme.colorize('test', color, true);
      assert.ok(result.includes('test'));
      assert.ok(result.includes('\x1b[0m'));
    }
  });

  it('returns text with reset when given unknown color', () => {
    const result = theme.colorize('test', 'unknown', true);
    assert.ok(result.includes('test'));
  });
});

describe('formatStageStart()', () => {
  it('returns glyph with stage name and label', () => {
    const result = theme.formatStageStart('alex', 0);
    assert.ok(result.includes('}'));
    assert.ok(result.includes('Alex'));
    assert.ok(result.includes('creating feature spec'));
  });

  it('indents based on index', () => {
    const r0 = theme.formatStageStart('alex', 0);
    const r2 = theme.formatStageStart('nigel', 2);
    assert.ok(r0.startsWith('}'));
    assert.ok(r2.startsWith('  }'));
  });

  it('produces correct output for each pipeline stage', () => {
    const stages = [
      { stage: 'alex', index: 0, name: 'Alex' },
      { stage: 'cass', index: 1, name: 'Cass' },
      { stage: 'nigel', index: 2, name: 'Nigel' },
      { stage: 'codey-plan', index: 3, name: 'Codey' },
      { stage: 'codey-implement', index: 4, name: 'Codey' }
    ];
    for (const { stage, index, name } of stages) {
      const result = theme.formatStageStart(stage, index);
      assert.ok(result.includes(name), `Expected ${name} in: ${result}`);
      assert.ok(result.includes(theme.STAGE_LABELS[stage]));
      // Check indent
      const leading = result.match(/^( *)/)[1];
      assert.equal(leading.length, index, `Expected indent ${index} for ${stage}`);
    }
  });
});

describe('progressBar()', () => {
  it('returns bar with } for filled portion', () => {
    const bar = theme.progressBar(50, 10);
    assert.ok(bar.includes('}'));
  });

  it('returns bar with middle dot for empty portion', () => {
    const bar = theme.progressBar(50, 10);
    assert.ok(bar.includes('\u00b7'));
  });

  it('wraps in square brackets', () => {
    const bar = theme.progressBar(50, 10);
    assert.ok(bar.startsWith('['));
    assert.ok(bar.endsWith(']'));
  });

  it('has correct total width', () => {
    const bar = theme.progressBar(60, 20);
    // Remove brackets
    const inner = bar.slice(1, -1);
    assert.equal(inner.length, 20);
  });

  it('is all filled at 100%', () => {
    const bar = theme.progressBar(100, 10);
    const inner = bar.slice(1, -1);
    assert.equal(inner, '}'.repeat(10));
  });

  it('is all empty at 0%', () => {
    const bar = theme.progressBar(0, 10);
    const inner = bar.slice(1, -1);
    assert.equal(inner, '\u00b7'.repeat(10));
  });
});

describe('banner()', () => {
  it('returns non-empty string', () => {
    const result = theme.banner(false);
    assert.equal(typeof result, 'string');
    assert.ok(result.length > 0);
  });

  it('contains } chars', () => {
    assert.ok(theme.banner(false).includes('}'));
  });

  it('includes ANSI codes when color is true', () => {
    const colored = theme.banner(true);
    assert.ok(colored.includes('\x1b[36m'));
  });

  it('does not include ANSI codes when color is false', () => {
    const plain = theme.banner(false);
    assert.ok(!plain.includes('\x1b['));
  });
});
