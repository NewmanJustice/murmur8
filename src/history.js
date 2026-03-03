const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { colorize } = require('./theme');

const HISTORY_FILE = '.claude/pipeline-history.json';

function ensureHistoryDir() {
  const dir = path.dirname(HISTORY_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readHistoryFile() {
  ensureHistoryDir();
  if (!fs.existsSync(HISTORY_FILE)) {
    return [];
  }
  try {
    const content = fs.readFileSync(HISTORY_FILE, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    return { error: 'corrupted' };
  }
}

function writeHistoryFile(entries) {
  ensureHistoryDir();
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(entries, null, 2));
}

function recordHistory(entry) {
  try {
    const history = readHistoryFile();
    if (history.error) {
      console.warn('Warning: History file is corrupted, cannot record entry.');
      return false;
    }
    history.push(entry);
    writeHistoryFile(history);
    return true;
  } catch (err) {
    console.warn(`Warning: Failed to record history: ${err.message}`);
    return false;
  }
}

/**
 * Stores feedback for a specific stage in a feature's history entry.
 * Per FEATURE_SPEC.md - feedback is stored at stages[stage].feedback
 * @param {string} slug - Feature slug
 * @param {string} stage - Stage name (alex, cass, nigel, etc.)
 * @param {object} feedback - Feedback object to store
 * @returns {boolean} True if stored successfully
 */
function storeStageFeedback(slug, stage, feedback) {
  try {
    const history = readHistoryFile();
    if (history.error) {
      console.warn('Warning: History file is corrupted, cannot store feedback.');
      return false;
    }

    // Find the most recent entry for this slug
    const entry = history.findLast(e => e.slug === slug);
    if (!entry) {
      console.warn(`Warning: No history entry found for slug: ${slug}`);
      return false;
    }

    // Ensure stages object exists
    if (!entry.stages) {
      entry.stages = {};
    }

    // Ensure stage object exists
    if (!entry.stages[stage]) {
      entry.stages[stage] = {};
    }

    // Store feedback
    entry.stages[stage].feedback = feedback;

    writeHistoryFile(history);
    return true;
  } catch (err) {
    console.warn(`Warning: Failed to store feedback: ${err.message}`);
    return false;
  }
}

function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (minutes === 0) {
    return `${secs}s`;
  }
  return `${minutes}m ${secs}s`;
}

function isValidDateFormat(dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

function escapeCSVField(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatCSV(entries) {
  const headers = ['slug', 'status', 'startedAt', 'completedAt', 'totalDurationMs', 'failedStage', 'pausedAfter'];
  const lines = [headers.join(',')];
  for (const entry of entries) {
    const row = headers.map(h => escapeCSVField(entry[h]));
    lines.push(row.join(','));
  }
  return lines.join('\n');
}

function formatJSON(entries) {
  return JSON.stringify(entries, null, 2);
}

async function exportHistory(options = {}) {
  const { format = 'csv', since, until, status, feature, output } = options;

  const history = readHistoryFile();

  if (history.error === 'corrupted') {
    return { exitCode: 1, error: "History file is corrupted. Run 'murmur8 history clear' to reset." };
  }

  if (since && !isValidDateFormat(since)) {
    return { exitCode: 1, error: 'Invalid --since format. Use YYYY-MM-DD.' };
  }

  if (until && !isValidDateFormat(until)) {
    return { exitCode: 1, error: 'Invalid --until format. Use YYYY-MM-DD.' };
  }

  const validStatuses = ['success', 'failed', 'paused'];
  if (status && !validStatuses.includes(status)) {
    return { exitCode: 1, error: `Invalid --status value. Use: success, failed, paused.` };
  }

  let filtered = history;

  if (since) {
    const sinceDate = new Date(since);
    filtered = filtered.filter(e => e.completedAt && new Date(e.completedAt) >= sinceDate);
  }

  if (until) {
    const untilDate = new Date(until);
    untilDate.setDate(untilDate.getDate() + 1);
    filtered = filtered.filter(e => e.completedAt && new Date(e.completedAt) < untilDate);
  }

  if (status) {
    filtered = filtered.filter(e => e.status === status);
  }

  if (feature) {
    filtered = filtered.filter(e => e.slug === feature);
  }

  const formatted = format === 'json' ? formatJSON(filtered) : formatCSV(filtered);

  if (output) {
    try {
      const dir = path.dirname(output);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(output, formatted);
      return { message: `Exported ${filtered.length} entries to ${output}` };
    } catch (err) {
      return { exitCode: 1, error: err.message };
    }
  }

  return { output: formatted };
}

function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toISOString().replace('T', ' ').slice(0, 19);
}

function displayHistory(options = {}) {
  const showAll = options.all || false;
  const useColor = options.color !== false && process.stdout.isTTY;

  const history = readHistoryFile();

  if (history.error === 'corrupted') {
    console.log("Warning: History file is corrupted. Run 'murmur8 history clear' to reset.");
    return;
  }

  if (!history || history.length === 0) {
    console.log('No pipeline history found.');
    return;
  }

  const sorted = [...history].sort((a, b) =>
    new Date(b.completedAt) - new Date(a.completedAt)
  );

  const entries = showAll ? sorted : sorted.slice(0, 10);
  const total = history.length;
  const showing = entries.length;

  console.log(`\nPipeline History (showing ${showing} of ${total} runs)\n`);
  console.log('  SLUG                STATUS    DATE                  DURATION');

  for (const entry of entries) {
    const slug = entry.slug.padEnd(18);
    let status = entry.status.padEnd(8);
    const date = formatDate(entry.completedAt);
    const duration = formatDuration(entry.totalDurationMs);

    if (entry.status === 'success') {
      status = colorize(status, 'green', useColor);
    } else if (entry.status === 'failed') {
      status = colorize(status, 'red', useColor);
    } else if (entry.status === 'paused') {
      status = colorize(status, 'yellow', useColor);
    }

    let suffix = '';
    if (entry.status === 'failed' && entry.failedStage) {
      suffix = ` (failed at: ${entry.failedStage})`;
    } else if (entry.status === 'paused' && entry.pausedAfter) {
      suffix = ` (paused at: ${entry.pausedAfter})`;
    }

    console.log(`  ${slug}  ${status}  ${date}   ${duration}${suffix}`);
  }

  if (!showAll && total > 10) {
    console.log(`\nRun 'murmur8 history --all' to see all entries.`);
  }
  console.log(`Run 'murmur8 history --stats' for aggregate statistics.`);
}

function showStats() {
  const history = readHistoryFile();

  if (history.error === 'corrupted') {
    console.log("Warning: History file is corrupted. Run 'murmur8 history clear' to reset.");
    return;
  }

  if (!history || history.length === 0) {
    console.log('Insufficient data for statistics. Complete at least one pipeline run.');
    return;
  }

  const total = history.length;
  const successRuns = history.filter(e => e.status === 'success');
  const failedRuns = history.filter(e => e.status === 'failed');
  const pausedRuns = history.filter(e => e.status === 'paused');

  const successCount = successRuns.length;
  const successRate = Math.round((successCount / total) * 100);

  console.log(`\nPipeline Statistics (based on ${total} runs)\n`);
  console.log('  METRIC                    VALUE');
  console.log(`  Success rate              ${successRate}% (${successCount}/${total} runs)`);
  console.log(`  Total runs                ${total} (${successCount} success, ${failedRuns.length} failed, ${pausedRuns.length} paused)`);

  if (successRuns.length > 0) {
    const avgTotal = Math.round(
      successRuns.reduce((sum, e) => sum + e.totalDurationMs, 0) / successRuns.length
    );
    console.log(`  Avg pipeline duration     ${formatDuration(avgTotal)}`);
  }

  const stages = ['alex', 'cass', 'nigel', 'codey-plan', 'codey-implement'];
  const stageStats = {};
  const failureCounts = {};

  for (const stage of stages) {
    stageStats[stage] = { durations: [], failures: 0 };
  }

  for (const entry of history) {
    if (entry.stages) {
      for (const stage of stages) {
        if (entry.stages[stage] && entry.stages[stage].durationMs) {
          stageStats[stage].durations.push(entry.stages[stage].durationMs);
        }
      }
    }
    if (entry.status === 'failed' && entry.failedStage) {
      failureCounts[entry.failedStage] = (failureCounts[entry.failedStage] || 0) + 1;
    }
  }

  console.log('\n  STAGE             AVG DURATION    FAILURES');
  for (const stage of stages) {
    const stats = stageStats[stage];
    const avgDuration = stats.durations.length > 0
      ? formatDuration(Math.round(stats.durations.reduce((a, b) => a + b, 0) / stats.durations.length))
      : 'N/A';
    const failures = failureCounts[stage] || 0;
    console.log(`  ${stage.padEnd(16)}  ${avgDuration.padEnd(14)}  ${failures}`);
  }

  if (failedRuns.length === 0) {
    console.log('\n  No failures recorded');
  } else {
    const maxFailures = Math.max(...Object.values(failureCounts));
    const topFailures = Object.entries(failureCounts)
      .filter(([, count]) => count === maxFailures)
      .map(([stage]) => stage);

    if (topFailures.length === 1) {
      console.log(`\n  Most common failure: ${topFailures[0]} (${maxFailures} failures)`);
    } else {
      console.log(`\n  Most common failures: ${topFailures.join(', ')} (${maxFailures} each)`);
    }
  }
}

async function clearHistory(options = {}) {
  const force = options.force || false;

  const history = readHistoryFile();

  if (history.error === 'corrupted') {
    writeHistoryFile([]);
    console.log('History file was corrupted. File has been reset.');
    return;
  }

  if (!history || history.length === 0) {
    console.log('No history to clear.');
    return;
  }

  const count = history.length;

  if (!force) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise((resolve) => {
      rl.question(`This will delete all ${count} history entries. Continue? (y/N) `, (ans) => {
        rl.close();
        resolve(ans.toLowerCase().trim());
      });
    });

    if (answer !== 'y' && answer !== 'yes') {
      console.log('Clear cancelled. History unchanged.');
      return;
    }
  }

  writeHistoryFile([]);
  console.log(`Pipeline history cleared. ${count} entries removed.`);
}

module.exports = {
  HISTORY_FILE,
  readHistoryFile,
  writeHistoryFile,
  recordHistory,
  storeStageFeedback,
  displayHistory,
  showStats,
  clearHistory,
  formatDuration,
  exportHistory
};
