# murmur8

A multi-agent workflow framework for automated feature development. Four specialised AI agents collaborate in sequence to take features from specification to implementation, with built-in feedback loops and self-improvement capabilities. 

Like a murmuration of starlings, individual agents move together as one, each responding to its neighbours to create something greater than the sum of its parts.

# TLDR - Using murmur8

## Using murmur8 inside Claude Code or Copilot CLI
Initialize with `npx murmur8 init`, then run `/implement-feature your-feature` in Claude Code or Copilot CLI. Four AI agents collaborate to turn your idea into tested, working code — from spec to implementation. Add up to 3 feature slugs and the murmuration magic will build them in paralell in an isolated git worktree. 

## Using murmur8 outside of Claude Code or Copilot CLI
Initialize with `npx murmur8 init`, then run `npx murmur8 murm feature-a feature-b` from your terminal. Each feature gets an isolated git worktree and runs its own pipeline. Successful features auto-merge to main. Use `--dry-run` to preview the plan first.

## Upgrading to v4.0

v4.0 completes the murmuration theming by renaming all parallel internals. Existing users should be aware of the following breaking changes.

### Breaking changes

- **Source file renamed**: `src/parallel.js` → `src/murm.js` — update any direct `require()` / `import` references
- **Exported functions renamed**: `runParallel` → `runMurm`, `abortParallel` → `abortMurm`, `rollbackParallel` → `rollbackMurm`, `readParallelConfig` → `readMurmConfig`, `writeParallelConfig` → `writeMurmConfig`, `getDefaultParallelConfig` → `getDefaultMurmConfig`, `validateParallelBatch` → `validateMurmBatch`
- **Status strings renamed**: `parallel_queued` → `murm_queued`, `parallel_running` → `murm_running`, `parallel_failed` → `murm_failed`, `parallel_complete` → `murm_complete` — update any code that matches on these values
- **On-disk paths renamed**: `.claude/parallel-config.json` → `.claude/murm-config.json`, `.claude/parallel-queue.json` → `.claude/murm-queue.json`, `.claude/parallel.lock` → `.claude/murm.lock`
- **CLI command renamed**: `parallel-config` → `murm-config`

### Automatic migration

Legacy on-disk files (`.claude/parallel-config.json`, `.claude/parallel-queue.json`, `.claude/parallel.lock`) are **automatically migrated** to the new paths on first access. No manual action is needed for existing configs.

### Backward-compatible aliases

The CLI commands `parallel`, `murmuration`, and `parallel-config` continue to work as aliases for `murm` and `murm-config` respectively.

## Agents

| Agent | Role |
|-------|------|
| **Alex** | System Specification & Chief-of-Staff — creates/maintains specs, guards design coherence |
| **Cass** | Story Writer/BA — translates specs into testable user stories |
| **Nigel** | Tester — converts stories into executable tests and test plans |
| **Codey** | Developer — implements code to satisfy tests (test-first) |

## Installation

```bash
npx murmur8 init
```

This installs the `.blueprint/` directory, `.business_context/`, and the `/implement-feature` skill to `.claude/commands/`. If files already exist, you'll be prompted before overwriting. It also adds the workflow queue to `.gitignore`.

During initialization, murmur8 **auto-detects your project's tech stack** from manifest files (`package.json`, `pyproject.toml`, `go.mod`, etc.) and writes the result to `.claude/stack-config.json`. The agents (Nigel and Codey) read this file at runtime to adapt their testing and implementation approach to your stack.

```bash
# Review what was detected
npx murmur8 stack-config

# Adjust if needed
npx murmur8 stack-config set language TypeScript
npx murmur8 stack-config set frameworks '["next","react"]'
npx murmur8 stack-config set testRunner vitest
npx murmur8 stack-config set testCommand "npx vitest run"
```

If you're working with a non-JavaScript project, set the stack config before running the pipeline:

```bash
# Python/Django example
npx murmur8 stack-config set language Python
npx murmur8 stack-config set runtime "Python 3.12"
npx murmur8 stack-config set packageManager pip
npx murmur8 stack-config set frameworks '["django"]'
npx murmur8 stack-config set testRunner pytest
npx murmur8 stack-config set testCommand "pytest"
npx murmur8 stack-config set linter ruff
```

## Keeping Up to Date

**Modules** (history, insights, feedback, retry, validate) are part of the npm package and update automatically when you use `npx` - no action needed.

**Project files** (agent specs, templates, skill definition) are copied to your project and need explicit updating:

```bash
npx murmur8 update
```

This updates `.blueprint/agents/`, `.blueprint/templates/`, `.blueprint/ways_of_working/`, and `.claude/commands/implement-feature.md` while preserving your content in `features/` and `system_specification/`.

## Commands

### Core Commands

| Command | Description |
|---------|-------------|
| `npx murmur8 init` | Initialize `.blueprint/`, `.business_context/`, and skill in your project |
| `npx murmur8 update` | Update agents, templates, and rituals to latest version |
| `npx murmur8 validate` | Pre-flight checks before running pipeline |
| `npx murmur8 help` | Show help |

### History & Insights

| Command | Description |
|---------|-------------|
| `npx murmur8 history` | View recent pipeline runs |
| `npx murmur8 history --cost` | View runs with cost breakdown |
| `npx murmur8 history --stats` | View aggregate statistics |
| `npx murmur8 history --stats --cost` | View stats with cost metrics |
| `npx murmur8 history --all` | View all runs |
| `npx murmur8 history clear` | Clear history |
| `npx murmur8 history export` | Export history as CSV (default) |
| `npx murmur8 history export --format=json` | Export as JSON |
| `npx murmur8 history export --since=YYYY-MM-DD` | Filter by start date |
| `npx murmur8 history export --until=YYYY-MM-DD` | Filter by end date |
| `npx murmur8 history export --status=<status>` | Filter by status (success/failed/paused) |
| `npx murmur8 history export --feature=<slug>` | Filter by feature slug |
| `npx murmur8 history export --output=<path>` | Write to file instead of stdout |
| `npx murmur8 insights` | Analyze patterns and get recommendations |
| `npx murmur8 insights --feedback` | View feedback correlation analysis |
| `npx murmur8 insights --bottlenecks` | View bottleneck analysis |
| `npx murmur8 insights --failures` | View failure pattern analysis |

### Murmuration (Parallel Execution)

| Command | Description |
|---------|-------------|
| `npx murmur8 murm <slugs...>` | Run multiple features in parallel |
| `npx murmur8 murm <slugs...> --dry-run` | Preview execution plan |
| `npx murmur8 murm status` | Show status of running pipelines |
| `npx murmur8 murm cleanup` | Remove completed worktrees |
| `npx murmur8 murm-config` | View murmuration configuration |
| `npx murmur8 murm-config set <key> <value>` | Modify murmuration settings |

### Configuration

| Command | Description |
|---------|-------------|
| `npx murmur8 stack-config` | View detected tech stack |
| `npx murmur8 stack-config set <key> <value>` | Modify stack settings (language, frameworks, testRunner, etc.) |
| `npx murmur8 stack-config reset` | Reset to empty defaults |
| `npx murmur8 cost-config` | View cost tracking pricing |
| `npx murmur8 cost-config set <key> <value>` | Modify pricing (inputPrice, outputPrice) |
| `npx murmur8 cost-config reset` | Reset to default Claude pricing |
| `npx murmur8 retry-config` | View retry configuration |
| `npx murmur8 retry-config set <key> <value>` | Modify retry settings |
| `npx murmur8 retry-config reset` | Reset to defaults |
| `npx murmur8 feedback-config` | View feedback thresholds |
| `npx murmur8 feedback-config set <key> <value>` | Modify feedback settings |
| `npx murmur8 murm-config` | View murmuration pipeline configuration |
| `npx murmur8 murm-config set <key> <value>` | Modify murmuration settings |

## Skill usage

Run the pipeline with the `/implement-feature` skill in Claude Code:

```bash
/implement-feature                           # Interactive
/implement-feature "Your Slug"               # New feature
/implement-feature "Your Slug" --no-feedback # Skip feedback collection
/implement-feature "Your Slug" --no-validate # Skip pre-flight validation
/implement-feature "Your Slug" --no-history  # Skip history recording
/implement-feature "Your Slug" --no-commit   # Skip auto-commit
/implement-feature "Your Slug" --no-diff-preview  # Skip diff preview before commit
/implement-feature "Your Slug" --pause-after=alex|cass|nigel|codey-plan
/implement-feature "Your Slug" --with-stories  # Force include Cass stage
/implement-feature "Your Slug" --skip-stories  # Force skip Cass stage
/implement-feature "Your Slug A" "Your Slug B" "Your Slug C" # Runs murmuration with sub agents within a single instance of the CLI.
```

## Smart Story Routing (v2.7)

The pipeline automatically classifies features as **technical** or **user-facing** and routes accordingly:

| Feature Type | Cass Stage | Example Features |
|--------------|------------|------------------|
| **Technical** | Skipped | refactoring, optimization, infrastructure, caching |
| **User-facing** | Included | login flows, dashboards, forms, notifications |

This saves ~25-40k tokens per technical feature while preserving story quality for user-facing features.

```bash
# Auto-detection (default)
/implement-feature "token-optimization"  # Detected as technical → skips Cass
/implement-feature "user-dashboard"      # Detected as user-facing → includes Cass

# Manual override
/implement-feature "edge-case" --with-stories   # Force include Cass
/implement-feature "edge-case" --skip-stories   # Force skip Cass
```

## Pipeline Flow

The pipeline includes validation, smart routing, feedback loops, and history tracking:

```
┌─────────────────────────────────────────────────────────────────┐
│  Step 0: Pre-flight Validation                                  │
│  • Check directories, specs, Node.js version                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Insights Preview                                               │
│  • "Last 10 runs: 85% success, estimated ~12 min"               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Alex (Feature Spec) + Handoff Summary                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Smart Routing (v2.7)                                           │
│  • Classify feature as technical or user-facing                 │
│  • Technical → skip Cass (saves ~25-40k tokens)                 │
│  • User-facing → include Cass                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
┌──────────────────────┐        ┌──────────────────────┐
│  Technical Features  │        │  User-Facing Features│
│  Skip to Nigel       │        │  Cass (User Stories) │
└──────────────────────┘        └──────────────────────┘
              │                               │
              └───────────────┬───────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Nigel (Tests) + Handoff Summary                                │
│         │                                                       │
│         ▼                                                       │
│  Codey rates Nigel → Quality Gate                               │
│         │                                                       │
│         ▼                                                       │
│  Codey (Plan → Implement)                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                    On Failure│
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Smart Retry                                                    │
│  • Check feedback chain for root cause                          │
│  • Recommend strategy based on history                          │
│  • Apply: simplify-prompt, add-context, incremental, etc.       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Diff Preview (unless --no-diff-preview)                        │
│  • Show file changes (added/modified/deleted)                   │
│  • User confirms: commit / abort / view full diff               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Auto-commit → Record to History                                │
│  • Duration, feedback scores, token cost, outcome               │
└─────────────────────────────────────────────────────────────────┘
```

## Modules

murmur8 includes these built-in modules for observability and self-improvement:

| Module | Purpose |
|--------|---------|
| **validate** | Pre-flight checks before pipeline runs |
| **history** | Records execution data (timing, status, feedback, cost) |
| **insights** | Analyzes patterns, detects bottlenecks, recommends improvements |
| **retry** | Smart retry strategies based on failure history |
| **feedback** | Agent-to-agent quality assessment with correlation tracking |
| **classifier** | Smart routing — classifies features as technical or user-facing |
| **handoff** | Structured summaries between agents for token efficiency |
| **business-context** | Lazy loading of business context based on feature needs |
| **tools** | Tool schemas and validation for Claude native features |
| **murm** | Murmuration pipeline execution using git worktrees |
| **stack** | Configurable tech stack detection and configuration |
| **cost** | Token usage tracking and cost estimation per stage |
| **diff-preview** | Pre-commit change review with user confirmation |

### How They Work Together

```
Pipeline Run
     │
     ├──► history.js records timing at each stage
     │
     ├──► cost.js tracks token usage per stage
     │
     ├──► feedback.js collects quality ratings between stages
     │
     ├──► diff-preview.js shows changes before commit
     │
     └──► On completion/failure, data stored in pipeline-history.json
                              │
                              ▼
                    Future Pipeline Runs
                              │
     ┌────────────────────────┼────────────────────────┐
     │                        │                        │
     ▼                        ▼                        ▼
insights.js              retry.js               feedback.js
analyzes:               recommends:            calibrates:
• Bottlenecks           • Retry strategies     • Quality thresholds
• Failure patterns      • Based on history     • Agent accuracy
• Trends                • And feedback issues
```

## Directory Structure

```
your-project/
├── .blueprint/
│   ├── agents/                    # Agent specifications
│   │   ├── AGENT_SPECIFICATION_ALEX.md
│   │   ├── AGENT_BA_CASS.md
│   │   ├── AGENT_TESTER_NIGEL.md
│   │   ├── AGENT_DEVELOPER_CODEY.md
│   │   └── GUARDRAILS.md          # Shared guardrails (v2.7)
│   ├── prompts/                   # Slim runtime prompts (v2.7)
│   │   ├── TEMPLATE.md
│   │   ├── alex-runtime.md
│   │   ├── cass-runtime.md
│   │   ├── nigel-runtime.md
│   │   ├── codey-plan-runtime.md
│   │   └── codey-implement-runtime.md
│   ├── templates/                 # Spec and output templates
│   │   ├── SYSTEM_SPEC.md
│   │   ├── FEATURE_SPEC.md
│   │   ├── STORY_TEMPLATE.md      # (v2.7)
│   │   └── TEST_TEMPLATE.md       # (v2.7)
│   ├── ways_of_working/           # Development rituals
│   ├── features/                  # Feature specs (populated per feature)
│   └── system_specification/      # System spec (populated on first run)
├── .business_context/             # Business context documents
│   └── README.md
├── .claude/
│   ├── commands/
│   │   └── implement-feature.md   # The /implement-feature skill
│   ├── worktrees/                 # Git worktrees for parallel execution
│   │   └── feat-{slug}/           # Isolated worktree per feature
│   ├── pipeline-history.json      # Execution history (gitignored)
│   ├── retry-config.json          # Retry configuration (gitignored)
│   ├── feedback-config.json       # Feedback thresholds (gitignored)
│   ├── cost-config.json           # Cost tracking pricing (gitignored)
│   ├── murm-config.json            # Murmuration execution config (gitignored)
│   ├── murm-queue.json             # Murmuration pipeline state (gitignored)
│   ├── stack-config.json          # Tech stack configuration (gitignored)
│   └── implement-queue.json       # Pipeline queue state (gitignored)
└── test/
    ├── artifacts/                 # Test specs per feature
    └── feature_*.test.js          # Executable tests
```

## Agent Guardrails

All agents follow strict guardrails to ensure quality:

| Guardrail | Description |
|-----------|-------------|
| **Source Restrictions** | Only use provided inputs (specs, code, business_context) |
| **Prohibited Sources** | No social media, forums, external APIs, training data for domain facts |
| **Citation Requirements** | All claims must cite source files |
| **Confidentiality** | Business context treated as confidential |
| **Escalation Protocol** | Clear rules for when to ask vs assume |

## Self-Improvement Loop

The pipeline learns from itself:

1. **Record** — Each run records timing, feedback, and outcomes
2. **Analyze** — `murmur8 insights` identifies patterns
3. **Adapt** — Future runs use history to:
   - Set dynamic quality thresholds
   - Select optimal retry strategies
   - Predict duration and success rate
4. **Improve** — Feedback patterns suggest prompt improvements

```bash
# Example insights output
$ npx murmur8 insights

## Pipeline Insights

### Bottlenecks
- nigel averages 4.2 min (42% of pipeline time)
- Recommendation: Consider simplifying test requirements

### Failure Patterns
- codey-implement has 23% failure rate
- Most common issue: "missing-error-handling" (73% correlation)
- Recommendation: Ensure Alex includes error handling in specs

### Trends
- Success rate: 75% → 85% (improving)
- Avg duration: 14 min → 11 min (improving)
```

## Multi-CLI Support (v4.1)

The `/implement-feature` skill works with both **Claude Code** and **GitHub Copilot CLI**. During initialization, murmur8 installs the skill to both locations:

| CLI | Location |
|-----|----------|
| Claude Code | `.claude/commands/implement-feature.md` |
| Copilot CLI | `.github/skills/implement-feature/SKILL.md` |

The Copilot CLI location is a symlink to the Claude Code master, ensuring both tools use identical skill definitions.

### Usage

```bash
# Initialize (installs skill for both CLIs)
npx murmur8 init

# Then use either CLI:
/implement-feature user-auth    # Works in Claude Code
/implement-feature user-auth    # Works in Copilot CLI
```

Both CLIs execute the same pipeline: Alex → Cass → Nigel → Codey. The skill uses each CLI's native agent/task mechanism.

## Token Efficiency (v2.7)

Version 2.7 introduces several optimizations to reduce token usage:

| Optimization | Savings | Description |
|--------------|---------|-------------|
| **Shared Guardrails** | ~1,200 tokens | Single GUARDRAILS.md instead of duplicated in each agent spec |
| **Slim Runtime Prompts** | ~5,200 tokens | 30-50 line prompts instead of 200-400 line full specs |
| **Upstream Summaries** | ~2,000-4,000 tokens | Handoff summaries between agents instead of full artifacts |
| **Template Extraction** | ~800 tokens | Templates moved to separate files, loaded on demand |
| **Lazy Business Context** | Variable | Only loaded when feature spec references it |
| **Compressed Feedback** | ~400 tokens | 3-line feedback prompts instead of 7-line |
| **Smart Story Routing** | ~25,000-40,000 tokens | Skip Cass for technical features |

**Total estimated savings: 10,000+ tokens per pipeline run** (more for technical features)

## Cost Tracking

Track token usage and estimated costs per pipeline stage:

```bash
# View costs in history
npx murmur8 history --cost

SLUG                STATUS    DURATION   TOTAL COST
user-auth           success   12m 30s    $0.088
api-validation      success    8m 15s    $0.062

# View cost statistics
npx murmur8 history --stats --cost

Avg cost per run:        $0.075
Total cost (all runs):   $1.12
Most expensive stage:    codey-implement
```

### Configuration

Default pricing uses Claude Sonnet rates ($3/M input, $15/M output):

```bash
# View current pricing
npx murmur8 cost-config

# Customize pricing (per million tokens)
npx murmur8 cost-config set inputPrice 3
npx murmur8 cost-config set outputPrice 15

# Reset to defaults
npx murmur8 cost-config reset
```

Cost data is stored in `pipeline-history.json` alongside timing and feedback data.

## Murmuration

Run multiple feature pipelines simultaneously using git worktrees for isolation. Each feature gets its own worktree and branch, allowing true parallel development without conflicts.

### How It Works

```
murmur8 murm <slug-a> <slug-b> <slug-c>
                    │
                    ▼
    ┌───────────────────────────────────────┐
    │  Pre-flight Validation                │
    │  • Git repository check               │
    │  • Clean working tree required        │
    │  • Git 2.5+ for worktree support      │
    │  • Feature specs exist & complete     │
    │  • File overlap detection             │
    │  • Dependency detection               │
    │  • Scope estimation                   │
    └───────────────────────────────────────┘
                    │
                    ▼
    ┌───────────────────────────────────────┐
    │  Create Isolated Worktrees            │
    │                                       │
    │  .claude/worktrees/feat-<slug-a>/     │
    │       └─ branch: feature/<slug-a>     │
    │                                       │
    │  .claude/worktrees/feat-<slug-b>/     │
    │       └─ branch: feature/<slug-b>     │
    │                                       │
    │  .claude/worktrees/feat-<slug-c>/     │
    │       └─ branch: feature/<slug-c>     │
    └───────────────────────────────────────┘
                    │
                    ▼
    ┌───────────────────────────────────────┐
    │  Spawn Pipelines                      │
    │  (max 3 concurrent by default)        │
    │                                       │
    │  Each runs: Alex → Nigel → Codey      │
    │  in its isolated worktree             │
    └───────────────────────────────────────┘
                    │
                    ▼
    ┌───────────────────────────────────────┐
    │  Merge on Completion                  │
    │  • First finished = first merged      │
    │  • Conflicts preserved for resolution │
    │  • Successful worktrees cleaned up    │
    └───────────────────────────────────────┘
```

### Usage

```bash
# Run 3 features in parallel (default concurrency)
npx murmur8 murm <slug-a> <slug-b> <slug-c>

# Preview what would happen without executing
npx murmur8 murm <slug-a> <slug-b> --dry-run

# Limit concurrent pipelines
npx murmur8 murm <slug-a> <slug-b> <slug-c> <slug-d> --max-concurrency=2

# Check status of running pipelines
npx murmur8 murm status

# Skip pre-flight feature validation
npx murmur8 murm <slug-a> <slug-b> --skip-preflight

# Clean up completed/aborted worktrees
npx murmur8 murm cleanup
```

### Pre-flight Batch Validation (v2.8)

Before parallel execution, the system validates the batch to prevent wasted resources:

```
$ npx murmur8 murm feat-a feat-b feat-c --dry-run

Pre-flight Validation
=====================

✓ feat-a: Spec complete, 3 stories, Plan exists
✓ feat-b: Spec complete, 2 stories
✗ feat-c: Not ready
    ✗ Missing FEATURE_SPEC.md

Conflict Analysis
=================

⚠ File overlap detected:
  • src/utils.js: feat-a, feat-b both modify

Scope Estimation
================

  Feature   | Stories | Files | Est. Time
  ----------|---------|-------|----------
  feat-a    |       3 |     4 | ~27 min
  feat-b    |       2 |     2 | ~24 min
  feat-c    |       0 |     0 | ~10 min

Total estimated: ~61 min (parallel: ~27 min)
```

**Validation checks:**
- Feature specs exist and have required sections
- User stories present (warns if missing)
- Implementation plans scanned for file overlap
- Dependencies between features detected
- Scope estimated from story/file counts

**On validation failure:**
```
Cannot proceed. Fix issues above or use --skip-preflight to override.

Suggested commands:
  /implement-feature "feat-c" --pause-after=alex
```

### Configuration

The murmuration module is **CLI-agnostic** — configure it to work with different AI coding tools:

```bash
# View current configuration
npx murmur8 murm-config

# Output:
#   cli:            npx claude
#   skill:          /implement-feature
#   skillFlags:     --no-commit
#   worktreeDir:    .claude/worktrees
#   maxConcurrency: 3
#   queueFile:      .claude/murm-queue.json
```

#### Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| `cli` | `npx claude` | The CLI tool to invoke |
| `skill` | `/implement-feature` | The command/skill to run |
| `skillFlags` | `--no-commit` | Additional flags for the skill |
| `worktreeDir` | `.claude/worktrees` | Where to create worktrees |
| `maxConcurrency` | `3` | Maximum parallel pipelines |
| `maxFeatures` | `10` | Maximum features per batch |
| `timeout` | `30` | Timeout per pipeline (minutes) |
| `minDiskSpaceMB` | `500` | Minimum disk space warning threshold |
| `queueFile` | `.claude/murm-queue.json` | State persistence file |

#### Examples for Different CLIs

```bash
# Claude Code (default)
npx murmur8 murm-config set cli "npx claude"
npx murmur8 murm-config set skill "/implement-feature"

# Cursor
npx murmur8 murm-config set cli "cursor"
npx murmur8 murm-config set skill "composer"
npx murmur8 murm-config set skillFlags ""

# Aider
npx murmur8 murm-config set cli "aider"
npx murmur8 murm-config set skill "--message"
npx murmur8 murm-config set skillFlags "implement feature:"

# Custom agent script
npx murmur8 murm-config set cli "./my-agent.sh"
npx murmur8 murm-config set skill "run"

# Reset to defaults
npx murmur8 murm-config reset
```

### State Management

Each feature progresses through these states:

```
murm_queued → worktree_created → murm_running → merge_pending → murm_complete
                                      │                  │
                                      ▼                  ▼
                               murm_failed        merge_conflict
```

- **Successful features**: Merged to main, worktree cleaned up
- **Failed pipelines**: Worktree preserved for debugging
- **Merge conflicts**: Branch preserved, manual resolution required

### Requirements

- **Git 2.5+** (worktree support)
- **Clean working tree** (no uncommitted changes)
- **Sufficient disk space** (each worktree is a full checkout)

## License

MIT
