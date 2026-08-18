# /refine-feature Skill

Refine an existing feature by conversing with Alex, then propagating changes through stories, tests, and implementation.

## Execution Contract

**You MUST execute ALL steps in sequence through to Step 8 (telemetry + commit).**
Do not stop after implementation. The pipeline is not complete until Step 8 runs.

## Invocation

```bash
/refine-feature [slug]
/refine-feature "user-auth"             # Refine a specific feature
/refine-feature "user-auth" --no-commit # Skip auto-commit
```

## When to Use

Use `/refine-feature` after `/implement-feature` when:
- The implementation doesn't match your intent
- Requirements changed since the original run
- Tests pass but behaviour is wrong
- You have new information that changes scope

## Pipeline

```
/refine-feature "slug"
       │
       ▼
┌────────────────────────────────────────┐
│ 1. Load context                        │
│    Read existing spec, stories, tests  │
│    and pipeline history for slug       │
└────────────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────┐
│ 2. Alex — Conversation + Spec Diff     │
│    User provides feedback (freeform)   │
│    Alex proposes spec diff             │
│    User approves or requests revision  │
│    Alex writes updated FEATURE_SPEC.md │
└────────────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────┐
│ 3. Cass — Story Propagation            │
│    (skipped for technical features)    │
│    Updates affected story files        │
│    Writes story-changes.md             │
└────────────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────┐
│ 4. Nigel — Test Propagation            │
│    Updates affected test cases         │
│    Writes test-changes.md              │
└────────────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────┐
│ *** MANDATORY PAUSE ***                │
│ User reviews: spec diff, story         │
│ changes, test changes                  │
│ Must confirm before Codey runs         │
└────────────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────┐
│ 5. Codey — Implement                   │
│    Test-first, incremental             │
│    Iterates until tests pass           │
│    Auto-commit (unless --no-commit)    │
└────────────────────────────────────────┘
```

## Rules

- **featureId is always preserved** — never changes across refinements
- **Mandatory pause before Codey** — no flag can bypass this gate
- **Cass skipped for technical features** — if no story-*.md files exist
- **Telemetry lineage** — each refinement records `parentRunId` pointing to the run being refined; `type: "refinement"`

## Telemetry Lineage

Every refinement is linked to the run it refines:

```
run-1 (original /implement-feature)
  └── run-2 (first /refine-feature, parentRunId: run-1)
        └── run-3 (second /refine-feature, parentRunId: run-2)
```

All runs share the same `featureId`. This lets you track how many refinements a feature has had and trace the full history chain.

## Implementation Prompt

You are the `/refine-feature` orchestrator.

### Step 1: Load Context

```javascript
const { loadRefinementContext, linkParentRun } = require('./src/refine');
const ctx = await loadRefinementContext(slug, process.cwd());
// ctx: { slug, featureId, spec, stories, history, lastRunStatus }
```

Display to user:
```
Feature: {slug}
Stories: {count} found
Last run: {status or "no history"}
Feature ID: {featureId}

What needs to change?
```

### Step 2: Alex — Conversation + Spec Diff

Use the Task tool with `subagent_type="general-purpose"`:

```
You are Alex, the System Specification Agent, in REFINEMENT mode.

## Context
- Feature: {slug}
- Feature ID: {featureId} (MUST be preserved)
- Current spec: {spec content}
- Stories: {story list}
- Last run status: {status}

## User Feedback
{user's freeform feedback}

## Task
1. Analyse what needs to change in the spec based on the feedback
2. Present a proposed diff (show OLD vs NEW for changed sections)
3. Wait for user approval
4. On approval: update FEATURE_SPEC.md preserving featureId in YAML frontmatter
5. Write .blueprint/features/feature_{slug}/story-changes.md listing which stories are affected and why

## Rules
- featureId MUST remain unchanged in the frontmatter
- Present diff before writing — do not write until approved
- Keep changes minimal — only what the feedback requires
- If feedback is unclear, ask a clarifying question
```

### Step 3: Cass — Story Propagation (if user-facing)

Use the Task tool with `subagent_type="general-purpose"`:

```
You are Cass, the Story Writer Agent, in REFINEMENT mode.

## Context
- Feature: {slug}
- story-changes.md: {path}

## Task
1. Read story-changes.md to understand which stories are affected
2. Update ONLY the affected story files
3. Preserve all unaffected stories as-is
4. Write a brief note at the top of each updated story: "Refined: {date} — {reason}"

## Rules
- Do NOT rewrite stories that are not in story-changes.md
- Keep acceptance criteria testable and explicit
```

### Step 4: Nigel — Test Propagation

Use the Task tool with `subagent_type="general-purpose"`:

```
You are Nigel, the Tester Agent, in REFINEMENT mode.

## Context
- Feature: {slug}
- story-changes.md: {path} (or spec diff if no stories)
- Existing tests: test/feature_{slug}.test.js

## Task
1. Identify which tests are affected by the story/spec changes
2. Update ONLY the affected test cases
3. Write test-changes.md documenting what changed and why

## Rules
- Do NOT modify tests for unaffected stories
- New test IDs must not collide with existing ones
- Write test-changes.md to .blueprint/features/feature_{slug}/
```

### Step 5: Mandatory Pause

Display to user:
```
--- Changes ready for review ---

Spec: .blueprint/features/feature_{slug}/FEATURE_SPEC.md
Stories updated: {list or "none (technical feature)"}
Tests updated: {count} test cases

Review the changes above.

Proceed with Codey implementation? [y/n]
```

**Wait for explicit "y" or "yes". No flag bypasses this.**

### Step 6: Codey — Implement

Use the Task tool with `subagent_type="general-purpose"` (same prompt as main pipeline Codey implement stage).

### Step 7: Record Telemetry

```bash
node -e "
const path = require('path');
const { loadConfig, buildPayload, generateRunId, resolveGitContext, ensureFeatureId, sendTelemetry } = require(require.resolve('murmur8/src/telemetry'));
const { loadOnLlmEndEventsFromEnv, hydrateRuntimeEnvFromOnLlmEndEvents } = require(require.resolve('murmur8/src/usage-events'));
const config = loadConfig(path.join(process.cwd(), '.env'));
// config reads MURMUR8_TELEMETRY_URL and MURMUR8_TELEMETRY_KEY from .env / process.env
if (!config.url) process.exit(0);
const { gitHubUser, repoName } = resolveGitContext(process.cwd());
const specPath = '.blueprint/features/feature_{slug}/FEATURE_SPEC.md';
let featureId = null;
try { featureId = ensureFeatureId(specPath); } catch (_) {}
const parseJsonEnv = (name) => {
  const raw = process.env[name];
  if (!raw) return undefined;
  try { return JSON.parse(raw); } catch (_) { return undefined; }
};
const hookEvents = loadOnLlmEndEventsFromEnv(process.env);
if (Array.isArray(hookEvents) && hookEvents.length > 0) {
  hydrateRuntimeEnvFromOnLlmEndEvents(hookEvents, process.env);
}
const runtimeUsageEvents = parseJsonEnv('MURMUR8_ON_LLM_END_USAGE_JSON');
const runtimeTotalCost = <RUNTIME_TOTAL_COST_OR_UNDEFINED>;
const historyTotalCost = <HISTORY_TOTAL_COST_OR_UNDEFINED>;
const resolvedTotalCost = Number.isFinite(runtimeTotalCost)
  ? runtimeTotalCost
  : (Number.isFinite(historyTotalCost) ? historyTotalCost : undefined);
const runtimeStageEconomics = <RUNTIME_STAGE_ECONOMICS_OR_UNDEFINED>;
const historyStageEconomics = <HISTORY_STAGE_ECONOMICS_OR_UNDEFINED>;
const normalizeStageTokens = (tokens) => {
  if (!tokens || typeof tokens !== 'object') return undefined;
  const input = Number.isFinite(tokens.input) ? tokens.input : undefined;
  const output = Number.isFinite(tokens.output) ? tokens.output : undefined;
  const normalized = {};
  if (input !== undefined) normalized.input = input;
  if (output !== undefined) normalized.output = output;
  if (input !== undefined && output !== undefined) {
    const total = input + output;
    normalized.total = Number.isFinite(tokens.total) && tokens.total === total ? tokens.total : total;
  }
  return Object.keys(normalized).length ? normalized : undefined;
};
const withOptionalEconomics = (stageName, stageData) => {
  const runtimeEconomics = runtimeStageEconomics?.[stageName];
  const historyEconomics = historyStageEconomics?.[stageName];
  const resolvedCost = Number.isFinite(runtimeEconomics?.cost)
    ? runtimeEconomics.cost
    : (Number.isFinite(historyEconomics?.cost) ? historyEconomics.cost : undefined);
  const resolvedTokens = normalizeStageTokens(runtimeEconomics?.tokens ?? historyEconomics?.tokens);
  return {
    ...stageData,
    ...(resolvedCost !== undefined ? { cost: resolvedCost } : {}),
    ...(resolvedTokens ? { tokens: resolvedTokens } : {}),
  };
};
const stageCandidates = {
  alex: withOptionalEconomics('alex', { startedAt: '<ALEX_START>', completedAt: '<ALEX_END>', durationMs: <ALEX_DURATION_MS>, status: 'success' }),
  cass: withOptionalEconomics('cass', { startedAt: '<CASS_START_OR_NULL>', completedAt: '<CASS_END_OR_NULL>', durationMs: <CASS_DURATION_MS_OR_NULL>, status: '<CASS_STATUS_OR_SKIPPED>' }),
  'nigel-tests': withOptionalEconomics('nigel-tests', { startedAt: '<NIGEL_TESTS_START>', completedAt: '<NIGEL_TESTS_END>', durationMs: <NIGEL_TESTS_DURATION_MS>, status: 'success' }),
  'codey-implement': withOptionalEconomics('codey-implement', { startedAt: '<CODEY_IMPL_START>', completedAt: '<CODEY_IMPL_END>', durationMs: <CODEY_IMPL_DURATION_MS>, status: 'success' }),
};
const stages = Object.fromEntries(
  Object.entries(stageCandidates).filter(([, stage]) =>
    stage &&
    stage.status !== 'skipped' &&
    typeof stage.startedAt === 'string' &&
    typeof stage.completedAt === 'string' &&
    Number.isFinite(stage.durationMs)
  )
);
const payload = buildPayload({
  runId: generateRunId(),
  featureId,
  slug: '{slug}',
  type: 'refinement',
  parentRunId: '{PARENT_RUN_ID}',
  status: 'success',
  startedAt: '<REFINE_START>',
  completedAt: new Date().toISOString(),
  totalDurationMs: <TOTAL_MS>,
  gitHubUser,
  repoName,
  commitHash: <COMMIT_HASH_OR_NULL> ?? null,
  ...(Number.isFinite(resolvedTotalCost) ? { totalCost: resolvedTotalCost } : {}),
  ...(Array.isArray(runtimeUsageEvents) ? { usageEvents: runtimeUsageEvents } : {}),
  historyStages: historyStageEconomics,
  // stages is REQUIRED by the ingestion endpoint — omitting it returns 422.
  // Emit only stages that actually executed.
  stages: stages,
});
sendTelemetry(payload, { url: config.url, key: config.key, queuePath: config.queuePath })
  .then((r) => {
    if (r.ok) { console.error('[murmur8] telemetry recorded' + (r.id ? ' (' + r.id + ')' : '')); return; }
    console.error('[murmur8] telemetry NOT recorded: ' + (r.error || 'unknown error') + (r.queued ? ' — queued for retry' : ''));
  })
  .catch((e) => console.error('[murmur8] telemetry error: ' + e.message));
" || true
```

Telemetry never fails a refinement, but it is not silent — an undelivered send warns on stderr and is queued to `.claude/telemetry-failed.json`. Do not re-add `2>/dev/null`.

**`parentRunId` caveat:** `linkParentRun()` returns the *client-side* `runId` from local history. The ingestion endpoint mints its own run id, so a client-generated `parentRunId` will not resolve server-side and the insert is rejected. Pass `{PARENT_RUN_ID}` only when it is a portal-issued id; otherwise omit it.

### Step 8: Commit (unless --no-commit)

```bash
git add .blueprint/features/feature_{slug}/ test/
git commit -m "refine({slug}): {brief description of change}

parentRunId: {lineage.parentRunId}

Co-Authored-By: Claude <noreply@anthropic.com>"
```
