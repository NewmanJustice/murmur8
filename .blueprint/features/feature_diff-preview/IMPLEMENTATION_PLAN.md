# Implementation Plan: Diff Preview

## Summary

Create a new `src/diff-preview.js` module that provides transparency before auto-commit by displaying pending changes and prompting for user confirmation. The module exports pure functions for parsing git status, formatting summaries, and handling user choices, plus integration functions for the pipeline commit flow.

## Files to Create/Modify

| Path | Action | Purpose |
|------|--------|---------|
| `src/diff-preview.js` | Create | Core module with all exported functions |
| `src/index.js` | Modify | Export diff-preview functions |
| `src/theme.js` | Modify | Add `user-aborted` status icon |
| `SKILL.md` | Modify | Document `--no-diff-preview` flag and Step 10.5 |

## Implementation Steps

1. **Create `src/diff-preview.js` skeleton** with all required exports: `parseGitStatus`, `formatDiffSummary`, `shouldSkipPreview`, `parseUserChoice`, `createAbortResult`, `truncateDiff`, `getPreviewState`, `markWorktreeAborted`, `getPromptText`, `hasChanges`, `formatFeatureHeader`.

2. **Implement `parseGitStatus(porcelainOutput)`** - Parse `git status --porcelain` output into `{ added: [], modified: [], deleted: [], total: number }`. Handle status codes: `A`/`??` (added), `M`/` M` (modified), `D`/` D` (deleted).

3. **Implement display functions** - `formatDiffSummary(changes, slug)` with 20-file truncation per category, `formatFeatureHeader(slug)`, and `hasChanges(changes)`.

4. **Implement skip logic** - `shouldSkipPreview({ noCommit, noDiffPreview, yes, hasChanges })` returns true if any skip condition met.

5. **Implement user choice handling** - `parseUserChoice(input)` maps `c/C` to `'commit'`, `a/A` to `'abort'`, `d/D` to `'diff'`, else `null`.

6. **Implement abort/state functions** - `createAbortResult(slug)` returns `{ exitCode: 0, reason: 'user-aborted', slug }`, `getPreviewState()` returns `'awaiting-commit-review'`, `markWorktreeAborted(worktree)` sets status to `'user-aborted'`.

7. **Implement truncation** - `truncateDiff(diffOutput, threshold)` limits to threshold lines with "... N more lines" message.

8. **Implement `getPromptText()`** - Return the interactive prompt string `[c]ommit / [a]bort / [d]iff`.

9. **Update `src/theme.js`** - Add `'user-aborted': '\u25a1'` (or similar) to STATUS_ICONS for murmuration display consistency.

10. **Update `src/index.js`** - Import and export diff-preview functions for programmatic access.

## Risks/Questions

- Git command execution not part of pure functions (caller provides porcelain output)
- Interactive prompt loop (re-prompt after 'd') handled by integration layer, not tested in unit tests
- Binary file detection (`[binary]` note) deferred to display integration
