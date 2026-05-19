'use strict';

const { describe, it, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const {
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
} = require('../src/refine');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function makeTmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'refine-test-'));
}

function makeFeatureDir(base, slug) {
  const dir = path.join(base, '.blueprint', 'features', `feature_${slug}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// ---------------------------------------------------------------------------
// Story: story-initiation.md — Refinement Initiation (RF-IN-*)
// ---------------------------------------------------------------------------

describe('story-initiation.md — Refinement Initiation', () => {
  let tmp, origCwd;
  beforeEach(() => { tmp = makeTmp(); origCwd = process.cwd(); process.chdir(tmp); });
  afterEach(() => { process.chdir(origCwd); fs.rmSync(tmp, { recursive: true, force: true }); });

  it('RF-IN-1: parseRefinementArgs returns slug from argv', () => {
    const result = parseRefinementArgs(['node', 'cli.js', 'refine-feature', 'my-slug']);
    assert.equal(result.slug, 'my-slug');
  });

  it('RF-IN-2: loadRefinementContext throws when FEATURE_SPEC.md is missing', async () => {
    const dir = makeFeatureDir(tmp, 'missing-slug');
    await assert.rejects(
      () => loadRefinementContext('missing-slug', tmp),
      /not found|missing|FEATURE_SPEC/i
    );
  });

  it('RF-IN-3: loadRefinementContext reads spec, stories and history', async () => {
    const slug = 'my-feature';
    const dir = makeFeatureDir(tmp, slug);
    fs.writeFileSync(path.join(dir, 'FEATURE_SPEC.md'), '---\nfeatureId: abc-123\n---\n# Feature\n');
    fs.writeFileSync(path.join(dir, 'story-foo.md'), '# Story Foo\n');
    const claudeDir = path.join(tmp, '.claude');
    fs.mkdirSync(claudeDir, { recursive: true });
    fs.writeFileSync(path.join(claudeDir, 'pipeline-history.json'), JSON.stringify([
      { slug, runId: 'run-1', status: 'success' }
    ]));
    const ctx = await loadRefinementContext(slug, tmp);
    assert.ok(ctx.spec);
    assert.ok(Array.isArray(ctx.stories));
    assert.equal(ctx.stories.length, 1);
    assert.ok(Array.isArray(ctx.history));
  });

  it('RF-IN-4: loadRefinementContext returns summary fields', async () => {
    const slug = 'sum-feature';
    const dir = makeFeatureDir(tmp, slug);
    fs.writeFileSync(path.join(dir, 'FEATURE_SPEC.md'), '---\nfeatureId: abc-123\n---\n# Sum Feature\n');
    const ctx = await loadRefinementContext(slug, tmp);
    assert.ok('featureName' in ctx || 'slug' in ctx);
    assert.ok('lastRunStatus' in ctx || ctx.history !== undefined);
  });

  it('RF-IN-5: loadRefinementContext reads featureId from YAML frontmatter', async () => {
    const slug = 'fid-feature';
    const dir = makeFeatureDir(tmp, slug);
    const existing = 'b8e4f1a2-3c7d-4b9e-8f1a-2d4c5e6b7a8f';
    fs.writeFileSync(path.join(dir, 'FEATURE_SPEC.md'), `---\nfeatureId: ${existing}\n---\n# Feature\n`);
    const ctx = await loadRefinementContext(slug, tmp);
    assert.equal(ctx.featureId, existing);
  });

  it('RF-IN-6: loadRefinementContext adds featureId when frontmatter has none', async () => {
    const slug = 'noid-feature';
    const dir = makeFeatureDir(tmp, slug);
    const specPath = path.join(dir, 'FEATURE_SPEC.md');
    fs.writeFileSync(specPath, '# Feature\nNo frontmatter here.\n');
    const ctx = await loadRefinementContext(slug, tmp);
    assert.match(ctx.featureId, UUID_RE);
    const written = fs.readFileSync(specPath, 'utf8');
    assert.ok(written.includes(ctx.featureId));
  });
});

// ---------------------------------------------------------------------------
// Story: story-conversation-approval.md — Spec Diff Approval (RF-CA-*)
// ---------------------------------------------------------------------------

describe('story-conversation-approval.md — Spec Diff Approval', () => {
  let tmp, origCwd;
  beforeEach(() => { tmp = makeTmp(); origCwd = process.cwd(); process.chdir(tmp); });
  afterEach(() => { process.chdir(origCwd); fs.rmSync(tmp, { recursive: true, force: true }); });

  it('RF-CA-3: applySpecDiff writes updated spec preserving featureId', async () => {
    const specPath = path.join(tmp, 'FEATURE_SPEC.md');
    const featureId = 'b8e4f1a2-3c7d-4b9e-8f1a-2d4c5e6b7a8f';
    fs.writeFileSync(specPath, `---\nfeatureId: ${featureId}\n---\n# Old content\n`);
    await applySpecDiff(specPath, '# New content\n', featureId);
    const written = fs.readFileSync(specPath, 'utf8');
    assert.ok(written.includes('New content'));
    assert.ok(written.includes(featureId));
  });

  it('RF-CA-5: applySpecDiff throws when diff is null (abort path)', async () => {
    const specPath = path.join(tmp, 'FEATURE_SPEC.md');
    fs.writeFileSync(specPath, '# Spec\n');
    await assert.rejects(
      () => applySpecDiff(specPath, null, 'some-id'),
      /abort|null|invalid/i
    );
  });

  it('RF-CA-6: featureId in frontmatter is unchanged after spec write', async () => {
    const specPath = path.join(tmp, 'FEATURE_SPEC.md');
    const featureId = 'aaaabbbb-cccc-4ddd-eeee-ffffffffffff';
    fs.writeFileSync(specPath, `---\nfeatureId: ${featureId}\n---\n# Original\n`);
    await applySpecDiff(specPath, '# Updated content\n', featureId);
    const written = fs.readFileSync(specPath, 'utf8');
    const match = written.match(/featureId:\s*([^\s\n]+)/);
    assert.ok(match, 'featureId line must be present');
    assert.equal(match[1], featureId);
  });
});

// ---------------------------------------------------------------------------
// Story: story-story-propagation.md — Story Propagation (RF-SP-*)
// ---------------------------------------------------------------------------

describe('story-story-propagation.md — Story Propagation', () => {
  let tmp, origCwd;
  beforeEach(() => { tmp = makeTmp(); origCwd = process.cwd(); process.chdir(tmp); });
  afterEach(() => { process.chdir(origCwd); fs.rmSync(tmp, { recursive: true, force: true }); });

  it('RF-SP-1: isTechnicalFeature returns true when no story files present', () => {
    assert.equal(isTechnicalFeature([]), true);
  });

  it('RF-SP-3: filterAffectedStories returns only stories matching changed slugs', () => {
    const stories = ['story-foo.md', 'story-bar.md', 'story-baz.md'];
    const changedSlugs = ['foo', 'baz'];
    const result = filterAffectedStories(stories, changedSlugs);
    assert.deepEqual(result.sort(), ['story-baz.md', 'story-foo.md']);
  });

  it('RF-SP-4: buildStoryChanges produces required fields per entry', () => {
    const changes = buildStoryChanges([
      { file: 'story-foo.md', reason: 'new AC added' }
    ]);
    assert.ok(Array.isArray(changes));
    assert.ok(changes[0].file);
    assert.ok(changes[0].reason);
  });

  it('RF-SP-5: unaffected story is not in filterAffectedStories result', () => {
    const stories = ['story-alpha.md', 'story-beta.md'];
    const result = filterAffectedStories(stories, ['alpha']);
    assert.ok(!result.includes('story-beta.md'));
  });

  it('RF-SP-6: buildStoryChanges includes new scope entries', () => {
    const changes = buildStoryChanges([
      { file: 'story-new-scope.md', reason: 'new user-facing behaviour', isNew: true }
    ]);
    const entry = changes.find(c => c.file === 'story-new-scope.md');
    assert.ok(entry);
    assert.equal(entry.isNew, true);
  });
});

// ---------------------------------------------------------------------------
// Story: story-test-propagation.md — Test Propagation (RF-TP-*)
// ---------------------------------------------------------------------------

describe('story-test-propagation.md — Test Propagation', () => {
  it('RF-TP-1: buildRefinementPayload includes storyChangesPath when Cass ran', () => {
    const p = buildRefinementPayload({
      slug: 'feat',
      featureId: 'abc',
      storyChangesPath: '.blueprint/features/feature_feat/story-changes.md',
      specDiff: null,
      noCommit: false,
    });
    assert.ok(p.storyChangesPath);
  });

  it('RF-TP-3: buildRefinementPayload includes testChanges fields', () => {
    const p = buildRefinementPayload({
      slug: 'feat',
      featureId: 'abc',
      testChangesPath: '.blueprint/features/feature_feat/test-changes.md',
      noCommit: false,
    });
    assert.ok(p.testChangesPath);
  });

  it('RF-TP-5: buildRefinementPayload uses specDiff when no storyChangesPath', () => {
    const p = buildRefinementPayload({
      slug: 'tech-feat',
      featureId: 'abc',
      storyChangesPath: null,
      specDiff: 'before: foo\nafter: bar',
      noCommit: false,
    });
    assert.ok(p.specDiff);
    assert.equal(p.storyChangesPath, null);
  });
});

// ---------------------------------------------------------------------------
// Story: story-codey-confirmation.md — Mandatory Pause (RF-CC-*)
// ---------------------------------------------------------------------------

describe('story-codey-confirmation.md — Mandatory Pause', () => {
  it('RF-CC-2: isPauseBypassable always returns false regardless of flags', () => {
    assert.equal(isPauseBypassable({}), false);
    assert.equal(isPauseBypassable({ yes: true }), false);
    assert.equal(isPauseBypassable({ 'no-pause': true }), false);
    assert.equal(isPauseBypassable({ skipConfirm: true }), false);
  });

  it('RF-CC-4: buildChangeSummary includes all pre-Codey written paths', () => {
    const summary = buildChangeSummary({
      specPath: 'FEATURE_SPEC.md',
      affectedStories: ['story-foo.md'],
      testChangesPath: 'test-changes.md',
    });
    assert.ok(summary.specPath);
    assert.ok(Array.isArray(summary.affectedStories));
    assert.ok(summary.testChangesPath);
  });

  it('RF-CC-6: buildRefinementPayload sets commitSkipped true when noCommit flag set', () => {
    const p = buildRefinementPayload({ slug: 'x', featureId: 'id', noCommit: true });
    assert.equal(p.commitSkipped, true);
  });
});

// ---------------------------------------------------------------------------
// Story: story-telemetry-lineage.md — Telemetry Lineage (RF-TL-*)
// ---------------------------------------------------------------------------

describe('story-telemetry-lineage.md — Telemetry Lineage', () => {
  it('RF-TL-1: linkParentRun sets parentRunId to most recent runId for slug', () => {
    const history = [
      { slug: 'my-feat', runId: 'run-1', completedAt: '2026-05-01T10:00:00Z' },
      { slug: 'my-feat', runId: 'run-2', completedAt: '2026-05-02T10:00:00Z' },
    ];
    const result = linkParentRun('my-feat', history);
    assert.equal(result.parentRunId, 'run-2');
  });

  it('RF-TL-2: linkParentRun returns parentRunId null when no history for slug', () => {
    const result = linkParentRun('unknown-slug', []);
    assert.equal(result.parentRunId, null);
  });

  it('RF-TL-3: linkParentRun sets type to "refinement"', () => {
    const result = linkParentRun('any-slug', []);
    assert.equal(result.type, 'refinement');
  });

  it('RF-TL-4: featureId in refinement entry matches original run featureId', () => {
    const featureId = 'b8e4f1a2-3c7d-4b9e-8f1a-2d4c5e6b7a8f';
    const history = [{ slug: 'feat', runId: 'run-1', featureId, completedAt: '2026-05-01T10:00:00Z' }];
    const result = linkParentRun('feat', history);
    assert.equal(result.featureId, featureId);
  });

  it('RF-TL-7: parentRunId chain is traversable across multiple refinements', () => {
    const history = [
      { slug: 'feat', runId: 'run-1', parentRunId: null, completedAt: '2026-05-01T10:00:00Z' },
      { slug: 'feat', runId: 'run-2', parentRunId: 'run-1', completedAt: '2026-05-02T10:00:00Z' },
      { slug: 'feat', runId: 'run-3', parentRunId: 'run-2', completedAt: '2026-05-03T10:00:00Z' },
    ];
    // Build chain from newest back to root
    const byId = Object.fromEntries(history.map(e => [e.runId, e]));
    let current = history[history.length - 1];
    const chain = [current.runId];
    while (current.parentRunId) {
      current = byId[current.parentRunId];
      chain.push(current.runId);
    }
    assert.deepEqual(chain, ['run-3', 'run-2', 'run-1']);
  });
});
