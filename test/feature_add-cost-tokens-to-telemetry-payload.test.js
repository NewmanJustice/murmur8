'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { buildPayload } = require('../src/telemetry');

const ROOT = path.join(__dirname, '..');

function baseRunData(overrides = {}) {
  return {
    runId: 'run-1',
    featureId: 'feature-1',
    slug: 'add-cost-tokens-to-telemetry-payload',
    status: 'success',
    startedAt: '2026-08-18T00:00:00.000Z',
    completedAt: '2026-08-18T00:01:00.000Z',
    totalDurationMs: 60000,
    stages: {
      alex: {
        startedAt: '2026-08-18T00:00:00.000Z',
        completedAt: '2026-08-18T00:00:10.000Z',
        durationMs: 10000,
        status: 'success',
      },
    },
    ...overrides,
  };
}

function telemetryCodeBlock(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const block = content
    .split('```')
    .find((chunk) => chunk.includes('buildPayload({') && chunk.includes('sendTelemetry('));
  assert.ok(block, `Expected telemetry buildPayload/sendTelemetry block in ${filePath}`);
  return block;
}

describe('Run payload behavior (commitHash, totalCost)', () => {
  it('T-IMP-1/T-REF-1: buildPayload preserves explicit commitHash:null (key must exist)', () => {
    const payload = buildPayload(baseRunData({ commitHash: null }));
    assert.equal(Object.hasOwn(payload.run, 'commitHash'), true);
    assert.equal(payload.run.commitHash, null);
  });

  it('T-IMP-2/T-REF-2: buildPayload preserves resolved commitHash string', () => {
    const payload = buildPayload(baseRunData({ commitHash: 'abc123def' }));
    assert.equal(payload.run.commitHash, 'abc123def');
  });

  it('T-IMP-3/T-REF-5: totalCost is included only when numeric', () => {
    const withCost = buildPayload(baseRunData({ totalCost: 0.42 }));
    assert.equal(withCost.run.totalCost, 0.42);

    const withoutCost = buildPayload(baseRunData({ totalCost: undefined }));
    assert.equal(Object.hasOwn(withoutCost.run, 'totalCost'), false);

    const withInvalidCost = buildPayload(baseRunData({ totalCost: '0.42' }));
    assert.equal(Object.hasOwn(withInvalidCost.run, 'totalCost'), false);
  });

  it('T-IMP-4: stage status/timing survive while optional economics remain optional', () => {
    const payload = buildPayload(baseRunData({
      stages: {
        alex: {
          startedAt: '2026-08-18T00:00:00.000Z',
          completedAt: '2026-08-18T00:00:10.000Z',
          durationMs: 10000,
          status: 'success',
          cost: 0.1,
          tokens: { input: 10, output: 20, total: 30 },
        },
        cass: {
          startedAt: '2026-08-18T00:00:11.000Z',
          completedAt: '2026-08-18T00:00:20.000Z',
          durationMs: 9000,
          status: 'success',
        },
      },
    }));

    assert.equal(payload.run.stages.alex.status, 'success');
    assert.equal(payload.run.stages.alex.durationMs, 10000);
    assert.equal(payload.run.stages.alex.cost, 0.1);
    assert.deepEqual(payload.run.stages.alex.tokens, { input: 10, output: 20, total: 30 });
    assert.equal(Object.hasOwn(payload.run.stages.cass, 'cost'), false);
    assert.equal(Object.hasOwn(payload.run.stages.cass, 'tokens'), false);
  });

  it('T-IMP-5/T-REF-7: buildPayload stage economics use runtime-first with history fallback', () => {
    const payload = buildPayload(baseRunData({
      stages: {
        alex: {
          startedAt: '2026-08-18T00:00:00.000Z',
          completedAt: '2026-08-18T00:00:10.000Z',
          durationMs: 10000,
          status: 'success',
          cost: 1.23,
          tokens: { input: 4, output: 6, total: 10 },
        },
        cass: {
          startedAt: '2026-08-18T00:00:11.000Z',
          completedAt: '2026-08-18T00:00:20.000Z',
          durationMs: 9000,
          status: 'success',
        },
      },
      historyStages: {
        alex: {
          cost: 99,
          tokens: { input: 100, output: 200, total: 300 },
        },
        cass: {
          cost: 0.33,
          tokens: { input: 1, output: 2, total: 3 },
        },
      },
    }));

    assert.equal(payload.run.stages.alex.cost, 1.23);
    assert.deepEqual(payload.run.stages.alex.tokens, { input: 4, output: 6, total: 10 });
    assert.equal(payload.run.stages.cass.cost, 0.33);
    assert.deepEqual(payload.run.stages.cass.tokens, { input: 1, output: 2, total: 3 });
  });

  it('T-NRM-1/T-NRM-2/T-NRM-3/T-NRM-4/T-NRM-5/T-NRM-6: buildPayload normalizes stage tokens.total and omits invalid shapes', () => {
    const payload = buildPayload(baseRunData({
      stages: {
        matchTotal: {
          startedAt: '2026-08-18T00:00:00.000Z',
          completedAt: '2026-08-18T00:00:10.000Z',
          durationMs: 10000,
          status: 'success',
          tokens: { input: 2, output: 3, total: 5 },
        },
        recomputeTotal: {
          startedAt: '2026-08-18T00:00:11.000Z',
          completedAt: '2026-08-18T00:00:20.000Z',
          durationMs: 9000,
          status: 'success',
          tokens: { input: 2, output: 3, total: 999 },
        },
        totalOnly: {
          startedAt: '2026-08-18T00:00:21.000Z',
          completedAt: '2026-08-18T00:00:30.000Z',
          durationMs: 9000,
          status: 'success',
          tokens: { total: 50 },
        },
        runtimeWins: {
          startedAt: '2026-08-18T00:00:31.000Z',
          completedAt: '2026-08-18T00:00:40.000Z',
          durationMs: 9000,
          status: 'success',
          tokens: { input: 7, output: 11 },
        },
        historyFallback: {
          startedAt: '2026-08-18T00:00:41.000Z',
          completedAt: '2026-08-18T00:00:50.000Z',
          durationMs: 9000,
          status: 'success',
          tokens: { input: 5 },
        },
        omitAllInvalid: {
          startedAt: '2026-08-18T00:00:51.000Z',
          completedAt: '2026-08-18T00:01:00.000Z',
          durationMs: 9000,
          status: 'success',
          tokens: { input: 'x', output: 'y', total: 123 },
        },
      },
      historyStages: {
        runtimeWins: { tokens: { input: 1, output: 1, total: 2 } },
        historyFallback: { tokens: { output: 8, total: 13 } },
      },
    }));

    const stages = payload.run.stages;
    assert.deepEqual(stages.matchTotal.tokens, { input: 2, output: 3, total: 5 });
    assert.deepEqual(stages.recomputeTotal.tokens, { input: 2, output: 3, total: 5 });
    assert.equal(Object.hasOwn(stages.totalOnly, 'tokens'), false);
    assert.deepEqual(stages.runtimeWins.tokens, { input: 7, output: 11, total: 18 });
    assert.deepEqual(stages.historyFallback.tokens, { input: 5, output: 8, total: 13 });
    assert.equal(Object.hasOwn(stages.omitAllInvalid, 'tokens'), false);
  });
});

describe('Template coverage for implement/refine telemetry assembly', () => {
  const implementPaths = [
    path.join(ROOT, '.claude/commands/implement-feature.md'),
    path.join(ROOT, 'SKILL.md'),
  ];
  const refinePath = path.join(ROOT, '.claude/commands/refine-feature.md');

  it('T-IMP-1/T-IMP-2: implement templates include commitHash with null fallback', () => {
    for (const filePath of implementPaths) {
      const block = telemetryCodeBlock(filePath);
      assert.match(block, /commitHash\s*:/, `${filePath} must set commitHash in telemetry payload`);
      assert.match(
        block,
        /commitHash\s*:\s*[^,\n]*\bnull\b/,
        `${filePath} commitHash must allow null fallback`
      );
    }
  });

  it('T-REF-1/T-REF-3/T-REF-4: refine template includes commitHash with null fallback', () => {
    const block = telemetryCodeBlock(refinePath);
    assert.match(block, /commitHash\s*:/, 'refine telemetry payload must set commitHash');
    assert.match(block, /commitHash\s*:\s*[^,\n]*\bnull\b/, 'refine commitHash must allow null fallback');
  });

  it('T-IMP-3/T-REF-5: templates include numeric guard for optional totalCost', () => {
    for (const filePath of [...implementPaths, refinePath]) {
      const block = telemetryCodeBlock(filePath);
      assert.match(block, /totalCost/, `${filePath} must include totalCost handling`);
      assert.match(
        block,
        /Number\.isFinite|typeof\s+[a-zA-Z_$][\w$]*\s*===\s*['"]number['"]/,
        `${filePath} totalCost handling must guard for numeric values`
      );
    }
  });

  it('T-IMP-4/T-IMP-5/T-REF-6/T-REF-7: templates include stage cost/tokens runtime-first fallback', () => {
    for (const filePath of [...implementPaths, refinePath]) {
      const block = telemetryCodeBlock(filePath);
      assert.match(block, /cost\s*:/, `${filePath} must support stage cost`);
      assert.match(block, /tokens\s*:/, `${filePath} must support stage tokens`);
      assert.match(block, /history/i, `${filePath} must include history fallback source`);
      assert.match(block, /runtime|current|run/i, `${filePath} must include runtime source`);
      assert.match(
        block,
        /cost\s*:\s*[\s\S]{0,120}(\?\?|\|\|)|tokens\s*:\s*[\s\S]{0,240}(\?\?|\|\|)/,
        `${filePath} must show runtime-first fallback behavior for stage economics`
      );
    }
  });

  it('T-NRM-2/T-NRM-4/T-NRM-5/T-NRM-6: templates normalize tokens.total from input+output with omission rules', () => {
    for (const filePath of [...implementPaths, refinePath]) {
      const block = telemetryCodeBlock(filePath);
      assert.match(block, /tokens\.total|total\s*:/, `${filePath} must address tokens.total`);
      assert.match(
        block,
        /input\s*\+\s*output/,
        `${filePath} must derive/recompute tokens.total from input + output`
      );
      assert.match(
        block,
        /input|output/,
        `${filePath} must reference input/output presence for total omission rules`
      );
    }
  });
});
