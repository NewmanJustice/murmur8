'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { calculateCost, loadPricingConfig } = require('./cost');

// ---------------------------------------------------------------------------
// Default location of the failed-send queue, relative to the .env directory.
// ---------------------------------------------------------------------------
const QUEUE_FILENAME = path.join('.claude', 'telemetry-failed.json');

// ---------------------------------------------------------------------------
// parseEnvValue — unwrap a raw `.env` value
//
// Shell-style .env files are routinely written with quotes. A bare slice keeps
// them in the value, which then lands in the Authorization header as
// `Bearer "mm8_…"` and the server rejects it as an invalid token.
//
// Only a MATCHING leading/trailing quote pair is stripped — a lone quote, or a
// quote in the middle, may be part of the real secret and is left alone.
// ---------------------------------------------------------------------------
function parseEnvValue(raw) {
  const val = raw.trim();
  if (val.length < 2) return val;

  const first = val[0];
  if ((first === '"' || first === "'") && val[val.length - 1] === first) {
    return val.slice(1, -1);
  }

  // Unquoted values only: drop a trailing ` # comment`
  const commentIdx = val.search(/\s+#/);
  return commentIdx === -1 ? val : val.slice(0, commentIdx).trim();
}

// ---------------------------------------------------------------------------
// loadConfig — parse .env line by line; real process.env takes precedence
//
// Returns { url, key, queuePath }. queuePath is where sendTelemetry parks
// payloads it could not deliver, resolved against the .env directory so it is
// independent of cwd.
// ---------------------------------------------------------------------------
function loadConfig(dotenvPath) {
  const fileVars = {};
  try {
    const lines = fs.readFileSync(dotenvPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      // Tolerate `export KEY=value`, which is valid in a sourced .env
      const key = trimmed.slice(0, eqIdx).trim().replace(/^export\s+/, '');
      fileVars[key] = parseEnvValue(trimmed.slice(eqIdx + 1));
    }
  } catch (_) { /* file absent or unreadable — ignore */ }

  // process.env values are unquoted by the shell already, but a value exported
  // from a script (export KEY='"x"') can still arrive wrapped — normalise both.
  const fromEnv = (name) =>
    process.env[name] === undefined ? undefined : parseEnvValue(process.env[name]);

  const rawUrl = fromEnv('MURMUR8_TELEMETRY_URL') ?? fileVars.MURMUR8_TELEMETRY_URL ?? '';
  const rawKey = fromEnv('MURMUR8_TELEMETRY_KEY') ?? fileVars.MURMUR8_TELEMETRY_KEY ?? '';
  const rawQueue = fromEnv('MURMUR8_TELEMETRY_QUEUE') ?? fileVars.MURMUR8_TELEMETRY_QUEUE ?? '';

  let url = null;
  try { url = rawUrl ? (new URL(rawUrl), rawUrl) : null; } catch (_) { url = null; }

  const queuePath = rawQueue || path.join(path.dirname(dotenvPath), QUEUE_FILENAME);

  return { url, key: rawKey || null, queuePath };
}

// ---------------------------------------------------------------------------
// generateRunId — crypto UUID v4
// ---------------------------------------------------------------------------
function generateRunId() {
  return crypto.randomUUID();
}

// ---------------------------------------------------------------------------
// resolveGitContext — resolves gitHubUser and repoName from git + env
//
// gitHubUser fallback chain:
//   GITHUB_ACTOR → GITHUB_USER → git config user.email → git config user.name → null
//
// repoName: last path segment of `git remote get-url origin`, .git suffix stripped
// Both fields are null when unavailable rather than throwing.
// ---------------------------------------------------------------------------
function resolveGitContext(cwd) {
  function git(...args) {
    try {
      return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || null;
    } catch (_) { return null; }
  }

  const gitHubUser =
    process.env.GITHUB_ACTOR ||
    process.env.GITHUB_USER ||
    git('config', 'user.email') ||
    git('config', 'user.name') ||
    null;

  let repoName = null;
  const remoteUrl = git('remote', 'get-url', 'origin');
  if (remoteUrl) {
    // Strip .git suffix, then grab the last path/colon-separated segment
    const cleaned = remoteUrl.replace(/\.git$/, '');
    const match = cleaned.match(/[/:]([\w.-]+)$/);
    if (match) repoName = match[1];
  }

  return { gitHubUser, repoName };
}

// ---------------------------------------------------------------------------
// ensureFeatureId — reads/writes featureId into YAML frontmatter
// ---------------------------------------------------------------------------
function ensureFeatureId(specPath) {
  const content = fs.readFileSync(specPath, 'utf8');
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n/);

  if (fmMatch) {
    const fmBody = fmMatch[1];
    const idMatch = fmBody.match(/^featureId:\s*(.+)$/m);
    if (idMatch) return idMatch[1].trim();

    // Frontmatter exists but no featureId — insert it
    const newId = generateRunId();
    const newFm = `---\nfeatureId: ${newId}\n${fmBody}\n---\n`;
    fs.writeFileSync(specPath, newFm + content.slice(fmMatch[0].length));
    return newId;
  }

  // No frontmatter — prepend
  const newId = generateRunId();
  fs.writeFileSync(specPath, `---\nfeatureId: ${newId}\n---\n${content}`);
  return newId;
}

// ---------------------------------------------------------------------------
// buildPayload — assembles telemetry payload; omits feedback when empty
// ---------------------------------------------------------------------------
// Forwarded verbatim when present. These are all accepted by the ingestion
// endpoint; omitting them left the corresponding columns null on every run.
const OPTIONAL_RUN_FIELDS = [
  'type',          // 'feature' | 'refinement' — defaults to 'feature' server-side
  'parentRunId',   // links a refinement to the run it refines
  'failedStage',   // set when status === 'failed'
  'pausedAfter',   // set when status === 'paused'
  'featureSpec',
  'stories',
];

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function hasOwn(obj, key) {
  return Boolean(obj) && Object.prototype.hasOwnProperty.call(obj, key);
}

function pickWithRuntimePrecedence(runtimeObj, historyObj, key) {
  if (hasOwn(runtimeObj, key)) return runtimeObj[key];
  if (hasOwn(historyObj, key)) return historyObj[key];
  return undefined;
}

function normalizeStageTokens(runtimeTokens, historyTokens) {
  const inputCandidate = pickWithRuntimePrecedence(runtimeTokens, historyTokens, 'input');
  const outputCandidate = pickWithRuntimePrecedence(runtimeTokens, historyTokens, 'output');
  const totalCandidate = pickWithRuntimePrecedence(runtimeTokens, historyTokens, 'total');

  const tokens = {};
  if (isFiniteNumber(inputCandidate)) tokens.input = inputCandidate;
  if (isFiniteNumber(outputCandidate)) tokens.output = outputCandidate;

  if (isFiniteNumber(tokens.input) && isFiniteNumber(tokens.output)) {
    const sum = tokens.input + tokens.output;
    tokens.total = isFiniteNumber(totalCandidate) && totalCandidate === sum ? totalCandidate : sum;
  }

  return Object.keys(tokens).length > 0 ? tokens : undefined;
}

function normalizeStageEconomics(runtimeStage, historyStage) {
  const stage = { ...runtimeStage };

  const costCandidate = pickWithRuntimePrecedence(runtimeStage, historyStage, 'cost');
  if (isFiniteNumber(costCandidate)) stage.cost = costCandidate;
  else delete stage.cost;

  const runtimeTokens = runtimeStage && typeof runtimeStage.tokens === 'object' ? runtimeStage.tokens : undefined;
  const historyTokens = historyStage && typeof historyStage.tokens === 'object' ? historyStage.tokens : undefined;
  const tokens = normalizeStageTokens(runtimeTokens, historyTokens);

  if (tokens) stage.tokens = tokens;
  else delete stage.tokens;

  return stage;
}

function resolveHistoryStages(runData) {
  const candidates = [
    runData && runData.historyStages,
    runData && runData.historyEntry && runData.historyEntry.run && runData.historyEntry.run.stages,
    runData && runData.history && runData.history.run && runData.history.run.stages,
  ];
  for (const candidate of candidates) {
    if (candidate && typeof candidate === 'object') return candidate;
  }
  return undefined;
}

function resolveUsageEventStage(event) {
  const direct =
    event && (event.stage || event.stageName || event.pipelineStage || event.stage_id);
  if (typeof direct === 'string' && direct.trim()) return direct.trim();

  const nested = event && event.metadata;
  if (nested && typeof nested === 'object') {
    const metaStage = nested.stage || nested.stageName || nested.pipelineStage;
    if (typeof metaStage === 'string' && metaStage.trim()) return metaStage.trim();
  }

  return null;
}

function firstFiniteNumber(candidates) {
  for (const candidate of candidates) {
    if (typeof candidate === 'number' && Number.isFinite(candidate)) return candidate;
  }
  return undefined;
}

function resolveUsageEventTokens(event) {
  if (!event || typeof event !== 'object') return null;

  const usage = event.usage && typeof event.usage === 'object' ? event.usage : {};
  const input = firstFiniteNumber([
    usage.inputTokens,
    usage.input_tokens,
    event.inputTokens,
    event.input_tokens,
    event.usage_input_tokens,
  ]);
  const output = firstFiniteNumber([
    usage.outputTokens,
    usage.output_tokens,
    event.outputTokens,
    event.output_tokens,
    event.usage_output_tokens,
  ]);
  const total = firstFiniteNumber([
    usage.totalTokens,
    usage.total_tokens,
    event.totalTokens,
    event.total_tokens,
    event.usage_total_tokens,
  ]);

  return { input, output, total };
}

function deriveStageEconomicsFromUsageEvents(usageEvents, pricing = loadPricingConfig()) {
  if (!Array.isArray(usageEvents) || usageEvents.length === 0) return undefined;

  const byStage = {};

  for (const event of usageEvents) {
    const stageName = resolveUsageEventStage(event);
    if (!stageName) continue;

    const tokens = resolveUsageEventTokens(event);
    const hasInput = isFiniteNumber(tokens.input);
    const hasOutput = isFiniteNumber(tokens.output);
    if (!hasInput && !hasOutput) continue;

    if (!byStage[stageName]) {
      byStage[stageName] = { input: 0, output: 0, cost: 0 };
    }

    const input = hasInput ? tokens.input : 0;
    const output = hasOutput ? tokens.output : 0;
    byStage[stageName].input += input;
    byStage[stageName].output += output;

    const explicitCost = firstFiniteNumber([
      event.cost,
      event.estimatedCost,
      event.total_nano_aiu,
      event.totalNanoAiu,
    ]);
    if (isFiniteNumber(explicitCost)) {
      byStage[stageName].cost += explicitCost;
    } else {
      byStage[stageName].cost += calculateCost(input, output, pricing);
    }
  }

  const result = {};
  for (const [stage, aggregate] of Object.entries(byStage)) {
    const tokens = {
      input: aggregate.input,
      output: aggregate.output,
      total: aggregate.input + aggregate.output,
    };
    result[stage] = {
      cost: Math.round(aggregate.cost * 1000) / 1000,
      tokens,
    };
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

function applyUsageEventEconomics(stages, usageStageEconomics) {
  if (!stages || typeof stages !== 'object') return stages;
  if (!usageStageEconomics || typeof usageStageEconomics !== 'object') return stages;

  const hydrated = {};
  for (const [stageName, stageData] of Object.entries(stages)) {
    if (!stageData || typeof stageData !== 'object') {
      hydrated[stageName] = stageData;
      continue;
    }

    const usage = usageStageEconomics[stageName];
    if (!usage || typeof usage !== 'object') {
      hydrated[stageName] = { ...stageData };
      continue;
    }

    const next = { ...stageData };
    if (!hasOwn(next, 'cost') && isFiniteNumber(usage.cost)) next.cost = usage.cost;
    if (!hasOwn(next, 'tokens') && usage.tokens && typeof usage.tokens === 'object') {
      next.tokens = usage.tokens;
    }
    hydrated[stageName] = next;
  }

  return hydrated;
}

function normalizeStages(stages, historyStages) {
  if (!stages || typeof stages !== 'object') return stages;

  const normalized = {};
  for (const [stageName, runtimeStage] of Object.entries(stages)) {
    if (!runtimeStage || typeof runtimeStage !== 'object') {
      normalized[stageName] = runtimeStage;
      continue;
    }
    const historyStage = historyStages && typeof historyStages === 'object'
      ? historyStages[stageName]
      : undefined;
    normalized[stageName] = normalizeStageEconomics(runtimeStage, historyStage);
  }
  return normalized;
}

function buildPayload(runData) {
  const { runId, featureId, slug, status, startedAt, completedAt,
          totalDurationMs, stages, artifacts, feedback,
          gitHubUser = null, repoName = null } = runData;
  const historyStages = resolveHistoryStages(runData);
  const usageEvents = Array.isArray(runData.usageEvents)
    ? runData.usageEvents
    : (Array.isArray(runData.onLlmEndEvents) ? runData.onLlmEndEvents : undefined);
  const usageStageEconomics = deriveStageEconomicsFromUsageEvents(usageEvents, runData.pricing);

  const run = { featureId, slug, status, startedAt, completedAt, totalDurationMs,
               gitHubUser, repoName };
  run.commitHash = typeof runData.commitHash === 'string' ? runData.commitHash : null;
  if (isFiniteNumber(runData.totalCost)) run.totalCost = runData.totalCost;
  if (stages) {
    const withUsage = applyUsageEventEconomics(stages, usageStageEconomics);
    run.stages = normalizeStages(withUsage, historyStages);
  }
  if (feedback && typeof feedback === 'object' && Object.keys(feedback).length > 0) {
    run.feedback = feedback;
  }
  for (const field of OPTIONAL_RUN_FIELDS) {
    if (runData[field] !== undefined && runData[field] !== null) run[field] = runData[field];
  }

  // runId is a client-side correlation id used by local history. The ingestion
  // endpoint mints its own id and ignores this envelope — sendTelemetry unwraps
  // `run` before posting. Kept so callers can correlate a send with a history
  // entry; do not expect it to appear server-side.
  const payload = { runId, run };
  if (artifacts) payload.artifacts = artifacts;
  return payload;
}

// ---------------------------------------------------------------------------
// compressArtifact — gzip + base64 (synchronous)
//
// NOT the channel for sending artifacts to the portal. The ingestion endpoint
// has no `artifacts` field, and sendTelemetry posts only the `run` object, so
// `payload.artifacts` is dropped before the request is made.
//
// Artifact content reaches the portal through two plain-text run fields:
//   featureSpec — the FEATURE_SPEC.md body as UTF-8 text
//   stories     — [{ title, content }, …]
//
// Do not pass compressArtifact() output into either: the column is a plain
// string, so gzip+base64 would store as unreadable noise rather than fail.
// Retained for local/offline use and for callers that snapshot artifacts
// themselves.
// ---------------------------------------------------------------------------
function compressArtifact(content) {
  return zlib.gzipSync(Buffer.from(content, 'utf8')).toString('base64');
}

// ---------------------------------------------------------------------------
// enqueueFailure — appends to queue; caps at 50; creates file if absent
// ---------------------------------------------------------------------------
function enqueueFailure(payload, queuePath) {
  let queue = [];
  try {
    queue = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
    if (!Array.isArray(queue)) queue = [];
  } catch (_) { queue = []; }

  queue.push(payload);
  if (queue.length > 50) queue = queue.slice(queue.length - 50);
  fs.writeFileSync(queuePath, JSON.stringify(queue, null, 2));
}

// ---------------------------------------------------------------------------
// retryQueue — calls sendFn per entry; removes successes; writes remaining
// ---------------------------------------------------------------------------
function retryQueue(queuePath, sendFn) {
  let queue;
  try {
    queue = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
    if (!Array.isArray(queue)) return;
  } catch (_) { return; }

  const remaining = [];
  for (const entry of queue) {
    const ok = sendFn(entry);
    if (!ok) remaining.push(entry);
  }
  fs.writeFileSync(queuePath, JSON.stringify(remaining, null, 2));
}

// ---------------------------------------------------------------------------
// retryQueueAsync — drain the queue through an async sender (sendTelemetry)
//
// The sync retryQueue above cannot await an HTTP POST, so nothing could ever
// actually redeliver a queued run. sendFn may return a boolean or a
// sendTelemetry result object; only a truthy `ok` clears an entry.
//
// IMPORTANT: the sendFn must be built WITHOUT queuePath, otherwise a failed
// retry re-appends the same payload it is retrying.
// ---------------------------------------------------------------------------
async function retryQueueAsync(queuePath, sendFn) {
  let queue;
  try {
    queue = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
    if (!Array.isArray(queue) || queue.length === 0) {
      return { attempted: 0, sent: 0, remaining: Array.isArray(queue) ? queue.length : 0 };
    }
  } catch (_) { return { attempted: 0, sent: 0, remaining: 0 }; }

  const remaining = [];
  let sent = 0;
  for (const entry of queue) {
    let ok = false;
    try {
      const result = await sendFn(entry);
      ok = (result && typeof result === 'object') ? result.ok === true : Boolean(result);
    } catch (_) { ok = false; }
    if (ok) sent++; else remaining.push(entry);
  }

  try {
    fs.writeFileSync(queuePath, JSON.stringify(remaining, null, 2));
  } catch (_) { /* queue unwritable — entries stay for the next attempt */ }

  return { attempted: queue.length, sent, remaining: remaining.length };
}

// ---------------------------------------------------------------------------
// sendTelemetry — non-blocking HTTP POST that REPORTS its outcome
//
// Never rejects: a telemetry problem must not fail a pipeline run. But it no
// longer hides one either. Resolves to:
//
//   { ok, statusCode, id, error, queued, skipped }
//
// ok is true only for a 2xx. Anything else — 4xx, 5xx, socket error, timeout —
// resolves ok:false, and when config.queuePath is set the payload is appended
// to the failed queue so `retryQueueAsync` can redeliver it later.
//
// Previously this drained the response and resolved undefined, making a 401
// indistinguishable from a 201. That is how a misconfigured key silently
// discarded every run.
// ---------------------------------------------------------------------------
function sendTelemetry(payload, config) {
  const { url, key, queuePath } = config || {};
  if (!url) {
    return Promise.resolve({
      ok: false, skipped: true, statusCode: null, id: null,
      error: 'telemetry URL not configured', queued: false,
    });
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (result) => {
      if (settled) return; // timeout → destroy → 'error' can re-enter
      settled = true;
      let queued = false;
      if (!result.ok && queuePath) {
        try { enqueueFailure(payload, queuePath); queued = true; } catch (_) { /* queue unwritable */ }
      }
      resolve({ id: null, error: null, skipped: false, ...result, queued });
    };

    // Portal expects flat fields — unwrap the { runId, run } envelope if present
    const data = (payload && payload.run) ? payload.run : payload;
    const body = JSON.stringify(data);
    const parsedUrl = new URL(url);
    const isHttps = parsedUrl.protocol === 'https:';
    const transport = isHttps ? require('https') : require('http');

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + (parsedUrl.search || ''),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'Authorization': `Bearer ${key || ''}`,
      },
    };

    const req = transport.request(options, (res) => {
      const status = res.statusCode;
      let raw = '';
      res.setEncoding('utf8');
      // Cap what we buffer — the body is only wanted for the id / error detail
      res.on('data', (chunk) => { if (raw.length < 2048) raw += chunk; });
      res.on('error', () => finish({ ok: false, statusCode: status, error: 'response stream error' }));
      res.on('end', () => {
        if (status >= 200 && status < 300) {
          let id = null;
          try { id = JSON.parse(raw).id ?? null; } catch (_) { /* body absent or not JSON */ }
          return finish({ ok: true, statusCode: status, id });
        }
        finish({
          ok: false,
          statusCode: status,
          error: `HTTP ${status}${raw ? ` — ${raw.slice(0, 300)}` : ''}`,
        });
      });
    });

    req.setTimeout(10000, () => {
      req.destroy();
      finish({ ok: false, statusCode: null, error: 'request timed out after 10000ms' });
    });
    req.on('error', (err) => finish({ ok: false, statusCode: null, error: err.message }));
    req.write(body);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// ensureDotenv — creates/appends .env with commented telemetry template
// ---------------------------------------------------------------------------
const DOTENV_MARKER = 'MURMUR8_TELEMETRY_URL';
const DOTENV_TEMPLATE = `
# murmur8 Telemetry — remove comments and set values to enable
# Quotes around a value are optional and are stripped when present.
# MURMUR8_TELEMETRY_URL=https://your-endpoint.example.com/events
# MURMUR8_TELEMETRY_KEY=your-api-key
# Undelivered runs are queued here and retried on the next \`murmur8 validate\`
# MURMUR8_TELEMETRY_QUEUE=.claude/telemetry-failed.json
`;

function ensureDotenv(targetDir) {
  const envPath = path.join(targetDir, '.env');
  try {
    const existing = fs.readFileSync(envPath, 'utf8');
    if (existing.includes(DOTENV_MARKER)) return;
    fs.writeFileSync(envPath, existing + DOTENV_TEMPLATE);
  } catch (_) {
    fs.writeFileSync(envPath, DOTENV_TEMPLATE.trimStart());
  }
}

// ---------------------------------------------------------------------------
// ensureGitignore — ensures telemetry state files are ignored
//
// `.env` holds the API key. The failed-send queue holds run metadata (slugs,
// timings, git user) and is regenerated on demand, so neither belongs in a
// commit. Entries are checked individually: only what is missing gets appended,
// and a .gitignore that already covers everything is left byte-identical.
// ---------------------------------------------------------------------------
const GITIGNORE_ENTRIES = ['.env', QUEUE_FILENAME.split(path.sep).join('/')];

function ensureGitignore(targetDir) {
  const giPath = path.join(targetDir, '.gitignore');
  try {
    const existing = fs.readFileSync(giPath, 'utf8');
    const lines = existing.split('\n').map(l => l.trim());
    const missing = GITIGNORE_ENTRIES.filter(entry => !lines.includes(entry));
    if (missing.length === 0) return;
    fs.writeFileSync(
      giPath,
      existing + (existing.endsWith('\n') ? '' : '\n') + missing.join('\n') + '\n'
    );
  } catch (_) {
    fs.writeFileSync(giPath, GITIGNORE_ENTRIES.join('\n') + '\n');
  }
}

// ---------------------------------------------------------------------------
// formatTelemetryConfig — returns formatted config string
// ---------------------------------------------------------------------------
function formatTelemetryConfig(config, queuePath) {
  const { url, key } = config;
  const resolvedQueuePath = queuePath || config.queuePath;
  const status = url ? 'active' : 'inactive';

  let maskedKey = 'not set';
  if (key) {
    maskedKey = key.length > 4 ? `****${key.slice(-4)}` : '****';
  }

  let queueDepth = 0;
  try {
    const q = JSON.parse(fs.readFileSync(resolvedQueuePath, 'utf8'));
    if (Array.isArray(q)) queueDepth = q.length;
  } catch (_) { /* file absent or corrupt */ }

  const lines = [
    `Telemetry status : ${status}`,
    `URL              : ${url || 'not set'}`,
    `API key          : ${maskedKey}`,
    `Failed queue     : ${queueDepth} entries`,
  ];
  if (queueDepth > 0) {
    lines.push(`                   ${resolvedQueuePath}`);
    lines.push(`                   run \`npx murmur8 validate\` to retry delivery`);
  }
  return lines.join('\n');
}

module.exports = {
  loadConfig,
  generateRunId,
  resolveGitContext,
  ensureFeatureId,
  buildPayload,
  compressArtifact,
  sendTelemetry,
  enqueueFailure,
  retryQueue,
  retryQueueAsync,
  parseEnvValue,
  normalizeStageTokens,
  normalizeStageEconomics,
  normalizeStages,
  deriveStageEconomicsFromUsageEvents,
  applyUsageEventEconomics,
  QUEUE_FILENAME,
  ensureDotenv,
  ensureGitignore,
  formatTelemetryConfig,
};
