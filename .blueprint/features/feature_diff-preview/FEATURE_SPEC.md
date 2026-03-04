# Feature Specification — Diff Preview

## 1. Feature Intent

Provide transparency into pipeline-generated changes before committing them.

**Problem:** The auto-commit stage (Step 11) commits all changes without showing users what will be committed. Users may want to review file additions, modifications, and deletions before they become part of the git history.

**Solution:** Before auto-commit, display a summary of all pending changes (staged and unstaged) so users can review and approve or abort.

**System alignment:** Supports the system spec's "Observability" cross-cutting concern and empowers the Human User actor who has "final arbiter" authority over scope and quality.

---

## 2. Scope

### In Scope
- Show diff summary before auto-commit (single-feature pipeline)
- Show diff summary before worktree commit (murmuration mode, Step M5.5)
- Display file counts: additions, modifications, deletions
- Display file paths for each category
- Display actual diff content (optionally truncated for large changes)
- Prompt user to confirm commit, abort, or review full diff
- `--no-diff-preview` flag to skip (for automation)
- Integration with `--no-commit` flag (skip preview when commit is skipped)

### Out of Scope
- Interactive editing of changes before commit
- Selective staging/unstaging from the preview
- Diff viewing in external tools (editor integration)
- Syntax highlighting in diff output

---

## 3. Actors Involved

### Human User
- **Can:** View diff summary, approve commit, abort commit, request full diff
- **Cannot:** Edit changes from the preview screen

### Pipeline Orchestrator
- **Can:** Trigger diff preview, pass result to commit stage
- **Cannot:** Auto-approve on user's behalf (unless `--no-diff-preview`)

---

## 4. Behaviour Overview

### Single-Feature Pipeline (Step 11)

Before committing, the pipeline:

1. Runs `git status --porcelain` to detect changes
2. Categorizes changes: Added (A/??), Modified (M), Deleted (D)
3. Displays summary:
   ```
   Changes to commit for feature_user-auth:

   Added (3 files):
     + .blueprint/features/feature_user-auth/FEATURE_SPEC.md
     + test/feature_user-auth.test.js
     + src/auth.js

   Modified (1 file):
     ~ src/index.js

   Deleted (0 files):
     (none)

   Total: 4 files changed

   [c]ommit / [a]bort / [d]iff (show full diff)?
   ```
4. On 'c': proceed to commit
5. On 'a': abort pipeline, exit cleanly
6. On 'd': show full `git diff --staged` output, then re-prompt

### Murmuration Mode (Step M5.5)

For each successful worktree, before committing:

1. Change to worktree directory
2. Run same diff preview flow
3. If user aborts one worktree, mark it as "user-aborted" (not "failed")
4. Continue to next worktree

### Skip Conditions

Diff preview is skipped when:
- `--no-commit` flag is set (no commit will happen)
- `--no-diff-preview` flag is set (user opted out)
- `--yes` flag is set (non-interactive mode)
- No changes detected (`git status` returns empty)

---

## 5. State & Lifecycle Interactions

**States touched:**
- Feature enters a new transient state: `awaiting-commit-review`
- Exits to: `committing` (on approve) or `aborted` (on abort)

**This feature is:** state-constraining (adds a gate before commit)

---

## 6. Rules & Decision Logic

| Rule | Description | Deterministic |
|------|-------------|---------------|
| Empty diff | Skip preview if no changes detected | Yes |
| Truncation | Show first 20 files per category; "... and N more" for overflow | Yes |
| Large diff | For full diff view, paginate if >100 lines | Yes |
| Abort handling | Exit code 0 (user choice, not error) | Yes |

---

## 7. Dependencies

- Git CLI (`git status`, `git diff`)
- readline module (for interactive prompt)
- Existing orchestrator.js or SKILL.md commit flow

---

## 8. Non-Functional Considerations

- **Performance:** `git status` and `git diff` are fast; no significant overhead
- **Error tolerance:** If git commands fail, show error and proceed with prompt

---

## 9. Assumptions & Open Questions

### Assumptions
- Git working tree is accessible at commit time
- Terminal supports interactive prompts (or flags are used for CI)

### Open Questions
- Should diff preview show binary files differently? (Assume: just note "[binary]")
- Should large diffs auto-truncate in full view? (Assume: yes, with option to show all)

---

## 10. Impact on System Specification

**Reinforces:**
- Observability (users see what's happening)
- Human User authority (explicit confirmation)

**Stretches:**
- Pipeline lifecycle adds a transient state (`awaiting-commit-review`)
- May need to document this in system spec's lifecycle section

**No contradictions identified.**

---

## 11. Handover to BA (Cass)

### Story Themes
1. **Preview display:** Show diff summary before commit
2. **User choice:** Confirm, abort, or view full diff
3. **Skip conditions:** Honor flags to bypass preview
4. **Murmuration integration:** Per-worktree preview in parallel mode

### Expected Story Boundaries
- Keep preview display and user interaction in one story
- Separate story for murmuration integration if complex
- Flags/skip conditions can be part of the main preview story

### Areas Needing Careful Framing
- Abort behavior should clearly distinguish user-abort from pipeline failure
- Full diff view interaction: single prompt or back-and-forth?

---

## 12. Change Log

| Date | Change | Reason |
|------|--------|--------|
| 2026-03-04 | Initial spec | Add transparency before auto-commit |
