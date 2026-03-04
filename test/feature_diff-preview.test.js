const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');

// Module under test (to be implemented)
const diffPreviewPath = path.join(__dirname, '..', 'src', 'diff-preview.js');

describe('Feature: Diff Preview', () => {
  let diffPreview;

  beforeEach(() => {
    if (fs.existsSync(diffPreviewPath)) {
      diffPreview = require(diffPreviewPath);
    }
  });

  describe('parseGitStatus - change detection', () => {
    it('T-DC-1.1: parses Added files (A and ??)', () => {
      if (!diffPreview) return;
      const porcelainOutput = 'A  src/new-file.js\n?? src/untracked.js';
      const result = diffPreview.parseGitStatus(porcelainOutput);
      assert.strictEqual(result.added.length, 2);
      assert.ok(result.added.includes('src/new-file.js'));
      assert.ok(result.added.includes('src/untracked.js'));
    });

    it('T-DC-1.2: parses Modified files (M)', () => {
      if (!diffPreview) return;
      const porcelainOutput = 'M  src/existing.js\n M src/also-modified.js';
      const result = diffPreview.parseGitStatus(porcelainOutput);
      assert.strictEqual(result.modified.length, 2);
      assert.ok(result.modified.includes('src/existing.js'));
      assert.ok(result.modified.includes('src/also-modified.js'));
    });

    it('T-DC-1.3: parses Deleted files (D)', () => {
      if (!diffPreview) return;
      const porcelainOutput = 'D  src/removed.js\n D src/also-deleted.js';
      const result = diffPreview.parseGitStatus(porcelainOutput);
      assert.strictEqual(result.deleted.length, 2);
      assert.ok(result.deleted.includes('src/removed.js'));
      assert.ok(result.deleted.includes('src/also-deleted.js'));
    });

    it('T-DC-1.4: handles empty git status output', () => {
      if (!diffPreview) return;
      const porcelainOutput = '';
      const result = diffPreview.parseGitStatus(porcelainOutput);
      assert.strictEqual(result.added.length, 0);
      assert.strictEqual(result.modified.length, 0);
      assert.strictEqual(result.deleted.length, 0);
      assert.strictEqual(result.total, 0);
    });

    it('T-DC-1.5: handles mixed changes', () => {
      if (!diffPreview) return;
      const porcelainOutput = [
        'A  src/new.js',
        'M  src/changed.js',
        'D  src/gone.js',
        '?? docs/readme.md'
      ].join('\n');
      const result = diffPreview.parseGitStatus(porcelainOutput);
      assert.strictEqual(result.added.length, 2);
      assert.strictEqual(result.modified.length, 1);
      assert.strictEqual(result.deleted.length, 1);
      assert.strictEqual(result.total, 4);
    });
  });

  describe('formatDiffSummary - display', () => {
    it('T-DS-1.1: shows file counts per category', () => {
      if (!diffPreview) return;
      const changes = {
        added: ['a.js', 'b.js'],
        modified: ['c.js'],
        deleted: [],
        total: 3
      };
      const output = diffPreview.formatDiffSummary(changes, 'test-feature');
      assert.ok(output.includes('Added (2 files)'));
      assert.ok(output.includes('Modified (1 file)'));
      assert.ok(output.includes('Deleted (0 files)'));
      assert.ok(output.includes('Total: 3 files changed'));
    });

    it('T-DS-1.2: shows file paths with indicators', () => {
      if (!diffPreview) return;
      const changes = {
        added: ['src/new.js'],
        modified: ['src/changed.js'],
        deleted: ['src/removed.js'],
        total: 3
      };
      const output = diffPreview.formatDiffSummary(changes, 'test-feature');
      assert.ok(output.includes('+ src/new.js'));
      assert.ok(output.includes('~ src/changed.js'));
    });

    it('T-DS-1.3: truncates at 20 files with overflow message', () => {
      if (!diffPreview) return;
      const manyFiles = Array.from({ length: 25 }, (_, i) => `file-${i}.js`);
      const changes = {
        added: manyFiles,
        modified: [],
        deleted: [],
        total: 25
      };
      const output = diffPreview.formatDiffSummary(changes, 'test-feature');
      assert.ok(output.includes('... and 5 more'));
    });

    it('T-DS-1.4: shows "(none)" for empty categories', () => {
      if (!diffPreview) return;
      const changes = {
        added: ['a.js'],
        modified: [],
        deleted: [],
        total: 1
      };
      const output = diffPreview.formatDiffSummary(changes, 'test-feature');
      assert.ok(output.includes('(none)'));
    });
  });

  describe('shouldSkipPreview - skip conditions', () => {
    it('T-SK-1.1: returns true when --no-commit flag set', () => {
      if (!diffPreview) return;
      const result = diffPreview.shouldSkipPreview({
        noCommit: true,
        noDiffPreview: false,
        yes: false,
        hasChanges: true
      });
      assert.strictEqual(result, true);
    });

    it('T-SK-1.2: returns true when --no-diff-preview flag set', () => {
      if (!diffPreview) return;
      const result = diffPreview.shouldSkipPreview({
        noCommit: false,
        noDiffPreview: true,
        yes: false,
        hasChanges: true
      });
      assert.strictEqual(result, true);
    });

    it('T-SK-1.3: returns true when --yes flag set', () => {
      if (!diffPreview) return;
      const result = diffPreview.shouldSkipPreview({
        noCommit: false,
        noDiffPreview: false,
        yes: true,
        hasChanges: true
      });
      assert.strictEqual(result, true);
    });

    it('T-SK-1.4: returns true when no changes detected', () => {
      if (!diffPreview) return;
      const result = diffPreview.shouldSkipPreview({
        noCommit: false,
        noDiffPreview: false,
        yes: false,
        hasChanges: false
      });
      assert.strictEqual(result, true);
    });

    it('T-SK-1.5: returns false when preview should be shown', () => {
      if (!diffPreview) return;
      const result = diffPreview.shouldSkipPreview({
        noCommit: false,
        noDiffPreview: false,
        yes: false,
        hasChanges: true
      });
      assert.strictEqual(result, false);
    });
  });

  describe('parseUserChoice - prompt input', () => {
    it('T-UC-1.1: returns commit for c input', () => {
      if (!diffPreview) return;
      assert.strictEqual(diffPreview.parseUserChoice('c'), 'commit');
      assert.strictEqual(diffPreview.parseUserChoice('C'), 'commit');
    });

    it('T-UC-1.2: returns abort for a input', () => {
      if (!diffPreview) return;
      assert.strictEqual(diffPreview.parseUserChoice('a'), 'abort');
      assert.strictEqual(diffPreview.parseUserChoice('A'), 'abort');
    });

    it('T-UC-1.3: returns diff for d input', () => {
      if (!diffPreview) return;
      assert.strictEqual(diffPreview.parseUserChoice('d'), 'diff');
      assert.strictEqual(diffPreview.parseUserChoice('D'), 'diff');
    });

    it('T-UC-1.4: returns null for invalid input', () => {
      if (!diffPreview) return;
      assert.strictEqual(diffPreview.parseUserChoice('x'), null);
      assert.strictEqual(diffPreview.parseUserChoice(''), null);
      assert.strictEqual(diffPreview.parseUserChoice('commit'), null);
    });
  });

  describe('createAbortResult - abort handling', () => {
    it('T-AH-1.1: returns exitCode 0 for user abort', () => {
      if (!diffPreview) return;
      const result = diffPreview.createAbortResult('test-feature');
      assert.strictEqual(result.exitCode, 0);
    });

    it('T-AH-1.2: includes user-aborted reason', () => {
      if (!diffPreview) return;
      const result = diffPreview.createAbortResult('test-feature');
      assert.strictEqual(result.reason, 'user-aborted');
      assert.strictEqual(result.slug, 'test-feature');
    });
  });

  describe('truncateDiff - large diff handling', () => {
    it('T-TR-1.1: limits output to threshold lines', () => {
      if (!diffPreview) return;
      const longDiff = Array.from({ length: 150 }, (_, i) => `line ${i}`).join('\n');
      const result = diffPreview.truncateDiff(longDiff, 100);
      const lines = result.split('\n');
      assert.ok(lines.length <= 102); // 100 lines + truncation message
    });

    it('T-TR-1.2: adds continuation message when truncated', () => {
      if (!diffPreview) return;
      const longDiff = Array.from({ length: 150 }, (_, i) => `line ${i}`).join('\n');
      const result = diffPreview.truncateDiff(longDiff, 100);
      assert.ok(result.includes('... 50 more lines'));
    });

    it('T-TR-1.3: returns unchanged when under threshold', () => {
      if (!diffPreview) return;
      const shortDiff = 'line 1\nline 2\nline 3';
      const result = diffPreview.truncateDiff(shortDiff, 100);
      assert.strictEqual(result, shortDiff);
    });
  });

  describe('getPreviewState - state transition', () => {
    it('T-ST-1.1: returns awaiting-commit-review state', () => {
      if (!diffPreview) return;
      const state = diffPreview.getPreviewState();
      assert.strictEqual(state, 'awaiting-commit-review');
    });
  });

  describe('markWorktreeAborted - murmuration mode', () => {
    it('T-MU-1.1: sets user-aborted status distinct from failed', () => {
      if (!diffPreview) return;
      const worktree = { slug: 'test', status: 'murm_running' };
      const result = diffPreview.markWorktreeAborted(worktree);
      assert.strictEqual(result.status, 'user-aborted');
      assert.notStrictEqual(result.status, 'murm_failed');
    });

    it('T-MU-1.2: preserves slug and other properties', () => {
      if (!diffPreview) return;
      const worktree = { slug: 'test', worktreePath: '/path/to/worktree' };
      const result = diffPreview.markWorktreeAborted(worktree);
      assert.strictEqual(result.slug, 'test');
      assert.strictEqual(result.worktreePath, '/path/to/worktree');
    });
  });

  describe('getPromptText - user interface', () => {
    it('T-PT-1.1: includes all three options', () => {
      if (!diffPreview) return;
      const prompt = diffPreview.getPromptText();
      assert.ok(prompt.includes('[c]ommit'));
      assert.ok(prompt.includes('[a]bort'));
      assert.ok(prompt.includes('[d]iff'));
    });
  });

  describe('hasChanges - empty detection', () => {
    it('T-HC-1.1: returns false for empty parsed status', () => {
      if (!diffPreview) return;
      const changes = { added: [], modified: [], deleted: [], total: 0 };
      assert.strictEqual(diffPreview.hasChanges(changes), false);
    });

    it('T-HC-1.2: returns true when any category has files', () => {
      if (!diffPreview) return;
      const changes = { added: ['file.js'], modified: [], deleted: [], total: 1 };
      assert.strictEqual(diffPreview.hasChanges(changes), true);
    });
  });

  describe('formatFeatureHeader - display', () => {
    it('T-FH-1.1: includes feature slug in header', () => {
      if (!diffPreview) return;
      const header = diffPreview.formatFeatureHeader('user-auth');
      assert.ok(header.includes('user-auth'));
      assert.ok(header.includes('Changes to commit'));
    });
  });
});
