const { readHistoryFile, formatDuration } = require('./history');
const { colorize } = require('./theme');

const STAGES = ['alex', 'cass', 'nigel', 'codey-plan', 'codey-implement'];

function calculateMean(values) {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function calculateStdDev(values, mean) {
  if (values.length === 0) return 0;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

function analyzeBottlenecks(history) {
  const successRuns = history.filter(e => e.status === 'success' && e.stages);
  if (successRuns.length < 3) {
    return { insufficientData: true, message: 'Insufficient data for bottleneck analysis (need 3+ runs)' };
  }

  const stageDurations = {};
  for (const stage of STAGES) {
    stageDurations[stage] = [];
  }

  for (const entry of successRuns) {
    for (const stage of STAGES) {
      if (entry.stages[stage] && entry.stages[stage].durationMs) {
        stageDurations[stage].push(entry.stages[stage].durationMs);
      }
    }
  }

  const stageAvgs = {};
  let totalAvgDuration = 0;
  for (const stage of STAGES) {
    const avg = calculateMean(stageDurations[stage]);
    stageAvgs[stage] = avg;
    totalAvgDuration += avg;
  }

  let maxStage = null;
  let maxAvg = 0;
  for (const stage of STAGES) {
    if (stageAvgs[stage] > maxAvg) {
      maxAvg = stageAvgs[stage];
      maxStage = stage;
    }
  }

  const percentage = totalAvgDuration > 0 ? (maxAvg / totalAvgDuration) * 100 : 0;
  const isBottleneck = percentage > 35;
  const recommendation = percentage > 40
    ? `Consider optimizing ${maxStage} stage to improve pipeline throughput`
    : null;

  return {
    stages: stageAvgs,
    bottleneckStage: maxStage,
    avgDurationMs: maxAvg,
    percentage: Math.round(percentage * 10) / 10,
    isBottleneck,
    recommendation
  };
}

function analyzeFailures(history) {
  const failedRuns = history.filter(e => e.status === 'failed');
  if (failedRuns.length === 0) {
    return { noFailures: true, message: 'No failures recorded' };
  }

  const failuresByStage = {};
  const featureFailures = {};

  for (const entry of failedRuns) {
    if (entry.failedStage) {
      failuresByStage[entry.failedStage] = (failuresByStage[entry.failedStage] || 0) + 1;
    }
    if (entry.slug) {
      featureFailures[entry.slug] = (featureFailures[entry.slug] || 0) + 1;
    }
  }

  // Find most common failure stage (first occurrence wins ties)
  let mostCommonStage = null;
  let maxCount = 0;
  for (const stage of STAGES) {
    if ((failuresByStage[stage] || 0) > maxCount) {
      maxCount = failuresByStage[stage];
      mostCommonStage = stage;
    }
  }

  const repeatedFeatures = Object.entries(featureFailures)
    .filter(([, count]) => count > 1)
    .map(([slug, count]) => ({ slug, count }));

  const totalRuns = history.length;
  const failureRate = (failedRuns.length / totalRuns) * 100;
  const isHighFailureRate = failureRate > 15;
  const recommendation = failureRate > 20
    ? `High failure rate detected. Review ${mostCommonStage} stage for common issues`
    : null;

  return {
    failuresByStage,
    mostCommonStage,
    failureCount: maxCount,
    repeatedFeatures,
    failureRate: Math.round(failureRate * 10) / 10,
    isHighFailureRate,
    recommendation
  };
}

function detectAnomalies(history) {
  const runsWithStages = history.filter(e => e.stages);
  if (runsWithStages.length < 3) {
    return { insufficientData: true, message: 'Insufficient data for anomaly detection' };
  }

  const stageDurations = {};
  for (const stage of STAGES) {
    stageDurations[stage] = [];
  }

  for (const entry of runsWithStages) {
    for (const stage of STAGES) {
      if (entry.stages[stage] && entry.stages[stage].durationMs) {
        stageDurations[stage].push({
          slug: entry.slug,
          duration: entry.stages[stage].durationMs
        });
      }
    }
  }

  const anomalies = [];
  const last10 = runsWithStages.slice(-10);

  for (const stage of STAGES) {
    const allDurations = stageDurations[stage].map(d => d.duration);
    const mean = calculateMean(allDurations);
    const stddev = calculateStdDev(allDurations, mean);
    const threshold = mean + 2 * stddev;

    for (const entry of last10) {
      if (entry.stages[stage] && entry.stages[stage].durationMs > threshold && stddev > 0) {
        const actual = entry.stages[stage].durationMs;
        const deviation = (actual - mean) / stddev;
        anomalies.push({
          slug: entry.slug,
          stage,
          actual,
          expected: Math.round(mean),
          deviation: Math.round(deviation * 10) / 10
        });
      }
    }
  }

  if (anomalies.length === 0) {
    return { noAnomalies: true, message: 'No anomalies detected in recent runs' };
  }

  return {
    anomalies,
    recommendation: anomalies.length > 0
      ? 'Review flagged runs for unusual conditions or environment issues'
      : null
  };
}

function analyzeTrends(history) {
  if (history.length < 6) {
    return { insufficientData: true, message: 'Insufficient data for trend analysis (need 6+ runs)' };
  }

  const midpoint = Math.floor(history.length / 2);
  const firstHalf = history.slice(0, midpoint);
  const secondHalf = history.slice(midpoint);

  // Success rate trend
  const firstSuccessRate = firstHalf.filter(e => e.status === 'success').length / firstHalf.length * 100;
  const secondSuccessRate = secondHalf.filter(e => e.status === 'success').length / secondHalf.length * 100;
  const successRateChange = secondSuccessRate - firstSuccessRate;

  let successTrend = 'stable';
  if (successRateChange > 10) successTrend = 'improving';
  else if (successRateChange < -10) successTrend = 'degrading';

  // Duration trend
  const firstDurations = firstHalf.filter(e => e.totalDurationMs).map(e => e.totalDurationMs);
  const secondDurations = secondHalf.filter(e => e.totalDurationMs).map(e => e.totalDurationMs);

  const firstAvgDuration = calculateMean(firstDurations);
  const secondAvgDuration = calculateMean(secondDurations);
  const durationChange = firstAvgDuration > 0
    ? ((secondAvgDuration - firstAvgDuration) / firstAvgDuration) * 100
    : 0;

  let durationTrend = 'stable';
  if (durationChange < -10) durationTrend = 'improving';
  else if (durationChange > 10) durationTrend = 'degrading';

  let recommendation = null;
  if (successTrend === 'degrading') {
    recommendation = 'Pipeline success rate is declining. Review recent changes for regressions';
  } else if (durationTrend === 'degrading') {
    recommendation = 'Pipeline duration is increasing. Consider performance optimization';
  }

  return {
    successRate: {
      trend: successTrend,
      change: Math.round(successRateChange * 10) / 10,
      first: Math.round(firstSuccessRate * 10) / 10,
      second: Math.round(secondSuccessRate * 10) / 10
    },
    duration: {
      trend: durationTrend,
      change: Math.round(durationChange * 10) / 10,
      first: Math.round(firstAvgDuration),
      second: Math.round(secondAvgDuration)
    },
    recommendation
  };
}

function formatTextOutput(analysis, sections, useColor = false) {
  const lines = ['\n' + colorize('Pipeline Insights', 'cyan', useColor) + '\n'];

  const showAll = sections.length === 0;
  const showBottlenecks = showAll || sections.includes('bottlenecks');
  const showFailures = showAll || sections.includes('failures');
  const showAnomalies = showAll || sections.includes('anomalies');
  const showTrends = showAll || sections.includes('trends');

  if (showBottlenecks) {
    lines.push(colorize('BOTTLENECK ANALYSIS', 'cyan', useColor));
    if (analysis.bottlenecks.insufficientData) {
      lines.push(`  ${analysis.bottlenecks.message}`);
    } else {
      lines.push(`  Slowest stage: ${analysis.bottlenecks.bottleneckStage} (${analysis.bottlenecks.percentage}% of pipeline)`);
      lines.push(`  Average duration: ${formatDuration(analysis.bottlenecks.avgDurationMs)}`);
      if (analysis.bottlenecks.isBottleneck) {
        lines.push('  Status: ' + colorize('BOTTLENECK DETECTED', 'yellow', useColor));
      }
      if (analysis.bottlenecks.recommendation) {
        lines.push(`  Recommendation: ${colorize(analysis.bottlenecks.recommendation, 'yellow', useColor)}`);
      }
    }
    lines.push('');
  }

  if (showFailures) {
    lines.push(colorize('FAILURE PATTERNS', 'cyan', useColor));
    if (analysis.failures.noFailures) {
      lines.push(`  ${analysis.failures.message}`);
    } else {
      lines.push(`  Most common failure stage: ${analysis.failures.mostCommonStage} (${analysis.failures.failureCount} failures)`);
      lines.push(`  Overall failure rate: ${analysis.failures.failureRate}%`);
      if (analysis.failures.repeatedFeatures.length > 0) {
        lines.push('  Features with repeated failures:');
        for (const f of analysis.failures.repeatedFeatures) {
          lines.push(`    - ${f.slug} (${f.count} failures)`);
        }
      }
      if (analysis.failures.recommendation) {
        lines.push(`  Recommendation: ${colorize(analysis.failures.recommendation, 'yellow', useColor)}`);
      }
    }
    lines.push('');
  }

  if (showAnomalies) {
    lines.push(colorize('ANOMALY DETECTION', 'cyan', useColor));
    if (analysis.anomalies.insufficientData) {
      lines.push(`  ${analysis.anomalies.message}`);
    } else if (analysis.anomalies.noAnomalies) {
      lines.push(`  ${analysis.anomalies.message}`);
    } else {
      lines.push('  Anomalous runs detected:');
      for (const a of analysis.anomalies.anomalies) {
        lines.push(`    - ${a.slug}/${a.stage}: ${formatDuration(a.actual)} (expected ~${formatDuration(a.expected)}, ${a.deviation}x stddev)`);
      }
      if (analysis.anomalies.recommendation) {
        lines.push(`  Recommendation: ${colorize(analysis.anomalies.recommendation, 'yellow', useColor)}`);
      }
    }
    lines.push('');
  }

  if (showTrends) {
    lines.push(colorize('TREND ANALYSIS', 'cyan', useColor));
    if (analysis.trends.insufficientData) {
      lines.push(`  ${analysis.trends.message}`);
    } else {
      const sr = analysis.trends.successRate;
      const dr = analysis.trends.duration;
      lines.push(`  Success rate: ${sr.trend} (${sr.change > 0 ? '+' : ''}${sr.change}%)`);
      lines.push(`  Duration: ${dr.trend} (${dr.change > 0 ? '+' : ''}${dr.change}%)`);
      if (analysis.trends.recommendation) {
        lines.push(`  Recommendation: ${colorize(analysis.trends.recommendation, 'yellow', useColor)}`);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

function formatJsonOutput(analysis, sections) {
  const showAll = sections.length === 0;
  const output = {};

  if (showAll || sections.includes('bottlenecks')) {
    output.bottlenecks = analysis.bottlenecks;
  }
  if (showAll || sections.includes('failures')) {
    output.failures = analysis.failures;
  }
  if (showAll || sections.includes('anomalies')) {
    output.anomalies = analysis.anomalies;
  }
  if (showAll || sections.includes('trends')) {
    output.trends = analysis.trends;
  }

  return JSON.stringify(output, null, 2);
}

function displayInsights(options = {}) {
  const history = readHistoryFile();
  const useColor = options.color !== false && process.stdout.isTTY;

  if (history.error === 'corrupted') {
    console.log("Warning: History file is corrupted. Run 'murmur8 history clear' to reset.");
    return;
  }

  if (!history || history.length === 0) {
    console.log('No pipeline history found.');
    return;
  }

  const analysis = {
    bottlenecks: analyzeBottlenecks(history),
    failures: analyzeFailures(history),
    anomalies: detectAnomalies(history),
    trends: analyzeTrends(history)
  };

  const sections = [];
  if (options.bottlenecks) sections.push('bottlenecks');
  if (options.failures) sections.push('failures');

  if (options.json) {
    console.log(formatJsonOutput(analysis, sections));
  } else {
    console.log(formatTextOutput(analysis, sections, useColor));
  }
}

/**
 * Calculates agent calibration score based on prediction accuracy.
 * Per FEATURE_SPEC.md:Rule 4.
 * @param {string} agent - Agent name (alex, cass, nigel)
 * @param {Array} history - History entries
 * @returns {number|null} Calibration score 0-1, or null if insufficient data
 */
function calculateCalibration(agent, history) {
  const entries = history.filter(e => e.stages?.[agent]?.feedback);
  if (entries.length < 10) return null;

  let matches = 0;
  for (const entry of entries) {
    const rating = entry.stages[agent].feedback.rating;
    const success = entry.status === 'success';
    const predicted = rating >= 3;
    if (predicted === success) matches++;
  }
  return matches / entries.length;
}

/**
 * Correlates issue codes with failure rates.
 * @param {Array} history - History entries
 * @returns {object} Map of issue code to failure correlation (0-1)
 */
function correlateIssues(history) {
  const issueCounts = {};
  const issueFailures = {};

  for (const entry of history) {
    for (const stage of Object.values(entry.stages || {})) {
      if (stage.feedback?.issues) {
        for (const issue of stage.feedback.issues) {
          issueCounts[issue] = (issueCounts[issue] || 0) + 1;
          if (entry.status === 'failed') {
            issueFailures[issue] = (issueFailures[issue] || 0) + 1;
          }
        }
      }
    }
  }

  const correlations = {};
  for (const issue of Object.keys(issueCounts)) {
    correlations[issue] = (issueFailures[issue] || 0) / issueCounts[issue];
  }
  return correlations;
}

/**
 * Recommends optimal threshold based on historical data.
 * @param {Array} history - History entries
 * @returns {number} Recommended threshold value
 */
function recommendThreshold(history) {
  let best = 3.0;
  for (const t of [2, 2.5, 3, 3.5, 4]) {
    const correct = history.filter(e => {
      const r = e.stages?.cass?.feedback?.rating || 3;
      const pred = r >= t;
      return pred === (e.status === 'success');
    }).length;
    if (correct > history.length * 0.7) best = t;
  }
  return best;
}

/**
 * Displays feedback-specific insights.
 * @param {object} options - Display options
 */
function displayFeedbackInsights(options = {}) {
  const history = readHistoryFile();
  const useColor = options.color !== false && process.stdout.isTTY;

  if (history.error === 'corrupted') {
    console.log("Warning: History file is corrupted.");
    return;
  }

  if (!history || history.length === 0) {
    console.log('No pipeline history found.');
    return;
  }

  console.log('\n' + colorize('Feedback Insights', 'cyan', useColor) + '\n');

  // Agent calibration
  console.log(colorize('AGENT CALIBRATION', 'cyan', useColor));
  for (const agent of ['alex', 'cass', 'nigel']) {
    const calibration = calculateCalibration(agent, history);
    if (calibration === null) {
      console.log(`  ${agent.padEnd(8)}: Insufficient data (<10 runs)`);
    } else {
      const pct = Math.round(calibration * 100);
      console.log(`  ${agent.padEnd(8)}: ${pct}% accuracy`);
    }
  }
  console.log('');

  // Issue correlations
  const correlations = correlateIssues(history);
  if (Object.keys(correlations).length > 0) {
    console.log(colorize('ISSUE CORRELATIONS', 'cyan', useColor));
    const sorted = Object.entries(correlations)
      .sort(([, a], [, b]) => b - a);
    for (const [issue, corr] of sorted) {
      const pct = Math.round(corr * 100);
      console.log(`  ${issue.padEnd(24)}: ${pct}% failure rate`);
    }
    console.log('');
  }

  // Threshold recommendation
  const entriesWithFeedback = history.filter(e =>
    Object.values(e.stages || {}).some(s => s.feedback)
  );
  if (entriesWithFeedback.length >= 10) {
    const recommended = recommendThreshold(history);
    console.log(colorize('RECOMMENDATIONS', 'cyan', useColor));
    console.log(`  Suggested minRatingThreshold: ${recommended}`);
    console.log('');
  }
}

module.exports = {
  displayInsights,
  analyzeBottlenecks,
  analyzeFailures,
  detectAnomalies,
  analyzeTrends,
  calculateMean,
  calculateStdDev,
  // Feedback analysis exports
  calculateCalibration,
  correlateIssues,
  recommendThreshold,
  displayFeedbackInsights
};
