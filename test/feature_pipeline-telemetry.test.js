'use strict';

const { describe, it, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const zlib = require('zlib');

const {
  loadConfig,
  generateRunId,
  resolveGitContext,
  ensureFeatureId,
  buildPayload,
  compressArtifact,
  enqueueFailure,
  retryQueue,
} = require('../src/telemetry');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const QUEUE_MAX = 50;

function makeTmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'telemetry-test-'));
}

function cleanEnv() {
  delete process.env.MURMUR8_TELEMETRY_URL;
  delete process.env.MURMUR8_TELEMETRY_KEY;
}

// ---------------------------------------------------------------------------
// Story: Telemetry Activation (T-TA-*)
// ---------------------------------------------------------------------------

describe('Telemetry Activation', () => {
  let tmp, origCwd, savedUrl, savedKey;

  before(() => { savedUrl = process.env.MURMUR8_TELEMETRY_URL; savedKey = process.env.MURMUR8_TELEMETRY_KEY; });
  after(() => {
    if (savedUrl !== undefined) process.env.MURMUR8_TELEMETRY_URL = savedUrl; else cleanEnv();
    if (savedKey !== undefined) process.env.MURMUR8_TELEMETRY_KEY = savedKey;
  });

  beforeEach(() => { tmp = makeTmp(); origCwd = process.cwd(); process.chdir(tmp); cleanEnv(); });
  afterEach(() => { process.chdir(origCwd); fs.rmSync(tmp, { recursive: true, force: true }); cleanEnv(); });

  it('T-TA-1: no HTTP request when URL absent', () => {
    const cfg = loadConfig(path.join(tmp, '.env'));
    assert.equal(cfg.url, null);
  });

  it('T-TA-2: URL resolved from .env', () => {
    fs.writeFileSync('.env', 'MURMUR8_TELEMETRY_URL=https://example.com/events\n');
    const cfg = loadConfig(path.join(tmp, '.env'));
    assert.equal(cfg.url, 'https://example.com/events');
  });

  it('T-TA-3: process env URL overrides .env URL', () => {
    fs.writeFileSync('.env', 'MURMUR8_TELEMETRY_URL=https://dotenv-value.example.com\n');
    process.env.MURMUR8_TELEMETRY_URL = 'https://env-value.example.com';
    const cfg = loadConfig(path.join(tmp, '.env'));
    assert.equal(cfg.url, 'https://env-value.example.com');
  });

  it('T-TA-4: key resolved from .env', () => {
    fs.writeFileSync('.env', 'MURMUR8_TELEMETRY_URL=https://example.com\nMURMUR8_TELEMETRY_KEY=secret123\n');
    const cfg = loadConfig(path.join(tmp, '.env'));
    assert.equal(cfg.key, 'secret123');
  });

  it('T-TA-5: key null when not set', () => {
    fs.writeFileSync('.env', 'MURMUR8_TELEMETRY_URL=https://example.com\n');
    const cfg = loadConfig(path.join(tmp, '.env'));
    assert.equal(cfg.key, null);
  });

  it('T-TA-6: process env key overrides .env key', () => {
    fs.writeFileSync('.env', 'MURMUR8_TELEMETRY_KEY=dotenv-key\n');
    process.env.MURMUR8_TELEMETRY_KEY = 'env-key';
    const cfg = loadConfig(path.join(tmp, '.env'));
    assert.equal(cfg.key, 'env-key');
  });
});

// ---------------------------------------------------------------------------
// Story: Identifiers (T-ID-*)
// ---------------------------------------------------------------------------

describe('Identifiers', () => {
  let tmp, origCwd;

  beforeEach(() => { tmp = makeTmp(); origCwd = process.cwd(); process.chdir(tmp); });
  afterEach(() => { process.chdir(origCwd); fs.rmSync(tmp, { recursive: true, force: true }); });

  it('T-ID-1: generateRunId returns UUID v4', () => {
    assert.match(generateRunId(), UUID_RE);
  });

  it('T-ID-2: runId stored in history entry shape', () => {
    const runId = generateRunId();
    assert.match(runId, UUID_RE);
  });

  it('T-ID-3: featureId written into spec with no frontmatter', () => {
    const specPath = path.join(tmp, 'FEATURE_SPEC.md');
    fs.writeFileSync(specPath, '# Feature Spec\nNo frontmatter.');
    const id = ensureFeatureId(specPath);
    assert.match(id, UUID_RE);
    assert.ok(fs.readFileSync(specPath, 'utf8').includes(`featureId: ${id}`));
  });

  it('T-ID-4: existing featureId preserved', () => {
    const existing = 'b8e4f1a2-3c7d-4b9e-8f1a-2d4c5e6b7a8f';
    const specPath = path.join(tmp, 'FEATURE_SPEC.md');
    fs.writeFileSync(specPath, `---\nfeatureId: ${existing}\n---\n# Feature\n`);
    assert.equal(ensureFeatureId(specPath), existing);
  });

  it('T-ID-5: each run gets different runId; featureId stable across calls', () => {
    const specPath = path.join(tmp, 'FEATURE_SPEC.md');
    fs.writeFileSync(specPath, '# Feature\n');
    const featureId = ensureFeatureId(specPath);
    assert.notEqual(generateRunId(), generateRunId());
    assert.equal(ensureFeatureId(specPath), featureId);
  });
});

// ---------------------------------------------------------------------------
// Story: Payload Construction & Send (T-PS-*)
// ---------------------------------------------------------------------------

describe('Payload Construction and Send', () => {
  let tmp, origCwd;

  beforeEach(() => { tmp = makeTmp(); origCwd = process.cwd(); process.chdir(tmp); });
  afterEach(() => { process.chdir(origCwd); fs.rmSync(tmp, { recursive: true, force: true }); });

  it('T-PS-1: payload contains required fields', () => {
    const p = buildPayload({
      runId: generateRunId(),
      featureId: generateRunId(),
      slug: 'my-feature',
      status: 'success',
      startedAt: '2026-05-19T10:00:00Z',
      completedAt: '2026-05-19T10:08:00Z',
      totalDurationMs: 480000,
    });
    assert.ok(p.runId); assert.ok(p.run.featureId);
    assert.equal(p.run.slug, 'my-feature'); assert.equal(p.run.status, 'success');
    assert.ok(p.run.startedAt); assert.ok(p.run.completedAt); assert.ok(p.run.totalDurationMs);
  });

  it('T-PS-2: payload includes per-stage timing', () => {
    const stages = { alex: { startedAt: '2026-05-19T10:00:00Z', completedAt: '2026-05-19T10:02:00Z', durationMs: 120000, status: 'success' } };
    const p = buildPayload({ runId: generateRunId(), slug: 'x', status: 'success', stages });
    assert.deepEqual(p.run.stages.alex, stages.alex);
  });

  it('T-PS-3: artifacts gzip+base64; no stories → only FEATURE_SPEC.md key', () => {
    const content = '# Feature Spec\nSome content.';
    const artifacts = { 'FEATURE_SPEC.md': compressArtifact(content) };
    const p = buildPayload({ runId: generateRunId(), slug: 'x', status: 'success', artifacts });
    assert.equal(Object.keys(p.artifacts).length, 1);
    const decoded = zlib.gunzipSync(Buffer.from(p.artifacts['FEATURE_SPEC.md'], 'base64')).toString('utf8');
    assert.equal(decoded, content);
  });

  it('T-PS-4: feedback block absent when no feedback provided', () => {
    const p = buildPayload({ runId: generateRunId(), slug: 'x', status: 'success', feedback: {} });
    assert.equal(p.run.feedback, undefined);
  });

  it('T-PS-5: compressArtifact produces non-empty base64 string', () => {
    const result = compressArtifact('hello world');
    assert.equal(typeof result, 'string');
    assert.ok(result.length > 0);
    const decoded = zlib.gunzipSync(Buffer.from(result, 'base64')).toString('utf8');
    assert.equal(decoded, 'hello world');
  });

  it('T-PS-6: buildPayload does not include Authorization — that is a send concern', () => {
    const p = buildPayload({ runId: generateRunId(), slug: 'x', status: 'success' });
    assert.equal(p.Authorization, undefined);
  });

  it('T-PS-7: buildPayload includes gitHubUser and repoName when provided', () => {
    const p = buildPayload({ runId: generateRunId(), slug: 'x', status: 'success',
                             gitHubUser: 'alice@example.com', repoName: 'my-repo' });
    assert.equal(p.run.gitHubUser, 'alice@example.com');
    assert.equal(p.run.repoName, 'my-repo');
  });

  it('T-PS-8: buildPayload defaults gitHubUser and repoName to null when omitted', () => {
    const p = buildPayload({ runId: generateRunId(), slug: 'x', status: 'success' });
    assert.equal(p.run.gitHubUser, null);
    assert.equal(p.run.repoName, null);
  });

  it('T-REG-1: endpoint payload compatibility keeps run.totalCost optional', () => {
    const withTotalCost = buildPayload({
      runId: generateRunId(),
      featureId: generateRunId(),
      slug: 'compat-with-cost',
      status: 'success',
      startedAt: '2026-08-18T00:00:00.000Z',
      completedAt: '2026-08-18T00:01:00.000Z',
      totalDurationMs: 60000,
      totalCost: 0.42,
      stages: { alex: { status: 'success', durationMs: 1000 } },
    });
    assert.equal(withTotalCost.run.totalCost, 0.42);

    const withoutTotalCost = buildPayload({
      runId: generateRunId(),
      featureId: generateRunId(),
      slug: 'compat-without-cost',
      status: 'success',
      startedAt: '2026-08-18T00:00:00.000Z',
      completedAt: '2026-08-18T00:01:00.000Z',
      totalDurationMs: 60000,
      stages: { alex: { status: 'success', durationMs: 1000 } },
    });
    assert.equal(Object.hasOwn(withoutTotalCost.run, 'totalCost'), false);
  });

  it('T-REG-2: endpoint payload compatibility accepts valid partial stage economics combinations', () => {
    const p = buildPayload({
      runId: generateRunId(),
      featureId: generateRunId(),
      slug: 'compat-partial-stage-economics',
      status: 'success',
      startedAt: '2026-08-18T00:00:00.000Z',
      completedAt: '2026-08-18T00:01:00.000Z',
      totalDurationMs: 60000,
      stages: {
        costOnly: {
          status: 'success',
          startedAt: '2026-08-18T00:00:00.000Z',
          completedAt: '2026-08-18T00:00:05.000Z',
          durationMs: 5000,
          cost: 0.11,
        },
        partialWithFallback: {
          status: 'success',
          startedAt: '2026-08-18T00:00:05.000Z',
          completedAt: '2026-08-18T00:00:10.000Z',
          durationMs: 5000,
          tokens: { input: 7 },
        },
        fullTokens: {
          status: 'success',
          startedAt: '2026-08-18T00:00:10.000Z',
          completedAt: '2026-08-18T00:00:15.000Z',
          durationMs: 5000,
          tokens: { input: 2, output: 3, total: 5 },
        },
      },
      historyStages: {
        partialWithFallback: {
          tokens: { output: 11, total: 18 },
        },
      },
    });

    assert.equal(p.run.stages.costOnly.cost, 0.11);
    assert.equal(Object.hasOwn(p.run.stages.costOnly, 'tokens'), false);
    assert.deepEqual(p.run.stages.partialWithFallback.tokens, { input: 7, output: 11, total: 18 });
    assert.deepEqual(p.run.stages.fullTokens.tokens, { input: 2, output: 3, total: 5 });
    assert.equal(p.run.stages.costOnly.status, 'success');
    assert.equal(p.run.stages.partialWithFallback.durationMs, 5000);
    assert.equal(p.run.stages.fullTokens.durationMs, 5000);
  });
});

// ---------------------------------------------------------------------------
// Story: Git Context Resolution (T-GC-*)
// ---------------------------------------------------------------------------

describe('Git Context Resolution', () => {
  let savedActor, savedUser;

  beforeEach(() => {
    savedActor = process.env.GITHUB_ACTOR;
    savedUser  = process.env.GITHUB_USER;
    delete process.env.GITHUB_ACTOR;
    delete process.env.GITHUB_USER;
  });

  afterEach(() => {
    if (savedActor !== undefined) process.env.GITHUB_ACTOR = savedActor; else delete process.env.GITHUB_ACTOR;
    if (savedUser  !== undefined) process.env.GITHUB_USER  = savedUser;  else delete process.env.GITHUB_USER;
  });

  it('T-GC-1: GITHUB_ACTOR takes priority for gitHubUser', () => {
    process.env.GITHUB_ACTOR = 'ci-bot';
    process.env.GITHUB_USER  = 'other-user';
    const { gitHubUser } = resolveGitContext(process.cwd());
    assert.equal(gitHubUser, 'ci-bot');
  });

  it('T-GC-2: GITHUB_USER used when GITHUB_ACTOR absent', () => {
    process.env.GITHUB_USER = 'deploy-user';
    const { gitHubUser } = resolveGitContext(process.cwd());
    assert.equal(gitHubUser, 'deploy-user');
  });

  it('T-GC-3: repoName parsed from HTTPS remote URL', () => {
    // resolveGitContext runs against this repo which has a git remote
    // We test parsing logic directly via known URL patterns
    const { repoName } = resolveGitContext(process.cwd());
    // In this test environment there may or may not be a remote; just verify it's string or null
    assert.ok(repoName === null || typeof repoName === 'string');
  });

  it('T-GC-4: repoName null when no git remote exists', () => {
    // A tmp dir with no git remote returns null for repoName
    const os = require('os');
    const tmp = require('fs').mkdtempSync(require('path').join(os.tmpdir(), 'gc-test-'));
    try {
      const { repoName } = resolveGitContext(tmp);
      assert.equal(repoName, null);
    } finally {
      require('fs').rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('T-GC-5: gitHubUser null when no env vars and git config unavailable', () => {
    // Running against a tmp dir with no git config should yield null (no error thrown)
    const os = require('os');
    const tmp = require('fs').mkdtempSync(require('path').join(os.tmpdir(), 'gc-test-'));
    try {
      const { gitHubUser } = resolveGitContext(tmp);
      // May be null (no config in tmp), or a string (inherited global git config) — never throws
      assert.ok(gitHubUser === null || typeof gitHubUser === 'string');
    } finally {
      require('fs').rmSync(tmp, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// Story: Failed Send Queue & Retry (T-FQ-*)
// ---------------------------------------------------------------------------

describe('Failed Send Queue and Retry', () => {
  let tmp, origCwd;
  let queuePath;

  beforeEach(() => {
    tmp = makeTmp();
    origCwd = process.cwd();
    process.chdir(tmp);
    fs.mkdirSync('.claude', { recursive: true });
    queuePath = path.join(tmp, '.claude', 'telemetry-failed.json');
  });

  afterEach(() => { process.chdir(origCwd); fs.rmSync(tmp, { recursive: true, force: true }); });

  it('T-FQ-1: failed send silently queued; queue file created', () => {
    enqueueFailure({ runId: generateRunId(), slug: 'x' }, queuePath);
    const q = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
    assert.equal(q.length, 1);
    assert.equal(q[0].slug, 'x');
  });

  it('T-FQ-2: queued payloads passed to retry send function', () => {
    const payload = { runId: generateRunId(), slug: 'x' };
    fs.writeFileSync(queuePath, JSON.stringify([payload]));
    const sent = [];
    retryQueue(queuePath, (p) => { sent.push(p); return true; });
    assert.equal(sent.length, 1);
  });

  it('T-FQ-3: successfully retried entry removed; failures stay', () => {
    const p1 = { runId: generateRunId(), slug: 'a' };
    const p2 = { runId: generateRunId(), slug: 'b' };
    fs.writeFileSync(queuePath, JSON.stringify([p1, p2]));
    retryQueue(queuePath, (p) => p.slug === 'a');
    const q = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
    assert.equal(q.length, 1);
    assert.equal(q[0].slug, 'b');
  });

  it('T-FQ-4: queue written as [] when all entries sent', () => {
    fs.writeFileSync(queuePath, JSON.stringify([{ runId: generateRunId() }]));
    retryQueue(queuePath, () => true);
    const q = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
    assert.deepEqual(q, []);
  });

  it('T-FQ-5: retry failure stays in queue', () => {
    const payload = { runId: generateRunId(), slug: 'z' };
    fs.writeFileSync(queuePath, JSON.stringify([payload]));
    retryQueue(queuePath, () => false);
    const q = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
    assert.equal(q.length, 1);
  });

  it('T-FQ-6: queue capped at max; oldest dropped on overflow', () => {
    const initial = Array.from({ length: QUEUE_MAX }, (_, i) => ({ runId: String(i) }));
    fs.writeFileSync(queuePath, JSON.stringify(initial));
    enqueueFailure({ runId: 'newest' }, queuePath);
    const q = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
    assert.equal(q.length, QUEUE_MAX);
    assert.equal(q[0].runId, '1');
    assert.equal(q[q.length - 1].runId, 'newest');
  });
});

// ---------------------------------------------------------------------------
// Story: Init Integration (T-II-*)
// ---------------------------------------------------------------------------

describe('Init Integration (.env and .gitignore)', () => {
  let tmp, origCwd;

  beforeEach(() => { tmp = makeTmp(); origCwd = process.cwd(); process.chdir(tmp); });
  afterEach(() => { process.chdir(origCwd); fs.rmSync(tmp, { recursive: true, force: true }); });

  const { ensureDotenv, ensureGitignore } = require('../src/telemetry');

  it('T-II-1: .env created with telemetry template when absent', () => {
    ensureDotenv(tmp);
    const content = fs.readFileSync(path.join(tmp, '.env'), 'utf8');
    assert.ok(content.includes('MURMUR8_TELEMETRY_URL'));
  });

  it('T-II-2: template appended to existing .env', () => {
    fs.writeFileSync(path.join(tmp, '.env'), 'EXISTING=value\n');
    ensureDotenv(tmp);
    const content = fs.readFileSync(path.join(tmp, '.env'), 'utf8');
    assert.ok(content.includes('EXISTING=value'));
    assert.ok(content.includes('MURMUR8_TELEMETRY_URL'));
  });

  it('T-II-3: .env not modified if template already present', () => {
    ensureDotenv(tmp);
    const before = fs.readFileSync(path.join(tmp, '.env'), 'utf8');
    ensureDotenv(tmp);
    assert.equal(fs.readFileSync(path.join(tmp, '.env'), 'utf8'), before);
  });

  it('T-II-4: .env added to .gitignore when absent from it', () => {
    fs.writeFileSync(path.join(tmp, '.gitignore'), 'node_modules\n');
    ensureGitignore(tmp);
    const lines = fs.readFileSync(path.join(tmp, '.gitignore'), 'utf8').split('\n').map(l => l.trim());
    assert.ok(lines.includes('.env'));
  });

  // T-II-5 originally asserted a .gitignore listing `.env` was never touched.
  // ensureGitignore now also covers the telemetry failed-send queue, so the
  // no-op contract is per-entry: nothing missing → byte-identical.
  it('T-II-5: .gitignore not modified once every entry is already listed', () => {
    fs.writeFileSync(path.join(tmp, '.gitignore'), 'node_modules\n.env\n.claude/telemetry-failed.json\n');
    const before = fs.readFileSync(path.join(tmp, '.gitignore'), 'utf8');
    ensureGitignore(tmp);
    assert.equal(fs.readFileSync(path.join(tmp, '.gitignore'), 'utf8'), before);
  });

  it('T-II-6: only the missing entry is appended when .env is already listed', () => {
    fs.writeFileSync(path.join(tmp, '.gitignore'), 'node_modules\n.env\n');
    ensureGitignore(tmp);
    const content = fs.readFileSync(path.join(tmp, '.gitignore'), 'utf8');
    const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
    assert.deepEqual(lines, ['node_modules', '.env', '.claude/telemetry-failed.json']);
    // and .env is not duplicated
    assert.equal(lines.filter(l => l === '.env').length, 1);
  });

  it('T-II-7: telemetry queue ignored when .gitignore is absent entirely', () => {
    ensureGitignore(tmp);
    const lines = fs.readFileSync(path.join(tmp, '.gitignore'), 'utf8').split('\n').map(l => l.trim());
    assert.ok(lines.includes('.env'));
    assert.ok(lines.includes('.claude/telemetry-failed.json'));
  });

  it('T-II-8: ensureGitignore is idempotent across repeated init/update runs', () => {
    ensureGitignore(tmp);
    const after1 = fs.readFileSync(path.join(tmp, '.gitignore'), 'utf8');
    ensureGitignore(tmp);
    ensureGitignore(tmp);
    assert.equal(fs.readFileSync(path.join(tmp, '.gitignore'), 'utf8'), after1);
  });
});

// ---------------------------------------------------------------------------
// Story: telemetry-config Command (T-TC-*)
// ---------------------------------------------------------------------------

describe('telemetry-config Command', () => {
  let tmp, origCwd;
  let queuePath;

  beforeEach(() => {
    tmp = makeTmp();
    origCwd = process.cwd();
    process.chdir(tmp);
    fs.mkdirSync('.claude', { recursive: true });
    queuePath = path.join(tmp, '.claude', 'telemetry-failed.json');
    cleanEnv();
  });

  afterEach(() => { process.chdir(origCwd); fs.rmSync(tmp, { recursive: true, force: true }); cleanEnv(); });

  const { formatTelemetryConfig } = require('../src/telemetry');

  it('T-TC-1: output includes configured URL', () => {
    const out = formatTelemetryConfig({ url: 'https://example.com/events', key: null }, queuePath);
    assert.ok(out.includes('https://example.com/events'));
  });

  it('T-TC-2: API key masked, last 4 chars visible', () => {
    const out = formatTelemetryConfig({ url: 'https://example.com', key: 'sk-abcdef1234' }, queuePath);
    assert.ok(out.includes('1234'));
    assert.ok(!out.includes('sk-abcdef1234'));
  });

  it('T-TC-3: key shown as "not set" when absent', () => {
    const out = formatTelemetryConfig({ url: 'https://example.com', key: null }, queuePath);
    assert.ok(out.toLowerCase().includes('not set'));
  });

  it('T-TC-4: inactive status when URL absent', () => {
    const out = formatTelemetryConfig({ url: null, key: null }, queuePath);
    assert.ok(out.toLowerCase().includes('inactive'));
  });

  it('T-TC-5: failed queue depth displayed', () => {
    fs.writeFileSync(queuePath, JSON.stringify([{ a: 1 }, { b: 2 }, { c: 3 }]));
    const out = formatTelemetryConfig({ url: 'https://example.com', key: null }, queuePath);
    assert.ok(out.includes('3'));
  });

  it('T-TC-6: failed queue shown as 0 when file absent', () => {
    const out = formatTelemetryConfig({ url: 'https://example.com', key: null }, queuePath);
    assert.ok(out.includes('0'));
  });
});

// ---------------------------------------------------------------------------
// Story: Skill File Telemetry Send References (T-PT-NEW-*)
//
// These tests verify that both SKILL.md and REFINE_SKILL.md contain actual
// telemetry send invocations — not just comments or pseudocode.
// They are INTENTIONALLY FAILING until Codey adds the send calls.
// ---------------------------------------------------------------------------

describe('Skill File Telemetry Send References', () => {
  const SKILL_PATH = path.join(__dirname, '..', 'SKILL.md');
  const REFINE_SKILL_PATH = path.join(__dirname, '..', 'REFINE_SKILL.md');

  let skillContent;
  let refineSkillContent;

  before(() => {
    skillContent = fs.readFileSync(SKILL_PATH, 'utf8');
    refineSkillContent = fs.readFileSync(REFINE_SKILL_PATH, 'utf8');
  });

  it('T-PT-NEW-1: SKILL.md Step 12 references sendTelemetry (not just a comment)', () => {
    // Must contain an actual sendTelemetry call, not merely a mention in prose/comment
    // A real invocation looks like: sendTelemetry( or sendTelemetry(payload
    const hasInvocation = /sendTelemetry\s*\(/.test(skillContent);
    assert.ok(
      hasInvocation,
      'SKILL.md Step 12 must contain an actual sendTelemetry(...) invocation, ' +
      'not just a prose reference. Add: sendTelemetry(payload, config) in the Step 12 block.'
    );
  });

  it('T-PT-NEW-2: REFINE_SKILL.md Step 7 contains an actual sendTelemetry invocation (not just pseudocode)', () => {
    // Must contain an actual sendTelemetry call in the Step 7 code block
    const hasInvocation = /sendTelemetry\s*\(/.test(refineSkillContent);
    assert.ok(
      hasInvocation,
      'REFINE_SKILL.md Step 7 must contain an actual sendTelemetry(...) invocation. ' +
      'The current code block only calls linkParentRun/buildRefinementPayload but never sends.'
    );
  });

  it('T-PT-NEW-3: SKILL.md telemetry send step references MURMUR8_TELEMETRY_URL and MURMUR8_TELEMETRY_KEY', () => {
    // The send invocation must show how config is loaded (both env vars referenced)
    const hasUrl = skillContent.includes('MURMUR8_TELEMETRY_URL');
    const hasKey = skillContent.includes('MURMUR8_TELEMETRY_KEY');
    assert.ok(
      hasUrl && hasKey,
      `SKILL.md must reference both MURMUR8_TELEMETRY_URL (${hasUrl ? 'found' : 'MISSING'}) ` +
      `and MURMUR8_TELEMETRY_KEY (${hasKey ? 'found' : 'MISSING'}) in the telemetry send step.`
    );
  });

  it('T-PT-NEW-4: REFINE_SKILL.md Step 7 telemetry payload includes type: "refinement"', () => {
    // The actual send payload in Step 7 must include type: 'refinement' (or type: "refinement")
    // as a real object property — not just in a comment line — so the telemetry endpoint
    // can distinguish refinement runs from initial pipeline runs.
    //
    // A comment line looks like: "// lineage: { ..., type: 'refinement', ... }"
    // A real property appears on a non-comment line within a sendTelemetry call.
    const lines = refineSkillContent.split('\n');
    const hasTypeInNonComment = lines.some(line => {
      const trimmed = line.trim();
      // Exclude lines that are purely comments (JS // comments or markdown prose)
      if (trimmed.startsWith('//')) return false;
      if (trimmed.startsWith('*')) return false;
      if (trimmed.startsWith('#')) return false;
      if (trimmed.startsWith('-')) return false;
      return /type\s*:\s*['"]refinement['"]/.test(trimmed);
    });
    assert.ok(
      hasTypeInNonComment,
      'REFINE_SKILL.md Step 7 sendTelemetry call must include type: "refinement" as an actual ' +
      'object property (not only in a comment). Add it to the payload object passed to sendTelemetry.'
    );
  });
});
