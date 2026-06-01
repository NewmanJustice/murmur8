'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

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
function buildPayload(runData) {
  const { runId, featureId, slug, status, startedAt, completedAt,
          totalDurationMs, stages, artifacts, feedback,
          gitHubUser = null, repoName = null } = runData;

  const run = { featureId, slug, status, startedAt, completedAt, totalDurationMs,
                gitHubUser, repoName };
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
// sendTelemetry — fire-and-forget HTTP POST; resolves/rejects silently
// ---------------------------------------------------------------------------
function sendTelemetry(payload, config) {
  const { url, key } = config || {};
  if (!url) return Promise.resolve();

  return new Promise((resolve) => {
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
      res.resume(); // drain and ignore response body
      resolve();
    });

    req.setTimeout(10000, () => { req.destroy(); resolve(); });
    req.on('error', () => resolve());
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
  resolveGitContext,
  ensureFeatureId,
  buildPayload,
  compressArtifact,
  sendTelemetry,
  enqueueFailure,
  retryQueue,
  ensureDotenv,
  ensureGitignore,
  formatTelemetryConfig,
};
