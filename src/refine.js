'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function parseRefinementArgs(argv) {
  const slug = argv[3] || null;
  return { slug };
}

function _extractFeatureId(content) {
  const match = content.match(/^---[\s\S]*?featureId:\s*([^\s\n]+)[\s\S]*?---/m);
  return match ? match[1] : null;
}

function _writeFeatureId(specPath, content, featureId) {
  let updated;
  if (content.startsWith('---')) {
    const endIdx = content.indexOf('---', 3);
    if (endIdx !== -1) {
      const frontmatter = content.slice(3, endIdx);
      if (frontmatter.includes('featureId:')) {
        updated = content.replace(/featureId:\s*[^\s\n]+/, `featureId: ${featureId}`);
      } else {
        updated = `---${frontmatter}featureId: ${featureId}\n${content.slice(endIdx)}`;
      }
    } else {
      updated = `---\nfeatureId: ${featureId}\n---\n${content}`;
    }
  } else {
    updated = `---\nfeatureId: ${featureId}\n---\n${content}`;
  }
  fs.writeFileSync(specPath, updated, 'utf8');
  return updated;
}

async function loadRefinementContext(slug, baseDir) {
  const base = baseDir || process.cwd();
  const featDir = path.join(base, '.blueprint', 'features', `feature_${slug}`);
  const specPath = path.join(featDir, 'FEATURE_SPEC.md');

  if (!fs.existsSync(specPath)) {
    throw new Error(`FEATURE_SPEC.md not found for slug "${slug}" — run /implement-feature first`);
  }

  let specContent = fs.readFileSync(specPath, 'utf8');
  let featureId = _extractFeatureId(specContent);
  if (!featureId) {
    featureId = crypto.randomUUID();
    specContent = _writeFeatureId(specPath, specContent, featureId);
  }

  const storyFiles = fs.existsSync(featDir)
    ? fs.readdirSync(featDir).filter(f => f.startsWith('story-') && f.endsWith('.md'))
    : [];

  const stories = storyFiles.map(f => ({
    file: f,
    content: fs.readFileSync(path.join(featDir, f), 'utf8'),
  }));

  const historyPath = path.join(base, '.claude', 'pipeline-history.json');
  let history = [];
  if (fs.existsSync(historyPath)) {
    try {
      history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
    } catch (_) {
      history = [];
    }
  }

  const lastRun = history.filter(e => e.slug === slug).sort((a, b) =>
    (b.completedAt || '').localeCompare(a.completedAt || '')
  )[0];

  return {
    slug,
    featureId,
    spec: specContent,
    stories,
    history: history.filter(e => e.slug === slug),
    lastRunStatus: lastRun ? lastRun.status : null,
    featureName: slug,
  };
}

async function applySpecDiff(specPath, newContent, featureId) {
  if (newContent === null || newContent === undefined) {
    throw new Error('abort: null diff provided — no changes applied');
  }
  _writeFeatureId(specPath, newContent, featureId);
}

function buildRefinementPayload(opts) {
  const {
    slug,
    featureId,
    storyChangesPath = null,
    testChangesPath = null,
    specDiff = null,
    noCommit = false,
  } = opts || {};

  return {
    slug,
    featureId,
    storyChangesPath: storyChangesPath || null,
    testChangesPath: testChangesPath || null,
    specDiff: specDiff || null,
    commitSkipped: Boolean(noCommit),
  };
}

function linkParentRun(slug, history) {
  const slugRuns = (history || [])
    .filter(e => e.slug === slug)
    .sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''));

  const latest = slugRuns[0] || null;

  return {
    parentRunId: latest ? latest.runId : null,
    type: 'refinement',
    featureId: latest ? latest.featureId : null,
  };
}

function isTechnicalFeature(stories) {
  return stories.length === 0;
}

function filterAffectedStories(stories, changedSlugs) {
  return stories.filter(f => {
    const name = path.basename(f, '.md').replace(/^story-/, '');
    return changedSlugs.some(s => name === s || f.includes(s));
  });
}

function buildStoryChanges(entries) {
  return (entries || []).map(e => ({
    file: e.file,
    reason: e.reason,
    isNew: Boolean(e.isNew),
  }));
}

function buildChangeSummary(opts) {
  const { specPath, affectedStories, testChangesPath } = opts || {};
  return {
    specPath: specPath || null,
    affectedStories: Array.isArray(affectedStories) ? affectedStories : [],
    testChangesPath: testChangesPath || null,
  };
}

function isPauseBypassable(_flags) {
  return false;
}

module.exports = {
  parseRefinementArgs,
  loadRefinementContext,
  applySpecDiff,
  buildRefinementPayload,
  linkParentRun,
  isTechnicalFeature,
  filterAffectedStories,
  buildStoryChanges,
  buildChangeSummary,
  isPauseBypassable,
};
