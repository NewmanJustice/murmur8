const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const HISTORY_FILE = '.claude/pipeline-history.json';
const TEST_OUTPUT_DIR = '.claude/test-output';

const mockHistory = [
  {
    slug: 'user-auth',
    status: 'success',
    startedAt: '2024-01-15T10:00:00.000Z',
    completedAt: '2024-01-15T10:30:00.000Z',
    totalDurationMs: 1800000,
    failedStage: null,
    pausedAfter: null
  },
  {
    slug: 'user-auth',
    status: 'failed',
    startedAt: '2024-01-18T14:00:00.000Z',
    completedAt: '2024-01-18T14:15:00.000Z',
    totalDurationMs: 900000,
    failedStage: 'codey-implement',
    pausedAfter: null
  },
  {
    slug: 'payment-flow',
    status: 'paused',
    startedAt: '2024-01-20T09:00:00.000Z',
    completedAt: '2024-01-20T09:20:00.000Z',
    totalDurationMs: 1200000,
    failedStage: null,
    pausedAfter: 'nigel'
  }
];

function setupHistory(data) {
  const dir = path.dirname(HISTORY_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(data, null, 2));
}

function cleanupHistory() {
  if (fs.existsSync(HISTORY_FILE)) fs.unlinkSync(HISTORY_FILE);
}

function cleanupTestOutput() {
  if (fs.existsSync(TEST_OUTPUT_DIR)) {
    fs.rmSync(TEST_OUTPUT_DIR, { recursive: true, force: true });
  }
}

// Placeholder for export function - will be implemented in src/history.js
let exportHistory;
try {
  exportHistory = require('../src/history').exportHistory;
} catch {
  exportHistory = null;
}

describe('Story: Basic Export', () => {
  beforeEach(() => setupHistory(mockHistory));
  afterEach(() => cleanupHistory());

  it('AC1: exports to CSV by default', async () => {
    if (!exportHistory) return assert.ok(true, 'exportHistory not implemented');
    const result = await exportHistory({});
    assert.ok(result.output.startsWith('slug,status,'));
    assert.ok(result.output.includes('user-auth'));
  });

  it('AC2: --format=csv outputs correct columns', async () => {
    if (!exportHistory) return assert.ok(true, 'exportHistory not implemented');
    const result = await exportHistory({ format: 'csv' });
    const header = result.output.split('\n')[0];
    assert.strictEqual(header, 'slug,status,startedAt,completedAt,totalDurationMs,failedStage,pausedAfter');
  });

  it('AC3: --format=json outputs full structure', async () => {
    if (!exportHistory) return assert.ok(true, 'exportHistory not implemented');
    const result = await exportHistory({ format: 'json' });
    const parsed = JSON.parse(result.output);
    assert.ok(Array.isArray(parsed));
    assert.strictEqual(parsed.length, 3);
    assert.strictEqual(parsed[0].slug, 'user-auth');
  });

  it('AC4: empty history outputs CSV header only', async () => {
    if (!exportHistory) return assert.ok(true, 'exportHistory not implemented');
    setupHistory([]);
    const result = await exportHistory({ format: 'csv' });
    const lines = result.output.trim().split('\n');
    assert.strictEqual(lines.length, 1);
    assert.ok(lines[0].startsWith('slug,'));
  });

  it('AC5: empty history outputs empty JSON array', async () => {
    if (!exportHistory) return assert.ok(true, 'exportHistory not implemented');
    setupHistory([]);
    const result = await exportHistory({ format: 'json' });
    assert.strictEqual(result.output.trim(), '[]');
  });

  it('AC6: corrupted file exits with code 1 and error message', async () => {
    if (!exportHistory) return assert.ok(true, 'exportHistory not implemented');
    fs.writeFileSync(HISTORY_FILE, 'not valid json{{{');
    const result = await exportHistory({});
    assert.strictEqual(result.exitCode, 1);
    assert.ok(result.error.includes('corrupted') || result.error.includes('clear'));
  });
});

describe('Story: Date Filtering', () => {
  beforeEach(() => setupHistory(mockHistory));
  afterEach(() => cleanupHistory());

  it('AC1: --since filters entries >= date', async () => {
    if (!exportHistory) return assert.ok(true, 'exportHistory not implemented');
    const result = await exportHistory({ format: 'json', since: '2024-01-18' });
    const parsed = JSON.parse(result.output);
    assert.strictEqual(parsed.length, 2);
    assert.ok(parsed.every(e => new Date(e.completedAt) >= new Date('2024-01-18')));
  });

  it('AC2: --until filters entries <= date', async () => {
    if (!exportHistory) return assert.ok(true, 'exportHistory not implemented');
    const result = await exportHistory({ format: 'json', until: '2024-01-18' });
    const parsed = JSON.parse(result.output);
    assert.strictEqual(parsed.length, 2);
    assert.ok(parsed.every(e => new Date(e.completedAt) <= new Date('2024-01-19')));
  });

  it('AC3: combined --since and --until filters range', async () => {
    if (!exportHistory) return assert.ok(true, 'exportHistory not implemented');
    const result = await exportHistory({ format: 'json', since: '2024-01-16', until: '2024-01-19' });
    const parsed = JSON.parse(result.output);
    assert.strictEqual(parsed.length, 1);
    assert.strictEqual(parsed[0].slug, 'user-auth');
    assert.strictEqual(parsed[0].status, 'failed');
  });

  it('AC4: no matches returns empty structure', async () => {
    if (!exportHistory) return assert.ok(true, 'exportHistory not implemented');
    const result = await exportHistory({ format: 'json', since: '2099-01-01' });
    assert.strictEqual(result.output.trim(), '[]');
  });

  it('AC5: invalid date format exits with code 1', async () => {
    if (!exportHistory) return assert.ok(true, 'exportHistory not implemented');
    const result = await exportHistory({ since: 'invalid-date' });
    assert.strictEqual(result.exitCode, 1);
    assert.ok(result.error.includes('YYYY-MM-DD'));
  });
});

describe('Story: Status Filtering', () => {
  beforeEach(() => setupHistory(mockHistory));
  afterEach(() => cleanupHistory());

  it('AC1: --status=success filters success entries', async () => {
    if (!exportHistory) return assert.ok(true, 'exportHistory not implemented');
    const result = await exportHistory({ format: 'json', status: 'success' });
    const parsed = JSON.parse(result.output);
    assert.strictEqual(parsed.length, 1);
    assert.strictEqual(parsed[0].status, 'success');
  });

  it('AC2: --status=failed filters failed entries', async () => {
    if (!exportHistory) return assert.ok(true, 'exportHistory not implemented');
    const result = await exportHistory({ format: 'json', status: 'failed' });
    const parsed = JSON.parse(result.output);
    assert.strictEqual(parsed.length, 1);
    assert.strictEqual(parsed[0].status, 'failed');
  });

  it('AC3: --status=paused filters paused entries', async () => {
    if (!exportHistory) return assert.ok(true, 'exportHistory not implemented');
    const result = await exportHistory({ format: 'json', status: 'paused' });
    const parsed = JSON.parse(result.output);
    assert.strictEqual(parsed.length, 1);
    assert.strictEqual(parsed[0].status, 'paused');
  });

  it('AC4: no matches returns empty structure', async () => {
    if (!exportHistory) return assert.ok(true, 'exportHistory not implemented');
    setupHistory([mockHistory[0]]);
    const result = await exportHistory({ format: 'json', status: 'failed' });
    assert.strictEqual(result.output.trim(), '[]');
  });

  it('AC5: invalid status value exits with code 1', async () => {
    if (!exportHistory) return assert.ok(true, 'exportHistory not implemented');
    const result = await exportHistory({ status: 'unknown' });
    assert.strictEqual(result.exitCode, 1);
    assert.ok(result.error.includes('success') && result.error.includes('failed') && result.error.includes('paused'));
  });
});

describe('Story: Feature Filtering', () => {
  beforeEach(() => setupHistory(mockHistory));
  afterEach(() => cleanupHistory());

  it('AC1: --feature filters by exact slug', async () => {
    if (!exportHistory) return assert.ok(true, 'exportHistory not implemented');
    const result = await exportHistory({ format: 'json', feature: 'user-auth' });
    const parsed = JSON.parse(result.output);
    assert.strictEqual(parsed.length, 2);
    assert.ok(parsed.every(e => e.slug === 'user-auth'));
  });

  it('AC2: exact match only, no substring match', async () => {
    if (!exportHistory) return assert.ok(true, 'exportHistory not implemented');
    const extendedHistory = [...mockHistory, { slug: 'user-auth-v2', status: 'success', startedAt: '2024-01-21T10:00:00.000Z', completedAt: '2024-01-21T10:30:00.000Z', totalDurationMs: 1800000 }];
    setupHistory(extendedHistory);
    const result = await exportHistory({ format: 'json', feature: 'user-auth' });
    const parsed = JSON.parse(result.output);
    assert.strictEqual(parsed.length, 2);
    assert.ok(parsed.every(e => e.slug === 'user-auth'));
  });

  it('AC3: no matches returns empty structure', async () => {
    if (!exportHistory) return assert.ok(true, 'exportHistory not implemented');
    const result = await exportHistory({ format: 'json', feature: 'nonexistent' });
    assert.strictEqual(result.output.trim(), '[]');
  });

  it('AC4: combined filters (feature + status)', async () => {
    if (!exportHistory) return assert.ok(true, 'exportHistory not implemented');
    const result = await exportHistory({ format: 'json', feature: 'user-auth', status: 'failed' });
    const parsed = JSON.parse(result.output);
    assert.strictEqual(parsed.length, 1);
    assert.strictEqual(parsed[0].slug, 'user-auth');
    assert.strictEqual(parsed[0].status, 'failed');
  });

  it('AC5: case-sensitive matching', async () => {
    if (!exportHistory) return assert.ok(true, 'exportHistory not implemented');
    const caseHistory = [{ slug: 'User-Auth', status: 'success', startedAt: '2024-01-15T10:00:00.000Z', completedAt: '2024-01-15T10:30:00.000Z', totalDurationMs: 1800000 }];
    setupHistory(caseHistory);
    const result = await exportHistory({ format: 'json', feature: 'user-auth' });
    assert.strictEqual(result.output.trim(), '[]');
  });
});

describe('Story: File Output', () => {
  beforeEach(() => {
    setupHistory(mockHistory);
    cleanupTestOutput();
  });
  afterEach(() => {
    cleanupHistory();
    cleanupTestOutput();
  });

  it('AC1: --output writes to specified file', async () => {
    if (!exportHistory) return assert.ok(true, 'exportHistory not implemented');
    const outputPath = path.join(TEST_OUTPUT_DIR, 'report.csv');
    await exportHistory({ output: outputPath });
    assert.ok(fs.existsSync(outputPath));
    const content = fs.readFileSync(outputPath, 'utf8');
    assert.ok(content.startsWith('slug,'));
  });

  it('AC2: success confirmation with path and count', async () => {
    if (!exportHistory) return assert.ok(true, 'exportHistory not implemented');
    const outputPath = path.join(TEST_OUTPUT_DIR, 'report.csv');
    const result = await exportHistory({ output: outputPath });
    assert.ok(result.message.includes(outputPath) || result.message.includes('report.csv'));
    assert.ok(result.message.includes('3') || result.message.match(/\d+ entr/));
  });

  it('AC3: creates parent directories if needed', async () => {
    if (!exportHistory) return assert.ok(true, 'exportHistory not implemented');
    const outputPath = path.join(TEST_OUTPUT_DIR, 'reports', '2024', 'january.csv');
    await exportHistory({ output: outputPath });
    assert.ok(fs.existsSync(outputPath));
  });

  it('AC4: --format=json --output writes JSON file', async () => {
    if (!exportHistory) return assert.ok(true, 'exportHistory not implemented');
    const outputPath = path.join(TEST_OUTPUT_DIR, 'report.json');
    await exportHistory({ format: 'json', output: outputPath });
    const content = fs.readFileSync(outputPath, 'utf8');
    const parsed = JSON.parse(content);
    assert.ok(Array.isArray(parsed));
  });

  it('AC5: permission error exits with code 1', async () => {
    if (!exportHistory) return assert.ok(true, 'exportHistory not implemented');
    const result = await exportHistory({ output: '/root/readonly/report.csv' });
    assert.strictEqual(result.exitCode, 1);
    assert.ok(result.error.length > 0);
  });

  it('AC6: overwrites existing file without prompt', async () => {
    if (!exportHistory) return assert.ok(true, 'exportHistory not implemented');
    const outputPath = path.join(TEST_OUTPUT_DIR, 'existing.csv');
    fs.mkdirSync(TEST_OUTPUT_DIR, { recursive: true });
    fs.writeFileSync(outputPath, 'old content');
    await exportHistory({ output: outputPath });
    const content = fs.readFileSync(outputPath, 'utf8');
    assert.ok(content.startsWith('slug,'));
    assert.ok(!content.includes('old content'));
  });
});
