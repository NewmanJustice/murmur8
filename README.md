# murmur8

![murmur8](.github/assets/github-readme-header.svg)

AI coding tools can be a black box. You describe what you want, magic happens, and code appears. If it's wrong, you describe it again and hope for better. There's no process, no trail, no shared understanding of why decisions were made.

murmur8 is different. Agents Alex, Cass, Nigel, and Codey run a structured, documented pipeline — the kind a good engineering team would run naturally. Each agent produces real, readable artefacts: a feature spec, user stories, a test plan, an implementation. You can read every one of them, understand the reasoning, and step in at any point. It's not magic. It's a repeatable process that happens to move very fast.

Like a murmuration of starlings, the agents move together — each one responding to what came before and building upon it.

## Upgrading from below v4.7.12

From v4.7.12, `npx murmur8 update` handles everything in one command. If you are on an earlier version, run this once to bootstrap:

```bash
npm install murmur8@latest
```

After that, `npx murmur8 update` will keep you up to date automatically.

## Upgrading to v4.7.14

v4.7.14 fixes silent telemetry failures. Upgrading the package is usually enough:

```bash
npx murmur8 update
```

**Check for a stale nested copy.** Before v4.7.14, `npx murmur8 update` ran `npm install murmur8@latest` unconditionally. Because npm walks up to the nearest `package.json`, running it from a directory that had none installed murmur8 into whichever parent directory did — sometimes an unrelated project, and sometimes murmur8 itself. The result is a second copy of murmur8 nested inside your `node_modules/`, which the skill loads *in preference to* the one you just upgraded. v4.7.14 stops this happening again, but it cannot remove a copy that is already there.

If telemetry still fails silently after upgrading, check for one:

```bash
npm ls murmur8
```

A nested entry (murmur8 listed underneath another package rather than at the top level) is the stale copy. Remove it and reinstall:

```bash
rm -rf node_modules/<parent-package>/node_modules/murmur8
npm install murmur8@latest
```

If your telemetry key was quoted in `.env`, unquote it — see [Activation](#activation).

## The Workflow

### Start with a conversation

Every feature starts with intent. If you're setting up a new project, murmur8 will walk you through creating a system specification interactively — Alex asks questions, you answer, and together you produce a document that grounds everything that follows. If a feature spec doesn't exist yet, the same thing happens at the feature level.

You can also trigger this explicitly with `--interactive` flag. This is useful when an idea is still fuzzy, you can have a conversation with Alex until the shape of the feature becomes clear. The spec that comes out the other side is yours to review and approve before anything else runs.

### The pipeline runs

Once there's a spec, the pipeline takes over. Alex hands off to Cass, who writes user stories with explicit acceptance criteria. Cass hands off to Nigel, who turns those stories into a test plan and executable tests. Nigel hands off to Codey, who implements until the tests pass.

At every handoff, the agent writes a summary of what it did, what it decided, and what the next agent needs to know. These aren't logs — they're readable documents. If something goes wrong, or you want to understand why a decision was made, you can read the trail. The spec, the stories, the test plan, the implementation plan: they all live in your repository alongside the code.

### Refine it

The first run won't always land exactly right. Requirements shift, something was misunderstood, or the implementation reveals a gap in the spec. That's normal.

`/refine-feature` reopens the conversation. You can discuss with Alex whats not right, provide error logs, or user feedback. Alex reads what was built, and describes what needs to change, and proposes an updated spec diff for your approval. From there Cass updates only the affected stories, Nigel updates only the affected tests, and Codey reimplements. The pipeline pauses before Codey runs — you always see the full picture of what's changing before any code is touched.

Every refinement is linked to the run it came from, so the history of a feature — original intent, what changed, and why — is always traceable.

### Turning it up to 11

If you using the skill with Claude Code or Github Copilot, or via an npx command, you can run multiple of these pipelines at the same time, working independantly on features in parallel. The pipeline looks at whats required and works out how multiple fetaures can be delivered at the same time withough Nigel 1, 2, and 3 treading on each others toes in the code base. The pipeline runs EXACTLY the same way... just mutiple of them at the same time! 

## Quick Start

**Inside Claude Code or Copilot CLI:**
```bash
npx murmur8 init
/implement-feature your-feature
```

**From the terminal (parallel execution):**
```bash
npx murmur8 init
npx murmur8 murm feature-a feature-b feature-c
```

Add up to three slugs and each feature runs in an isolated git worktree simultaneously. Successful features auto-merge to main. Use `--dry-run` to preview the plan before committing.

## Upgrading to v4.0

<details>
<summary>Breaking changes and migration notes</summary>

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

</details>

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

One command updates everything — the npm package and all project files:

```bash
npx murmur8 update
```

This runs `npm install murmur8@latest` first, then refreshes `.blueprint/agents/`, `.blueprint/templates/`, `.blueprint/ways_of_working/`, and `.claude/commands/implement-feature.md` from the updated package. Your content in `features/` and `system_specification/` is preserved.

The `npm install` step only runs if the current directory has its own `package.json`. Without one, npm would walk up and install into an unrelated parent project, so `update` skips it and tells you to run `npm install murmur8@latest` yourself.

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
| `npx murmur8 telemetry-config` | View telemetry configuration and failed queue depth |

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
│  Feedback micro-Task: Cass reviews Alex's spec                  │
│  • Quality gate: proceed / pause / revise                       │
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
│  Feedback micro-Task: Nigel reviews Cass's stories              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Nigel (Test Spec + Handoff) → Nigel (Executable Tests)         │
│  • Split into two atomic calls for token efficiency             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Feedback micro-Task: Codey reviews Nigel's tests               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Codey (Plan) → Codey (Implement per-step)                      │
│  • Plan uses strict parseable format                            │
│  • Orchestrator spawns one Task per implementation step         │
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
| **telemetry** | Opt-in audit layer — POSTs structured run data to a configured endpoint for corpus building and enterprise usage monitoring |

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

### Accessing Module Data

Data is collected from both invocation methods and accessible via CLI commands:

| Data | `/implement-feature` (skill) | `npx murmur8 murm` (CLI) | How to access |
|------|------------------------------|--------------------------|---------------|
| **Per-stage timing** (alex, cass, nigel, codey) | Recorded by orchestrating agent | Merged from worktree on successful merge | `npx murmur8 history` |
| **Feedback ratings** (agent-to-agent) | Recorded by feedback micro-Tasks | Merged from worktree on successful merge | `npx murmur8 history`, `npx murmur8 insights --feedback` |
| **Token cost per stage** | Recorded by orchestrating agent | Merged from worktree on successful merge | `npx murmur8 history --cost` |
| **Batch summary** (total duration, feature outcomes) | N/A (single feature) | Recorded at batch completion | `npx murmur8 history` |
| **Success/failure status** | Recorded per run | Recorded per feature + batch | `npx murmur8 history --stats` |
| **Retry attempts & strategies** | Recorded on failure | Merged from worktree on successful merge | `npx murmur8 insights --failures` |
| **Bottleneck analysis** | Derived from history | Derived from history | `npx murmur8 insights --bottlenecks` |
| **Smart retry recommendations** | Used live during pipeline | Used live during pipeline | Automatic on failure |
| **Diff preview** | Shown before commit | Shown per worktree before merge | Interactive during pipeline |

**How worktree history merging works:** When `npx murmur8 murm` runs, each feature pipeline executes `/implement-feature` inside an isolated git worktree. The skill records per-stage data to `.claude/pipeline-history.json` within that worktree. After a successful merge, murmur8 reads this file and appends its entries to the main project's history before cleaning up the worktree. Failed/conflicted worktrees preserve their history for debugging.

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
│   ├── prompts/                   # Self-contained runtime prompts (v4.4)
│   │   ├── TEMPLATE.md
│   │   ├── alex-runtime.md
│   │   ├── cass-runtime.md
│   │   ├── nigel-runtime.md
│   │   ├── codey-plan-runtime.md
│   │   ├── codey-implement-runtime.md
│   │   ├── skill-murm-mode.md     # Murmuration steps (loaded on demand)
│   │   └── skill-error-recovery.md # Error handling (loaded on failure)
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

All agents follow strict guardrails enforced via inlined rules in each self-contained runtime prompt. The authoritative source is `.blueprint/agents/GUARDRAILS.md`, with critical rules inlined directly into agent prompts so sub-agents never need to load external files at runtime.

| Guardrail | Description |
|-----------|-------------|
| **Source Restrictions** | Only use provided inputs (specs, code, business_context) |
| **Prohibited Sources** | No social media, forums, external APIs, training data for domain facts |
| **Assumption Labeling** | All assumptions must be explicitly labeled |
| **Confidentiality** | Business context treated as confidential |
| **Escalation Protocol** | Clear rules for when to ask vs assume — flag ambiguity, don't guess |

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

## Token Efficiency (v4.4)

The pipeline is optimised to operate within strict token limits (4096 output, 1024 thinking per sub-agent):

| Optimization | Impact | Description |
|--------------|--------|-------------|
| **Self-contained prompts** | ~660 lines/call eliminated | Agents never read full specs, guardrails, manifesto, or rituals at runtime |
| **Trusted handoff chain** | ~200-400 tokens/call saved | Each agent reads only the upstream handoff + its immediate inputs |
| **Split Nigel** | Prevents truncation | Test spec and executable tests are separate atomic calls |
| **Orchestrator-driven Codey** | Prevents truncation | One Task per implementation step instead of monolithic implement call |
| **Feedback micro-Tasks** | ~50 output tokens each | Separate review calls don't consume the main agent's output budget |
| **Hybrid SKILL.md** | 48% smaller | Murmuration and error recovery loaded on demand, not always |
| **Strict plan format** | Zero parsing overhead | Machine-parseable one-liner per step, orchestrator splits on regex |
| **Smart Story Routing** | ~25,000-40,000 tokens | Skip Cass for technical features |
| **Lazy Business Context** | Variable | Only loaded when feature spec references it |

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

## Pipeline Telemetry

An opt-in audit and data collection layer. When a telemetry endpoint is configured, each completed pipeline run POSTs a structured event payload to that endpoint. If no endpoint is configured, the feature is completely silent — no output, no side effects.

### Activation

The `murmur8 init` command creates a `.env` file at your project root with a commented-out telemetry template:

```bash
# Remove # to enable
MURMUR8_TELEMETRY_URL=https://your-ingest-endpoint.com/events
MURMUR8_TELEMETRY_KEY=your-api-key   # optional — sent as Authorization: Bearer
```

Do not quote the values. `.env` is not a shell script, so `MURMUR8_TELEMETRY_KEY="abc"` used to send the quotes as part of the key and got a 401 back. From v4.7.14 surrounding quotes, an `export ` prefix and trailing `# comments` are all stripped, but unquoted values remain the clearest form.

Real environment variables take precedence over `.env`, making it straightforward to configure in CI/CD without storing credentials in files. `.env` is automatically added to `.gitignore` during init.

### What gets sent

| Field | Description |
|-------|-------------|
| `runId` | UUID v4 unique to this pipeline execution |
| `featureId` | UUID stable across retries — written into FEATURE_SPEC.md frontmatter once by Alex |
| `identity` | Git user name/email, repo remote URL, org ID, murmur8 version |
| `run` | Slug, status, start/end timestamps, per-stage timings and statuses, feedback ratings |
| `featureSpec` | The FEATURE_SPEC.md body, as plain UTF-8 text |
| `stories` | `[{ title, content }, …]` — one entry per story file, as plain text |

`run` is the object actually posted; `featureSpec` and `stories` are fields on it. `runId` is a client-side correlation id for local history — the endpoint mints its own id and ignores it.

`featureId` enables cross-run correlation: all retries of the same feature share one `featureId` while each execution gets a unique `runId`. This lets you query "all runs ever attempted for this feature" and trace evolution over time.

### Reliability

Sends are non-blocking and never interrupt the pipeline, but they are **not silent about failure**. On a network error, timeout or non-2xx response, the reason is written to stderr — including the status code and the response body — and the payload is queued to `.claude/telemetry-failed.json`:

```
[murmur8] telemetry NOT recorded: HTTP 401 — {"error":"invalid api key"} — queued for retry
```

Queued runs are redelivered by pre-flight validation on the next pipeline run, or on demand:

```bash
npx murmur8 validate
# ✓ Telemetry queue: retried 2 queued run(s) — 2 delivered, 0 still queued
```

The queue holds at most 50 entries and is gitignored. Common causes: `401` means the key is wrong or was sent with quotes around it; `422` means the payload was rejected as malformed.

### Viewing configuration

```bash
npx murmur8 telemetry-config

# Example output:
# status:       active
# url:          https://your-endpoint.com/events
# api key:      ****1234
# failed queue: 0 entries
```

### Enterprise use

murmur8 telemetry is designed for self-hosted enterprise endpoints — there is no central collection service. Each organisation configures its own ingest URL. This enables:

- **Usage monitoring** — who ran what pipeline, on which repo, when
- **Audit trail** — `runId` + `commitHash` + `gitUser` provides an immutable trace of AI-assisted code changes
- **Corpus building** — aggregate feature specs and stories across teams to analyse and improve pipeline quality

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
    │  Each runs full pipeline in isolation:  │
    │  Alex → [Cass] → Nigel → Codey       │
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
