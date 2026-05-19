'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');

// ---------------------------------------------------------------------------
// loadConfig — parse .env line by line; real process.env takes precedence
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
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      fileVars[key] = val;
    }
  } catch (_) { /* file absent or unreadable — ignore */ }

  const rawUrl = process.env.MURMUR8_TELEMETRY_URL ?? fileVars.MURMUR8_TELEMETRY_URL ?? '';
  const rawKey = process.env.MURMUR8_TELEMETRY_KEY ?? fileVars.MURMUR8_TELEMETRY_KEY ?? '';

  let url = null;
  try { url = rawUrl ? (new URL(rawUrl), rawUrl) : null; } catch (_) { url = null; }

  return { url, key: rawKey || null };
}

// ---------------------------------------------------------------------------
// generateRunId — crypto UUID v4
// ---------------------------------------------------------------------------
function generateRunId() {
  return crypto.randomUUID();
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
function buildPayload(runData) {
  const { runId, featureId, slug, status, startedAt, completedAt,
          totalDurationMs, stages, artifacts, feedback } = runData;

  const run = { featureId, slug, status, startedAt, completedAt, totalDurationMs };
  if (stages) run.stages = stages;
  if (feedback && typeof feedback === 'object' && Object.keys(feedback).length > 0) {
    run.feedback = feedback;
  }

  const payload = { runId, run };
  if (artifacts) payload.artifacts = artifacts;
  return payload;
}

// ---------------------------------------------------------------------------
// compressArtifact — gzip + base64 (synchronous)
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
// ensureDotenv — creates/appends .env with commented telemetry template
// ---------------------------------------------------------------------------
const DOTENV_MARKER = 'MURMUR8_TELEMETRY_URL';
const DOTENV_TEMPLATE = `
# murmur8 Telemetry — remove comments and set values to enable
# MURMUR8_TELEMETRY_URL=https://your-endpoint.example.com/events
# MURMUR8_TELEMETRY_KEY=your-api-key
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
// ensureGitignore — adds .env to .gitignore; creates .gitignore if absent
// ---------------------------------------------------------------------------
function ensureGitignore(targetDir) {
  const giPath = path.join(targetDir, '.gitignore');
  try {
    const existing = fs.readFileSync(giPath, 'utf8');
    const lines = existing.split('\n').map(l => l.trim());
    if (lines.includes('.env')) return;
    fs.writeFileSync(giPath, existing + (existing.endsWith('\n') ? '' : '\n') + '.env\n');
  } catch (_) {
    fs.writeFileSync(giPath, '.env\n');
  }
}

// ---------------------------------------------------------------------------
// formatTelemetryConfig — returns formatted config string
// ---------------------------------------------------------------------------
function formatTelemetryConfig(config, queuePath) {
  const { url, key } = config;
  const status = url ? 'active' : 'inactive';

  let maskedKey = 'not set';
  if (key) {
    maskedKey = key.length > 4 ? `****${key.slice(-4)}` : '****';
  }

  let queueDepth = 0;
  try {
    const q = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
    if (Array.isArray(q)) queueDepth = q.length;
  } catch (_) { /* file absent or corrupt */ }

  return [
    `Telemetry status : ${status}`,
    `URL              : ${url || 'not set'}`,
    `API key          : ${maskedKey}`,
    `Failed queue     : ${queueDepth} entries`,
  ].join('\n');
}

module.exports = {
  loadConfig,
  generateRunId,
  ensureFeatureId,
  buildPayload,
  compressArtifact,
  enqueueFailure,
  retryQueue,
  ensureDotenv,
  ensureGitignore,
  formatTelemetryConfig,
};
