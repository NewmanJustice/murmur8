'use strict';

/**
 * Regression tests for silent telemetry loss (murmur8 <= 4.7.13).
 *
 * A quoted MURMUR8_TELEMETRY_KEY in .env was passed through verbatim, so the
 * header went out as `Bearer "mm8_…"` and the portal returned 401. sendTelemetry
 * never inspected res.statusCode, the skills wrapped the call in
 * `2>/dev/null || true`, and nothing ever called enqueueFailure — so every run
 * was discarded with no error anywhere. These tests pin each of those layers.
 */

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');

const {
  loadConfig,
  parseEnvValue,
  buildPayload,
  sendTelemetry,
  retryQueueAsync,
  formatTelemetryConfig,
  QUEUE_FILENAME,
} = require('../src/telemetry');

function makeTmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'telemetry-vis-'));
}

function cleanEnv() {
  delete process.env.MURMUR8_TELEMETRY_URL;
  delete process.env.MURMUR8_TELEMETRY_KEY;
  delete process.env.MURMUR8_TELEMETRY_QUEUE;
}

// Minimal stand-in for the ingestion endpoint. Records what it received so the
// Authorization header and body shape can be asserted.
function startServer({ status = 201, body = '{"id":"cmsxe074c0001faj2qxinkkz2"}' } = {}) {
  const received = [];
  const server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => { raw += c; });
    req.on('end', () => {
      let parsed = null;
      try { parsed = JSON.parse(raw); } catch (_) { /* leave null */ }
      received.push({ authorization: req.headers.authorization, body: parsed });
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(body);
    });
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve({
        url: `http://127.0.0.1:${server.address().port}/api/telemetry`,
        received,
        close: () => new Promise((r) => server.close(r)),
      });
    });
  });
}

// ---------------------------------------------------------------------------
// Story: .env value parsing (T-EV-*)
// ---------------------------------------------------------------------------

describe('Telemetry .env value parsing', () => {
  let tmp, envPath;

  beforeEach(() => { tmp = makeTmp(); envPath = path.join(tmp, '.env'); cleanEnv(); });
  afterEach(() => { fs.rmSync(tmp, { recursive: true, force: true }); cleanEnv(); });

  it('T-EV-1: double-quoted key is unwrapped (the 401 root cause)', () => {
    fs.writeFileSync(envPath, 'MURMUR8_TELEMETRY_KEY="mm8_abc123"\n');
    assert.equal(loadConfig(envPath).key, 'mm8_abc123');
  });

  it('T-EV-2: single-quoted key is unwrapped', () => {
    fs.writeFileSync(envPath, "MURMUR8_TELEMETRY_KEY='mm8_abc123'\n");
    assert.equal(loadConfig(envPath).key, 'mm8_abc123');
  });

  it('T-EV-3: quoted URL is unwrapped and still validates as a URL', () => {
    fs.writeFileSync(envPath, 'MURMUR8_TELEMETRY_URL="https://example.com/api/telemetry"\n');
    assert.equal(loadConfig(envPath).url, 'https://example.com/api/telemetry');
  });

  it('T-EV-4: `export KEY=value` form is honoured', () => {
    fs.writeFileSync(envPath, 'export MURMUR8_TELEMETRY_KEY=mm8_abc123\n');
    assert.equal(loadConfig(envPath).key, 'mm8_abc123');
  });

  it('T-EV-5: trailing inline comment is dropped from an unquoted value', () => {
    fs.writeFileSync(envPath, 'MURMUR8_TELEMETRY_KEY=mm8_abc123 # production key\n');
    assert.equal(loadConfig(envPath).key, 'mm8_abc123');
  });

  it('T-EV-6: quotes inside the value are preserved (only a matching pair is stripped)', () => {
    // A lone or interior quote may be part of a real secret — never strip it.
    assert.equal(parseEnvValue(`mm8_ab'c123`), `mm8_ab'c123`);
    assert.equal(parseEnvValue('mm8_abc123"'), 'mm8_abc123"');
    assert.equal(parseEnvValue('"mm8_abc123'), '"mm8_abc123');
    assert.equal(parseEnvValue(`"mm8_a'b'c"`), `mm8_a'b'c`);
  });

  it('T-EV-7: a quoted value in process.env is also unwrapped', () => {
    process.env.MURMUR8_TELEMETRY_KEY = '"mm8_from_env"';
    assert.equal(loadConfig(envPath).key, 'mm8_from_env');
  });

  it('T-EV-8: queuePath defaults next to .env and honours MURMUR8_TELEMETRY_QUEUE', () => {
    assert.equal(loadConfig(envPath).queuePath, path.join(tmp, QUEUE_FILENAME));
    process.env.MURMUR8_TELEMETRY_QUEUE = '/tmp/custom-queue.json';
    assert.equal(loadConfig(envPath).queuePath, '/tmp/custom-queue.json');
  });
});

// ---------------------------------------------------------------------------
// Story: send outcome is observable (T-SO-*)
// ---------------------------------------------------------------------------

describe('Telemetry send outcome', () => {
  let tmp, queuePath;

  beforeEach(() => { tmp = makeTmp(); queuePath = path.join(tmp, 'queue.json'); });
  afterEach(() => { fs.rmSync(tmp, { recursive: true, force: true }); });

  const samplePayload = () => buildPayload({
    runId: 'client-side-run-id',
    featureId: 'feature-1',
    slug: 'probe',
    status: 'success',
    startedAt: '2026-08-17T00:00:00.000Z',
    completedAt: '2026-08-17T00:00:05.000Z',
    totalDurationMs: 5000,
    stages: { alex: { status: 'success' } },
  });

  it('T-SO-1: 2xx resolves ok:true and captures the returned id', async () => {
    const srv = await startServer({ status: 201 });
    try {
      const r = await sendTelemetry(samplePayload(), { url: srv.url, key: 'mm8_abc123' });
      assert.equal(r.ok, true);
      assert.equal(r.statusCode, 201);
      assert.equal(r.id, 'cmsxe074c0001faj2qxinkkz2');
    } finally { await srv.close(); }
  });

  it('T-SO-2: 401 resolves ok:false with the status and body (was indistinguishable from 201)', async () => {
    const srv = await startServer({ status: 401, body: '{"error":"Unauthorized"}' });
    try {
      const r = await sendTelemetry(samplePayload(), { url: srv.url, key: 'bad' });
      assert.equal(r.ok, false);
      assert.equal(r.statusCode, 401);
      assert.match(r.error, /401/);
      assert.match(r.error, /Unauthorized/);
    } finally { await srv.close(); }
  });

  it('T-SO-3: 422 resolves ok:false', async () => {
    const srv = await startServer({ status: 422, body: '{"errors":[{"field":"stages"}]}' });
    try {
      const r = await sendTelemetry(samplePayload(), { url: srv.url, key: 'mm8_abc123' });
      assert.equal(r.ok, false);
      assert.equal(r.statusCode, 422);
    } finally { await srv.close(); }
  });

  it('T-SO-4: failed send is queued when queuePath is supplied', async () => {
    const srv = await startServer({ status: 401 });
    try {
      const r = await sendTelemetry(samplePayload(), { url: srv.url, key: 'bad', queuePath });
      assert.equal(r.queued, true);
      const q = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
      assert.equal(q.length, 1);
      assert.equal(q[0].run.slug, 'probe');
    } finally { await srv.close(); }
  });

  it('T-SO-5: successful send is NOT queued', async () => {
    const srv = await startServer({ status: 201 });
    try {
      const r = await sendTelemetry(samplePayload(), { url: srv.url, key: 'mm8_abc123', queuePath });
      assert.equal(r.queued, false);
      assert.equal(fs.existsSync(queuePath), false);
    } finally { await srv.close(); }
  });

  it('T-SO-6: unreachable host resolves ok:false and queues rather than throwing', async () => {
    // Port 1 on loopback: connection refused, no server involved.
    const r = await sendTelemetry(samplePayload(), {
      url: 'http://127.0.0.1:1/api/telemetry', key: 'mm8_abc123', queuePath,
    });
    assert.equal(r.ok, false);
    assert.equal(r.statusCode, null);
    assert.equal(r.queued, true);
  });

  it('T-SO-7: missing URL resolves skipped, and does not queue', async () => {
    const r = await sendTelemetry(samplePayload(), { url: null, key: 'mm8_abc123', queuePath });
    assert.equal(r.ok, false);
    assert.equal(r.skipped, true);
    assert.equal(fs.existsSync(queuePath), false);
  });

  it('T-SO-8: the quoted key reaches the server verbatim — proving the parse fix is what matters', async () => {
    const srv = await startServer({ status: 201 });
    try {
      await sendTelemetry(samplePayload(), { url: srv.url, key: '"mm8_abc123"' });
      // sendTelemetry must not silently repair a bad key; loadConfig owns that.
      assert.equal(srv.received[0].authorization, 'Bearer "mm8_abc123"');
    } finally { await srv.close(); }
  });
});

// ---------------------------------------------------------------------------
// Story: payload shape matches the ingestion contract (T-PS-*)
// ---------------------------------------------------------------------------

describe('Telemetry payload shape', () => {
  it('T-PS-1: body is posted flat — no { runId, run } envelope on the wire', async () => {
    const srv = await startServer({ status: 201 });
    try {
      await sendTelemetry(buildPayload({
        runId: 'client-side', slug: 's', status: 'success',
        startedAt: 'a', completedAt: 'b', totalDurationMs: 1,
        stages: { alex: { status: 'success' } },
      }), { url: srv.url, key: 'k' });
      const body = srv.received[0].body;
      assert.equal(body.run, undefined);
      assert.equal(body.slug, 's');
      assert.ok(body.stages, 'stages must survive to the wire — it is required server-side');
    } finally { await srv.close(); }
  });

  it('T-PS-2: type is forwarded so refinements are not recorded as features', () => {
    const payload = buildPayload({
      runId: 'r', slug: 's', status: 'success', type: 'refinement',
      startedAt: 'a', completedAt: 'b', totalDurationMs: 1, stages: {},
    });
    assert.equal(payload.run.type, 'refinement');
  });

  it('T-PS-3: optional run fields accepted by the endpoint are forwarded', () => {
    const payload = buildPayload({
      runId: 'r', slug: 's', status: 'failed',
      startedAt: 'a', completedAt: 'b', totalDurationMs: 1, stages: {},
      commitHash: 'abc123', totalCost: 0.42, failedStage: 'nigel-tests',
      pausedAfter: null, parentRunId: 'parent-1',
      featureSpec: '# spec', stories: [{ title: 't', content: 'c' }],
    });
    assert.equal(payload.run.commitHash, 'abc123');
    assert.equal(payload.run.totalCost, 0.42);
    assert.equal(payload.run.failedStage, 'nigel-tests');
    assert.equal(payload.run.parentRunId, 'parent-1');
    assert.equal(payload.run.featureSpec, '# spec');
    assert.deepEqual(payload.run.stories, [{ title: 't', content: 'c' }]);
    // null-valued optionals are omitted rather than sent as null
    assert.equal('pausedAfter' in payload.run, false);
  });
});

// ---------------------------------------------------------------------------
// Story: artifact content uses the channel the endpoint actually has (T-AR-*)
// ---------------------------------------------------------------------------

describe('Telemetry artifact channel', () => {
  const skill = fs.readFileSync(path.join(__dirname, '..', 'SKILL.md'), 'utf8');

  it('T-AR-1: payload.artifacts never reaches the wire (endpoint has no such field)', async () => {
    const srv = await startServer({ status: 201 });
    try {
      const payload = buildPayload({
        runId: 'r', slug: 's', status: 'success',
        startedAt: 'a', completedAt: 'b', totalDurationMs: 1, stages: {},
        artifacts: { 'FEATURE_SPEC.md': 'H4sIAAAA' },
      });
      assert.ok(payload.artifacts, 'buildPayload still exposes artifacts locally');
      await sendTelemetry(payload, { url: srv.url, key: 'k' });
      assert.equal(srv.received[0].body.artifacts, undefined);
    } finally { await srv.close(); }
  });

  it('T-AR-2: featureSpec crosses the wire as readable plain text, not gzip+base64', async () => {
    const srv = await startServer({ status: 201 });
    try {
      const spec = '# Feature Spec\nSome content.';
      await sendTelemetry(buildPayload({
        runId: 'r', slug: 's', status: 'success',
        startedAt: 'a', completedAt: 'b', totalDurationMs: 1, stages: {},
        featureSpec: spec,
      }), { url: srv.url, key: 'k' });
      assert.equal(srv.received[0].body.featureSpec, spec);
    } finally { await srv.close(); }
  });

  it('T-AR-3: stories cross the wire as [{ title, content }]', async () => {
    const srv = await startServer({ status: 201 });
    try {
      await sendTelemetry(buildPayload({
        runId: 'r', slug: 's', status: 'success',
        startedAt: 'a', completedAt: 'b', totalDurationMs: 1, stages: {},
        stories: [{ title: 'login', content: 'As a user…' }],
      }), { url: srv.url, key: 'k' });
      assert.deepEqual(srv.received[0].body.stories, [{ title: 'login', content: 'As a user…' }]);
    } finally { await srv.close(); }
  });

  it('T-AR-4: SKILL.md populates featureSpec and stories rather than leaving them null', () => {
    const block = skill.split('```').find(b => b.includes('sendTelemetry('));
    assert.match(block, /featureSpec/, 'SKILL.md must send featureSpec');
    assert.match(block, /stories/, 'SKILL.md must send stories');
  });

  it('T-AR-5: SKILL.md does not route artifact text through compressArtifact', () => {
    const block = skill.split('```').find(b => b.includes('sendTelemetry('));
    // Ignore `//` comment lines — the block documents why compression is wrong,
    // so only an actual call counts as a violation.
    const code = block.split('\n').filter(l => !l.trim().startsWith('//')).join('\n');
    assert.doesNotMatch(
      code,
      /compressArtifact\s*\(/,
      'featureSpec/stories are plain-string columns — compressed content would store as unreadable noise'
    );
  });
});

// ---------------------------------------------------------------------------
// Story: queued runs are actually redelivered (T-RQ-*)
// ---------------------------------------------------------------------------

describe('Telemetry queue redelivery', () => {
  let tmp, queuePath;

  beforeEach(() => { tmp = makeTmp(); queuePath = path.join(tmp, 'queue.json'); });
  afterEach(() => { fs.rmSync(tmp, { recursive: true, force: true }); });

  it('T-RQ-1: entries delivered through a real async send are cleared', async () => {
    const srv = await startServer({ status: 201 });
    try {
      fs.writeFileSync(queuePath, JSON.stringify([
        { runId: 'a', run: { slug: 'a', status: 'success', stages: {} } },
        { runId: 'b', run: { slug: 'b', status: 'success', stages: {} } },
      ]));
      const result = await retryQueueAsync(queuePath, (p) => sendTelemetry(p, { url: srv.url, key: 'k' }));
      assert.deepEqual(result, { attempted: 2, sent: 2, remaining: 0 });
      assert.deepEqual(JSON.parse(fs.readFileSync(queuePath, 'utf8')), []);
      assert.equal(srv.received.length, 2);
    } finally { await srv.close(); }
  });

  it('T-RQ-2: entries still rejected stay queued exactly once (no re-queue amplification)', async () => {
    const srv = await startServer({ status: 401 });
    try {
      fs.writeFileSync(queuePath, JSON.stringify([{ runId: 'a', run: { slug: 'a' } }]));
      // Sender deliberately built without queuePath — see retryQueueAsync docs.
      const result = await retryQueueAsync(queuePath, (p) => sendTelemetry(p, { url: srv.url, key: 'bad' }));
      assert.deepEqual(result, { attempted: 1, sent: 1 - 1, remaining: 1 });
      assert.equal(JSON.parse(fs.readFileSync(queuePath, 'utf8')).length, 1);
    } finally { await srv.close(); }
  });

  it('T-RQ-3: a throwing sender leaves the entry queued', async () => {
    fs.writeFileSync(queuePath, JSON.stringify([{ runId: 'a' }]));
    const result = await retryQueueAsync(queuePath, () => { throw new Error('boom'); });
    assert.equal(result.remaining, 1);
  });

  it('T-RQ-4: absent or empty queue is a no-op', async () => {
    assert.deepEqual(
      await retryQueueAsync(path.join(tmp, 'nope.json'), () => true),
      { attempted: 0, sent: 0, remaining: 0 }
    );
    fs.writeFileSync(queuePath, '[]');
    assert.equal((await retryQueueAsync(queuePath, () => true)).attempted, 0);
  });

  it('T-RQ-5: telemetry-config surfaces a non-empty queue with a remedy', () => {
    fs.writeFileSync(queuePath, JSON.stringify([{ runId: 'a' }]));
    const out = formatTelemetryConfig({ url: 'https://x.example.com', key: 'mm8_abc123', queuePath });
    assert.match(out, /Failed queue\s*:\s*1 entries/);
    assert.match(out, /validate/);
  });

  it('T-REG-5: failed sends still keep retry accounting unchanged for enriched payloads', async () => {
    const srv = await startServer({ status: 401, body: '{"error":"Unauthorized"}' });
    try {
      fs.writeFileSync(queuePath, JSON.stringify([{
        runId: 'r1',
        run: {
          slug: 'cost-aware-feature',
          status: 'success',
          totalCost: 0.42,
          stages: {
            alex: { status: 'success', cost: 0.11, tokens: { input: 2, output: 3, total: 5 } },
          },
        },
      }]));
      const result = await retryQueueAsync(queuePath, (p) => sendTelemetry(p, { url: srv.url, key: 'bad' }));
      assert.deepEqual(result, { attempted: 1, sent: 0, remaining: 1 });
      assert.equal(JSON.parse(fs.readFileSync(queuePath, 'utf8')).length, 1);
    } finally { await srv.close(); }
  });
});

// ---------------------------------------------------------------------------
// Story: update must not install into an ancestor project (T-UP-*)
//
// `npm install` walks up to the nearest package.json when the cwd has none, so
// running `murmur8 update` in a plain directory installed murmur8 into whichever
// ancestor owned a package.json. Inside this repo that made murmur8 depend on
// itself and put a stale published copy in node_modules/, which
// require.resolve('murmur8/src/telemetry') then loaded in preference to src/ —
// silently reverting the telemetry fix.
// ---------------------------------------------------------------------------

describe('update npm install scoping', () => {
  const { execFileSync } = require('child_process');
  const ROOT = path.join(__dirname, '..');
  const CLI = path.join(ROOT, 'bin', 'cli.js');

  it('T-UP-1: update in a package.json-less dir leaves an ancestor package.json untouched', () => {
    const parent = makeTmp();
    try {
      // Ancestor with its own package.json, standing in for the murmur8 repo
      const ancestorPkg = path.join(parent, 'package.json');
      const original = JSON.stringify({ name: 'ancestor', version: '1.0.0' }, null, 2) + '\n';
      fs.writeFileSync(ancestorPkg, original);

      // Child project with .blueprint but deliberately no package.json
      const child = path.join(parent, 'child');
      fs.mkdirSync(path.join(child, '.blueprint', 'agents'), { recursive: true });
      fs.mkdirSync(path.join(child, '.claude', 'commands'), { recursive: true });

      try {
        execFileSync(process.execPath, [CLI, 'update'], { cwd: child, stdio: 'pipe', timeout: 120000 });
      } catch (_) { /* update may exit non-zero on an incomplete project — the ancestor check is the point */ }

      assert.equal(fs.readFileSync(ancestorPkg, 'utf8'), original,
        'update must not add dependencies to an ancestor project');
      assert.equal(fs.existsSync(path.join(parent, 'node_modules', 'murmur8')), false,
        'update must not install into an ancestor node_modules');
    } finally {
      fs.rmSync(parent, { recursive: true, force: true });
    }
  });

  it('T-UP-2: update.js guards the npm install on a local package.json', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src', 'update.js'), 'utf8');
    const installIdx = src.indexOf("npm install murmur8@latest");
    assert.ok(installIdx > 0, 'expected the npm install call in update.js');
    const preceding = src.slice(0, installIdx);
    assert.match(
      preceding.split('\n').slice(-12).join('\n'),
      /existsSync\(path\.join\(TARGET_DIR, 'package\.json'\)\)/,
      'the npm install must be guarded by a TARGET_DIR package.json check'
    );
  });
});

// ---------------------------------------------------------------------------
// Story: the skills do not suppress telemetry errors (T-SK-*)
// ---------------------------------------------------------------------------

describe('Skill telemetry error surfacing', () => {
  const skill = fs.readFileSync(path.join(__dirname, '..', 'SKILL.md'), 'utf8');
  const refine = fs.readFileSync(path.join(__dirname, '..', 'REFINE_SKILL.md'), 'utf8');

  // Grab the node -e block containing the sendTelemetry call.
  function sendBlock(content) {
    const blocks = content.split('```').filter(b => b.includes('sendTelemetry('));
    assert.ok(blocks.length > 0, 'expected a fenced block containing sendTelemetry(');
    return blocks.join('\n');
  }

  it('T-SK-1: SKILL.md telemetry block does not discard stderr', () => {
    assert.doesNotMatch(
      sendBlock(skill),
      /2>\/dev\/null/,
      'SKILL.md telemetry send must not redirect stderr to /dev/null — that hid a run of 401s'
    );
  });

  it('T-SK-2: REFINE_SKILL.md telemetry block does not discard stderr', () => {
    assert.doesNotMatch(sendBlock(refine), /2>\/dev\/null/);
  });

  it('T-SK-3: both skills inspect the send result rather than swallowing it', () => {
    for (const [name, content] of [['SKILL.md', skill], ['REFINE_SKILL.md', refine]]) {
      const block = sendBlock(content);
      assert.doesNotMatch(block, /\.catch\(\(\)\s*=>\s*\{\s*\}\)/,
        `${name} must not swallow the telemetry result with an empty .catch`);
      assert.match(block, /r\.ok|result\.ok/,
        `${name} must branch on the send result's ok flag`);
    }
  });

  it('T-SK-4: both skills pass queuePath so failures are retryable', () => {
    assert.match(sendBlock(skill), /queuePath/);
    assert.match(sendBlock(refine), /queuePath/);
  });

  it('T-SK-5: REFINE_SKILL.md sends stages (required by the endpoint; its absence returned 422)', () => {
    assert.match(sendBlock(refine), /stages\s*:/);
  });

  it('T-REG-3: telemetry send blocks remain non-blocking for run/refine flows', () => {
    assert.match(sendBlock(skill), /\|\|\s*true/);
    assert.match(sendBlock(refine), /\|\|\s*true/);
  });

  it('T-REG-4: failed-send warning continues to advertise queue/retry signaling', () => {
    assert.match(sendBlock(skill), /queued for retry/);
    assert.match(sendBlock(refine), /queued for retry/);
    assert.match(sendBlock(skill), /queuePath/);
    assert.match(sendBlock(refine), /queuePath/);
  });
});
