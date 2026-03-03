# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Run tests (Node.js built-in test runner, requires Node.js >=18)
node --test

# Run a single test file
node --test test/feature_pipeline-history.test.js

# Run CLI locally during development
node bin/cli.js <command>

# Test initialization in another directory
cd /tmp/test-project && node /workspaces/agent-workflow/bin/cli.js init

# Pre-flight validation
node bin/cli.js validate

# View/reset the pipeline queue
node bin/cli.js queue
node bin/cli.js queue reset

# Pipeline history and insights
node bin/cli.js history             # View recent runs
node bin/cli.js history --stats     # Aggregate statistics
node bin/cli.js history --all       # All runs
node bin/cli.js history clear       # Clear history
node bin/cli.js insights            # Analyze patterns
node bin/cli.js insights --feedback # Feedback correlation

# Configuration
node bin/cli.js retry-config        # View retry settings
node bin/cli.js feedback-config     # View feedback thresholds
node bin/cli.js murm-config          # View murmuration settings (alias: parallel-config)
node bin/cli.js stack-config        # View tech stack settings
node bin/cli.js stack-config set language Python  # Set a value
node bin/cli.js stack-config reset  # Reset to defaults

# Murmuration (parallel execution) — also available as: parallel, murmuration
node bin/cli.js murm feat-a feat-b     # Run multiple features in parallel
node bin/cli.js murm feat-a --dry-run  # Preview execution plan
node bin/cli.js murm feat-a --yes      # Skip confirmation prompt
node bin/cli.js murm feat-a --verbose  # Stream output to console
node bin/cli.js murm feat-a --skip-preflight  # Skip validation
node bin/cli.js murm status            # Show pipeline status
node bin/cli.js murm status --detailed # Show progress bars
node bin/cli.js murm abort             # Stop running pipelines
node bin/cli.js murm abort --cleanup   # Stop and remove worktrees
node bin/cli.js murm rollback          # Undo completed merges
node bin/cli.js murm rollback --dry-run  # Preview rollback
node bin/cli.js murm cleanup           # Remove completed worktrees
```

## Architecture

murmur8 is a multi-agent workflow framework that coordinates four AI agents to automate feature development from specification to implementation.

### Agent Team

| Agent | Role |
|-------|------|
| **Alex** | System Specification & Chief-of-Staff — creates/maintains specs, guards design coherence |
| **Cass** | Story Writer/BA — translates specs into testable user stories |
| **Nigel** | Tester — converts stories into executable tests and test plans |
| **Codey** | Developer — implements code to satisfy tests (test-first) |

### Source Structure

- `bin/cli.js` - CLI entry point, routes commands to `src/` modules
- `src/index.js` - Main exports for programmatic use
- `src/init.js` - Copies `.blueprint/`, `.business_context/`, and SKILL.md to target project
- `src/update.js` - Updates framework files while preserving user content in `features/` and `system_specification/`
- `src/orchestrator.js` - Queue management for the pipeline (`.claude/implement-queue.json`)
- `src/validate.js` - Pre-flight checks (directories, specs, Node.js version)
- `src/history.js` - Records execution data (timing, status, feedback)
- `src/insights.js` - Analyzes patterns, detects bottlenecks, recommends improvements
- `src/retry.js` - Smart retry strategies based on failure history
- `src/feedback.js` - Agent-to-agent quality assessment with thresholds
- `src/classifier.js` - Smart routing: classifies features as technical or user-facing
- `src/handoff.js` - Structured summaries between agents for token efficiency
- `src/business-context.js` - Lazy loading of business context based on feature needs
- `src/theme.js` - Murmuration visual theming (banner, glyphs, status icons, progress bar, colorize)
- `src/murm.js` - Murmuration pipeline execution using git worktrees
- `src/interactive.js` - Interactive mode for spec creation (system spec or feature spec)
- `src/stack.js` - Configurable tech stack detection and configuration (auto-detects from package.json, pyproject.toml, go.mod, etc.)
- `src/tools/` - Tool schemas, validation, and prompts for Claude native features

### Bundled Assets

- `.blueprint/agents/` - Agent specifications (AGENT_*.md) and shared GUARDRAILS.md
- `.blueprint/prompts/` - Slim runtime prompts (~30-50 lines) for token efficiency
- `.blueprint/templates/` - SYSTEM_SPEC.md, FEATURE_SPEC.md, STORY_TEMPLATE.md, TEST_TEMPLATE.md
- `.blueprint/ways_of_working/` - Development rituals
- `.business_context/` - Placeholder for business context documents
- `SKILL.md` - The `/implement-feature` skill definition (copied to `.claude/commands/` on init)

### Pipeline Flow

The `/implement-feature` skill spawns agents sequentially via Task tool sub-agents:

```
Alex (feature spec) → [Cass (user stories)] → Nigel (tests) → Codey (plan → implement) → Auto-commit
```

**Smart Story Routing (v2.7):** Cass stage is automatically skipped for technical features (refactoring, optimization, infrastructure) to save ~25-40k tokens. User-facing features go through Cass.

Invocation options:
- `/implement-feature "slug"` - Run full pipeline
- `/implement-feature "slug" --interactive` - Force interactive spec creation mode
- `/implement-feature "slug" --pause-after=alex|cass|nigel|codey-plan` - Pause at stage for review
- `/implement-feature "slug" --no-commit` - Skip auto-commit at end
- `/implement-feature "slug" --no-feedback` - Skip feedback collection
- `/implement-feature "slug" --no-validate` - Skip pre-flight validation
- `/implement-feature "slug" --no-history` - Skip history recording
- `/implement-feature "slug" --with-stories` - Force include Cass stage
- `/implement-feature "slug" --skip-stories` - Force skip Cass stage

Queue state is persisted to `.claude/implement-queue.json` for recovery on failure. The skill reads the queue on invocation and resumes from `current.stage`.

### Murmuration (Parallel Execution)

Run multiple features simultaneously using git worktrees for isolation:

```bash
npx murmur8 murm <slug-a> <slug-b> <slug-c> --dry-run  # Preview plan
npx murmur8 murm <slug-a> <slug-b> <slug-c>            # Execute
```

Aliases: `parallel`, `murmuration` (all point to the same handler)

Each feature gets an isolated worktree in `.claude/worktrees/feat-{slug}/`. Successful features auto-merge; conflicts are preserved for manual resolution. Requires Git 2.5+ and clean working tree.

## Key Patterns

- User content directories (`features/`, `system_specification/`) are preserved during `update`
- Framework directories (`agents/`, `templates/`, `ways_of_working/`) are replaced during `update`
- State files are gitignored: `implement-queue.json`, `pipeline-history.json`, `retry-config.json`, `feedback-config.json`, `murm-config.json`, `murm-queue.json`, `stack-config.json`
- Test files follow `test/feature_{slug}.test.js` naming convention

## Token Limit Handling

The pipeline is optimized to avoid Claude's 4096 output token limit:

- **Incremental file writes** - Agents write one file at a time, not all at once
- **Consolidated artifacts** - Nigel produces 2 files (test-spec.md + test file) instead of 4
- **Brief summaries** - Completion messages are 5 bullets max
- **Reference by path** - Agents reference other artifacts by path rather than quoting content

If token errors occur, set `CLAUDE_CODE_MAX_OUTPUT_TOKENS` environment variable higher.

## Multi-CLI Support

The `/implement-feature` skill works with both Claude Code and GitHub Copilot CLI. During `init`, murmur8 installs the skill to both locations:

| CLI | Skill Location |
|-----|----------------|
| Claude Code | `.claude/commands/implement-feature.md` (master) |
| Copilot CLI | `.github/skills/implement-feature/SKILL.md` (symlink) |

Both CLIs use the same skill file (via symlink), ensuring identical behavior. Run `/implement-feature` in either tool.

## Skills

Available skills (invoke via `/skill-name` in Claude Code):
- `/implement-feature` - Run the full Alex → Cass → Nigel → Codey pipeline
