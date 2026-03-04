'use strict';

function parseGitStatus(porcelainOutput) {
  const added = [];
  const modified = [];
  const deleted = [];

  if (!porcelainOutput || porcelainOutput.trim() === '') {
    return { added, modified, deleted, total: 0 };
  }

  const lines = porcelainOutput.trim().split('\n');
  for (const line of lines) {
    if (line.length < 3) continue;

    const statusCode = line.substring(0, 2);
    const filePath = line.substring(3);

    if (statusCode === 'A ' || statusCode === '??') {
      added.push(filePath);
    } else if (statusCode === 'M ' || statusCode === ' M') {
      modified.push(filePath);
    } else if (statusCode === 'D ' || statusCode === ' D') {
      deleted.push(filePath);
    }
  }

  return {
    added,
    modified,
    deleted,
    total: added.length + modified.length + deleted.length
  };
}

function formatDiffSummary(changes, slug) {
  const lines = [];
  const MAX_FILES = 20;

  lines.push(formatFeatureHeader(slug));
  lines.push('');

  const addedLabel = `Added (${changes.added.length} file${changes.added.length === 1 ? '' : 's'})`;
  lines.push(addedLabel);
  if (changes.added.length === 0) {
    lines.push('  (none)');
  } else {
    const displayFiles = changes.added.slice(0, MAX_FILES);
    for (const file of displayFiles) {
      lines.push(`  + ${file}`);
    }
    if (changes.added.length > MAX_FILES) {
      lines.push(`  ... and ${changes.added.length - MAX_FILES} more`);
    }
  }
  lines.push('');

  const modifiedLabel = `Modified (${changes.modified.length} file${changes.modified.length === 1 ? '' : 's'})`;
  lines.push(modifiedLabel);
  if (changes.modified.length === 0) {
    lines.push('  (none)');
  } else {
    const displayFiles = changes.modified.slice(0, MAX_FILES);
    for (const file of displayFiles) {
      lines.push(`  ~ ${file}`);
    }
    if (changes.modified.length > MAX_FILES) {
      lines.push(`  ... and ${changes.modified.length - MAX_FILES} more`);
    }
  }
  lines.push('');

  const deletedLabel = `Deleted (${changes.deleted.length} file${changes.deleted.length === 1 ? '' : 's'})`;
  lines.push(deletedLabel);
  if (changes.deleted.length === 0) {
    lines.push('  (none)');
  } else {
    const displayFiles = changes.deleted.slice(0, MAX_FILES);
    for (const file of displayFiles) {
      lines.push(`  - ${file}`);
    }
    if (changes.deleted.length > MAX_FILES) {
      lines.push(`  ... and ${changes.deleted.length - MAX_FILES} more`);
    }
  }
  lines.push('');

  lines.push(`Total: ${changes.total} files changed`);

  return lines.join('\n');
}

function formatFeatureHeader(slug) {
  return `--- Changes to commit for feature: ${slug} ---`;
}

function hasChanges(changes) {
  return changes.total > 0;
}

function shouldSkipPreview({ noCommit, noDiffPreview, yes, hasChanges }) {
  if (noCommit) return true;
  if (noDiffPreview) return true;
  if (yes) return true;
  if (!hasChanges) return true;
  return false;
}

function parseUserChoice(input) {
  if (!input || typeof input !== 'string') return null;
  const normalized = input.toLowerCase().trim();
  if (normalized === 'c') return 'commit';
  if (normalized === 'a') return 'abort';
  if (normalized === 'd') return 'diff';
  return null;
}

function createAbortResult(slug) {
  return {
    exitCode: 0,
    reason: 'user-aborted',
    slug
  };
}

function truncateDiff(diffOutput, threshold) {
  if (!diffOutput) return diffOutput;
  const lines = diffOutput.split('\n');
  if (lines.length <= threshold) {
    return diffOutput;
  }
  const truncated = lines.slice(0, threshold);
  const remaining = lines.length - threshold;
  truncated.push(`... ${remaining} more lines`);
  return truncated.join('\n');
}

function getPreviewState() {
  return 'awaiting-commit-review';
}

function markWorktreeAborted(worktree) {
  return {
    ...worktree,
    status: 'user-aborted'
  };
}

function getPromptText() {
  return '[c]ommit / [a]bort / [d]iff';
}

module.exports = {
  parseGitStatus,
  formatDiffSummary,
  formatFeatureHeader,
  hasChanges,
  shouldSkipPreview,
  parseUserChoice,
  createAbortResult,
  truncateDiff,
  getPreviewState,
  markWorktreeAborted,
  getPromptText
};
