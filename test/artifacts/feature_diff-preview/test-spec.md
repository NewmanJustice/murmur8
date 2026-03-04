# Test Specification: Diff Preview

## Understanding

The diff-preview feature provides transparency before auto-commit by showing pending changes (staged/unstaged) and prompting for user confirmation. Key behaviors:
- Parse `git status --porcelain` output to categorize changes (Added, Modified, Deleted)
- Display summary with file counts and paths
- Interactive prompt: commit, abort, or view full diff
- Skip conditions: `--no-commit`, `--no-diff-preview`, `--yes`, empty diff
- Murmuration mode: per-worktree preview with "user-aborted" status distinction

## AC to Test ID Mapping

| AC | Test ID | Scenario |
|----|---------|----------|
| Detect changes | T-DC-1.1 | parseGitStatus handles Added (A/??) |
| Detect changes | T-DC-1.2 | parseGitStatus handles Modified (M) |
| Detect changes | T-DC-1.3 | parseGitStatus handles Deleted (D) |
| Detect changes | T-DC-1.4 | parseGitStatus handles empty output |
| Detect changes | T-DC-1.5 | parseGitStatus handles mixed changes |
| Display summary | T-DS-1.1 | formatDiffSummary shows file counts |
| Display summary | T-DS-1.2 | formatDiffSummary shows file paths |
| Display summary | T-DS-1.3 | formatDiffSummary truncates at 20 files |
| Display summary | T-DS-1.4 | formatDiffSummary shows "(none)" for empty category |
| Skip conditions | T-SK-1.1 | shouldSkipPreview true when --no-commit |
| Skip conditions | T-SK-1.2 | shouldSkipPreview true when --no-diff-preview |
| Skip conditions | T-SK-1.3 | shouldSkipPreview true when --yes |
| Skip conditions | T-SK-1.4 | shouldSkipPreview true when no changes |
| Skip conditions | T-SK-1.5 | shouldSkipPreview false otherwise |
| User choice | T-UC-1.1 | parseUserChoice returns 'commit' for 'c' |
| User choice | T-UC-1.2 | parseUserChoice returns 'abort' for 'a' |
| User choice | T-UC-1.3 | parseUserChoice returns 'diff' for 'd' |
| User choice | T-UC-1.4 | parseUserChoice returns null for invalid |
| Abort handling | T-AH-1.1 | createAbortResult has exitCode 0 |
| Abort handling | T-AH-1.2 | createAbortResult has reason 'user-aborted' |
| Truncation | T-TR-1.1 | truncateDiff limits lines to threshold |
| Truncation | T-TR-1.2 | truncateDiff adds continuation message |
| State transition | T-ST-1.1 | getPreviewState returns 'awaiting-commit-review' |
| Murmuration | T-MU-1.1 | markWorktreeAborted sets 'user-aborted' status |

## Assumptions

- Git is available and working tree is accessible
- Terminal supports interactive prompts (or flags used for CI)
- Binary files noted as "[binary]" without diff content
- Large diffs auto-truncate at 100 lines with option to show all
- Exit code 0 for user-abort (deliberate choice, not error)
