---
name: implement-feature
description: Run the Alex → Cass → Nigel → Codey pipeline using Task tool sub-agents
---

# Implement Feature Skill

## Paths

| Var | Path |
|-----|------|
| `{SYS_SPEC}` | `.blueprint/system_specification/SYSTEM_SPEC.md` |
| `{FEAT_DIR}` | `.blueprint/features/feature_{slug}` |
| `{FEAT_SPEC}` | `{FEAT_DIR}/FEATURE_SPEC.md` |
| `{STORIES}` | `{FEAT_DIR}/story-*.md` |
| `{TEST_DIR}` | `./test/artifacts/feature_{slug}` |
| `{TEST_SPEC}` | `{TEST_DIR}/test-spec.md` |
| `{TEST_FILE}` | `./test/feature_{slug}.test.js` |
| `{PLAN}` | `{FEAT_DIR}/IMPLEMENTATION_PLAN.md` |
| `{QUEUE}` | `.claude/implement-queue.json` |
| `{HISTORY}` | `.claude/pipeline-history.json` |
| `{RETRY_CONFIG}` | `.claude/retry-config.json` |
| `{FEEDBACK_CONFIG}` | `.claude/feedback-config.json` |
| `{COST_CONFIG}` | `.claude/cost-config.json` |
| `{HANDOFF_ALEX}` | `{FEAT_DIR}/handoff-alex.md` |
| `{HANDOFF_CASS}` | `{FEAT_DIR}/handoff-cass.md` |
| `{HANDOFF_NIGEL}` | `{FEAT_DIR}/handoff-nigel.md` |
| `{BACKLOG}` | `.blueprint/features/BACKLOG.md` |

## Invocation

```bash
/implement-feature "slug"                              # Single feature
/implement-feature "slug" --pause-after=alex|cass|nigel|codey-plan
/implement-feature "slug" --no-commit|--no-feedback|--no-validate|--no-history|--no-diff-preview
/implement-feature "slug" --interactive                # Force interactive spec creation
/implement-feature feat-a feat-b feat-c               # Multiple → murmuration mode
```

## Pipeline Flow

```
ALEX → [feedback] → CASS → [feedback] → NIGEL(spec) → NIGEL(tests) → [feedback] → CODEY(plan) → CODEY(steps) → DIFF-PREVIEW → COMMIT
```

On failure at any stage: load `.blueprint/prompts/skill-error-recovery.md`
Multiple slugs: load `.blueprint/prompts/skill-murm-mode.md`

## Output Constraints (CRITICAL)

**All agents MUST follow these rules to avoid token limit errors:**

1. **Write files incrementally** - Write each file separately, never combine multiple files in one response
2. **Keep summaries brief** - Final completion summaries should be 5-10 bullet points max
3. **Reference, don't repeat** - Use file paths instead of quoting content from other artifacts
4. **One concern per file** - Don't merge unrelated content into single large files
5. **Chunk large files** - If a file would exceed ~200 lines, split into logical parts

---

## Step 0: Pre-flight Validation (NEW)

**Module:** `src/validate.js`

Unless `--no-validate` flag is set:

```bash
# Run validation checks
node bin/cli.js validate
```

**Checks performed:**
- Required directories exist (`.blueprint/`, `.business_context/`)
- System spec exists
- All 4 agent spec files present
- Business context has content
- Skills installed
- Node.js version >= 18

**On validation failure:**
- Show which checks failed with fix suggestions
- Ask user: "Fix issues and retry?" or "Continue anyway?" or "Abort"

**On validation success:** Continue to Step 1 (or Step M0 if multiple slugs)

---

## Murmuration Mode (Multi-Feature)

**Trigger:** More than one slug provided in arguments.

**Load full instructions:** Read `.blueprint/prompts/skill-murm-mode.md` before proceeding.

**Summary:** Creates git worktrees for isolation, spawns parallel Task sub-agents (one per feature), merges successful features, preserves failures for debugging.

---

## Steps 1-5: Setup (Single-Feature Mode)

### Step 1: Parse Arguments
Extract: `{slug}`, pause gates (`--pause-after`), `--no-commit`

### Step 2: Get Feature Slug
If not provided: Ask user, convert to slug format (lowercase, hyphens), confirm.

### Step 3: System Spec Gate
Check `{SYS_SPEC}` exists. If not: run Alex to create it, then **stop for review**.

### Step 3a: Interactive Mode Detection

**Module:** `src/interactive.js`

Enters interactive mode when: `--interactive` flag is set, or system/feature spec is missing.
Commands: `/approve`, `/change <feedback>`, `/skip`, `/restart`, `/abort`, `/done`
Minimum sections: Feature spec needs Intent, Scope, Actors. System spec needs Purpose, Actors, Boundaries.

### Step 3.5: Insights Preview (NEW)

**Module:** `src/insights.js`

Unless `--no-history` flag is set, show pipeline insights:

```bash
node bin/cli.js insights --json 2>/dev/null
```

**Display to user:**
- Recent success rate (e.g., "Last 10 runs: 85% success")
- Estimated duration (e.g., "Estimated: ~12 min based on history")
- Any warnings (e.g., "Note: Nigel stage has 30% failure rate recently")

If no history exists, skip this step silently.

### Step 4: Route
- Slug exists at `{FEAT_DIR}` → ask: continue from last state or restart
- No slug → new feature pipeline

### Step 5: Initialize
Create/read `{QUEUE}`. Ensure dirs exist: `mkdir -p {FEAT_DIR} {TEST_DIR}`

Unless `--no-history`, note the pipeline start time (ISO 8601 UTC) in your working context as `PIPELINE_START`.

---

## Step 6: Spawn Alex Agent

**Announce:** `} Alex — creating feature spec`

**History:** Note `ALEX_START` (ISO 8601 UTC) before spawning.

**Runtime prompt:** `.blueprint/prompts/alex-runtime.md`

Use the Task tool with `subagent_type="general-purpose"`:

**Prompt:**
```
You are Alex, the System Specification Agent.

## Task

Create a feature specification for "{slug}" that translates system intent into a bounded, reviewable unit.

## Inputs (read these files)
- System Spec: .blueprint/system_specification/SYSTEM_SPEC.md
- Template: .blueprint/templates/FEATURE_SPEC.md
- Business Context: .business_context/

## Outputs (write these files)
1. Write the feature spec to: {FEAT_DIR}/FEATURE_SPEC.md
2. Write handoff summary to: {FEAT_DIR}/handoff-alex.md

## Handoff Summary Format
```markdown
## Handoff Summary
**For:** Cass
**Feature:** {slug}

### Key Decisions
- (1-5 bullets: key architectural/scope decisions)

### Files Created
- {FEAT_DIR}/FEATURE_SPEC.md

### Open Questions
- (List any unresolved questions, or "None")

### Critical Context
(Brief context Cass needs to write stories effectively)
```

## Rules
- Write feature spec FIRST, then write handoff summary
- Reference system spec by path, do not repeat its content
- Keep Change Log to 1-2 entries max
- Flag ambiguities explicitly rather than guessing
- Ensure feature aligns with system boundaries
- Make inferred interpretations explicit
- Handoff summary must be under 30 lines

## Completion
Brief summary (5 bullets max): intent, key behaviours, scope, story themes, tensions

```

**On completion:**
1. Verify `{FEAT_SPEC}` and `{FEAT_DIR}/handoff-alex.md` exist
2. Note `ALEX_END` and compute `ALEX_DURATION_MS`
3. Update queue: move feature to `cassQueue`
4. If `--pause-after=alex`: Show output path, ask user to continue

**On failure:** See [Error Handling with Retry](#error-handling-with-smart-retry)

---

## Step 6.5: Feedback — Cass Reviews Alex

**Module:** `src/feedback.js`

Unless `--no-feedback` flag is set, spawn a micro-Task for quality assessment:

Use the Task tool with `subagent_type="general-purpose"`:

**Prompt:**
```
You are Cass, reviewing Alex's feature specification for "{slug}".

Read: {FEAT_DIR}/FEATURE_SPEC.md

Rate the spec 1-5 on: clarity of intent, scope boundaries, testability of behaviours.
List any issues (e.g., unclear-scope, missing-actors, ambiguous-rules).
Recommend: proceed | pause | revise.

Output ONLY this line:
FEEDBACK: {"rating":N,"issues":["..."],"rec":"proceed|pause|revise"}
```

**Quality Gate Check:**
- If rating < minRatingThreshold (default 3.0) OR recommendation = "pause"
- Ask user: "Cass rated Alex's spec {N}/5. Issues: {issues}. Continue anyway?"
- Options: Continue / Review spec / Abort

**Store feedback:** `feedback.cass = { about: "alex", rating, issues, recommendation }`

---

## Step 7: Spawn Cass Agent

**Announce:** ` } Cass — writing user stories`

**History:** Note `CASS_START` (ISO 8601 UTC) before spawning.

**Runtime prompt:** `.blueprint/prompts/cass-runtime.md`

Use the Task tool with `subagent_type="general-purpose"`:

**Prompt:**
```
You are Cass, the Story Writer Agent.

## Task

Create user stories for feature "{slug}" with explicit, testable acceptance criteria.

## Inputs (read these files)
- Handoff Summary: {FEAT_DIR}/handoff-alex.md
- Feature Spec: {FEAT_DIR}/FEATURE_SPEC.md

## Outputs (write these files)
1. Create one markdown file per user story in {FEAT_DIR}/:
   - story-{story-slug}.md (e.g., story-login.md, story-logout.md)
2. Write handoff summary to: {FEAT_DIR}/handoff-cass.md

Each story must include:
- User story in standard format (As a... I want... so that...)
- Acceptance criteria (Given/When/Then) - max 5-7 per story
- Out of scope items (brief list)

## Handoff Summary Format
```markdown
## Handoff Summary
**For:** Nigel
**Feature:** {slug}

### Key Decisions
- (1-5 bullets: story structure decisions, AC approach)

### Files Created
- {FEAT_DIR}/story-*.md (list each file)

### Open Questions
- (List any unresolved questions, or "None")

### Critical Context
(Brief context Nigel needs to write tests effectively)
```

## Rules
- Write ONE story file at a time, then move to next
- Write handoff summary LAST after all stories complete
- Keep each story focused — split large stories into multiple files
- Make routing explicit (Previous, Continue, conditional paths)
- Do not guess policy detail without flagging assumptions
- Avoid implicit behaviour — all routes must be explicit
- Handoff summary must be under 30 lines

## Completion
Brief summary: story count, filenames, behaviours covered (5 bullets max)

```

**On completion:**
1. Verify at least one `story-*.md` exists in `{FEAT_DIR}`
2. Verify `{FEAT_DIR}/handoff-cass.md` exists
2. Note `CASS_END` and compute `CASS_DURATION_MS`
3. Update queue: move feature to `nigelQueue`
4. If `--pause-after=cass`: Show story paths, ask user to continue

**On failure:** See [Error Handling with Retry](#error-handling-with-smart-retry)

---

## Step 7.5: Feedback — Nigel Reviews Cass

**Module:** `src/feedback.js`

Unless `--no-feedback` flag is set, spawn a micro-Task:

**Prompt:**
```
You are Nigel, reviewing Cass's user stories for "{slug}".

Read: {FEAT_DIR}/story-*.md

Rate the stories 1-5 on: testability of ACs, explicitness of routes, coverage of edge cases.
List any issues (e.g., ambiguous-ac, implicit-routing, missing-edge-case).
Recommend: proceed | pause | revise.

Output ONLY this line:
FEEDBACK: {"rating":N,"issues":["..."],"rec":"proceed|pause|revise"}
```

**Quality Gate Check:** Same as Step 6.5

**Store feedback:** `feedback.nigel = { about: "cass", rating, issues, recommendation }`

---

## Step 8: Spawn Nigel Agent

**Announce:** `  } Nigel — building test spec`

**History:** Note `NIGEL_SPEC_START` (ISO 8601 UTC) before spawning.

**Runtime prompt:** `.blueprint/prompts/nigel-runtime.md`

### Step 8a: Nigel — Test Spec & Handoff

Use the Task tool with `subagent_type="general-purpose"`:

**Prompt:**
```
You are Nigel, the Tester Agent.

## Task

Create a test specification for feature "{slug}" that maps acceptance criteria to test cases and provides a stable contract for implementation.

## Inputs (read these files)
- Handoff Summary: {FEAT_DIR}/handoff-cass.md (read FIRST for quick context)
- Stories: {FEAT_DIR}/story-*.md

## Outputs (write these files IN ORDER)

1. Write {TEST_DIR}/test-spec.md containing:
   - Brief understanding (5-10 lines)
   - AC to Test ID mapping table (compact)
   - Key assumptions (bullet list)

2. Write handoff summary to: {FEAT_DIR}/handoff-nigel.md

## Handoff Summary Format
## Handoff Summary
**For:** Codey
**Feature:** {slug}

### Key Decisions
- (1-5 bullets: test approach, mocking strategy, coverage focus)

### Files to Create
- {TEST_DIR}/test-spec.md (written)
- {TEST_FILE} (next step)

### Test Structure
- (describe block names and test counts per story)

### Open Questions
- (List any unresolved questions, or "None")

### Critical Context
(Brief context Codey needs to implement effectively)

## Rules
- Write test-spec.md FIRST, then handoff summary
- Keep test-spec.md under 100 lines using table format
- Focus on externally observable behaviour
- Label assumptions explicitly: `ASSUMPTION: [statement]`
- Handoff summary must be under 30 lines

## Completion
Brief summary: test case count planned, AC coverage %, assumptions (5 bullets max)
```

**On completion:**
1. Verify `{TEST_SPEC}` and `{FEAT_DIR}/handoff-nigel.md` exist
2. Note `NIGEL_SPEC_END` and compute `NIGEL_SPEC_DURATION_MS`

**On failure:** See [Error Handling with Retry](#error-handling-with-smart-retry)

---

### Step 8b: Nigel — Executable Tests

**Announce:** `  } Nigel — writing executable tests`

**History:** Note `NIGEL_TESTS_START` (ISO 8601 UTC) before spawning.

Use the Task tool with `subagent_type="general-purpose"`:

**Prompt:**
```
You are Nigel, the Tester Agent.

## Task

Write executable tests for feature "{slug}" based on the test specification.

## Inputs (read these files)
- Test Spec: {TEST_DIR}/test-spec.md
- Stories: {FEAT_DIR}/story-*.md (for AC detail)

## Outputs

Write {TEST_FILE} containing:
- Executable tests using the project's test runner (see `.claude/stack-config.json`)
- One describe block per story
- One test per acceptance criterion
- If more than 8 test cases: split into {TEST_FILE} and test/feature_{slug}-edge.test.js

## Rules
- Tests should be self-documenting with minimal comments
- Reference story files by path in test descriptions
- Make failure states meaningful with expected error messages
- Focus on externally observable behaviour
- Deterministic tests (avoid flaky patterns)
- Cover boundaries: min/max, empty/null, invalid formats

## Completion
Brief summary: test count, file(s) written, any tests deferred
```

**On completion:**
1. Verify `{TEST_FILE}` exists
2. Note `NIGEL_TESTS_END` and compute `NIGEL_TESTS_DURATION_MS`
3. Update queue: move feature to `codeyQueue`
4. If `--pause-after=nigel`: Show test paths, ask user to continue

**On failure:** See [Error Handling with Retry](#error-handling-with-smart-retry)

---

## Step 8.5: Feedback — Codey Reviews Nigel

**Module:** `src/feedback.js`

Unless `--no-feedback` flag is set, spawn a micro-Task:

**Prompt:**
```
You are Codey, reviewing Nigel's tests for "{slug}".

Read: {TEST_FILE}
Read: {TEST_DIR}/test-spec.md

Rate the tests 1-5 on: implementability, clarity of assertions, appropriate mocking level.
List any issues (e.g., over-mocked, untestable-assertion, missing-setup).
Recommend: proceed | pause | revise.

Output ONLY this line:
FEEDBACK: {"rating":N,"issues":["..."],"rec":"proceed|pause|revise"}
```

**Quality Gate Check:** Same as Step 6.5

**Store feedback:** `feedback.codey = { about: "nigel", rating, issues, recommendation }`

---

## Step 9: Spawn Codey Agent (Plan)

**Announce:** `   } Codey — drafting implementation plan`

**History:** Note `CODEY_PLAN_START` (ISO 8601 UTC) before spawning.

**Runtime prompt:** `.blueprint/prompts/codey-plan-runtime.md`

Use the Task tool with `subagent_type="general-purpose"`:

**Prompt:**
```
You are Codey, the Developer Agent.

## Task

Create an implementation plan for feature "{slug}". Do NOT implement yet - planning only.

## Inputs (read these files)
- Handoff Summary: {FEAT_DIR}/handoff-nigel.md
- Test Spec: {TEST_DIR}/test-spec.md
- Tests: {TEST_FILE}

## Outputs (write this file)
Write implementation plan to: {FEAT_DIR}/IMPLEMENTATION_PLAN.md

Plan structure (aim for under 60 lines total):

```markdown
## Summary
(2-3 sentences: what this implements and the approach)

## Steps
1. [{file_path}] {CREATE|MODIFY} — {purpose} | Tests: {T-IDs}
2. [{file_path}] {CREATE|MODIFY} — {purpose} | Tests: {T-IDs}
3. [{file_path}] {CREATE|MODIFY} — {purpose} | Tests: {T-IDs}
...

## Risks
- (only if non-obvious, otherwise omit section)
```

**CRITICAL FORMAT:** Each step MUST be exactly one line matching:
`N. [path/to/file.ext] ACTION — description | Tests: T-X.Y, T-X.Z`

This format is machine-parsed by the orchestrator. Do not deviate.

## Rules
- Do NOT write implementation code in this phase
- Keep plan concise — one line per step, max 10 steps
- Order steps to make tests pass incrementally
- Each step targets a single file and specific test IDs
- Prefer editing existing files over creating new ones

## Completion
Brief summary: files planned, step count, identified risks

```

**On completion:**
1. Verify `{PLAN}` exists
2. Note `CODEY_PLAN_END` and compute `CODEY_PLAN_DURATION_MS`
3. If `--pause-after=codey-plan`: Show plan path, ask user to continue

**On failure:** See [Error Handling with Retry](#error-handling-with-smart-retry)

---

## Step 10: Spawn Codey Agent (Implement) — Orchestrator-Driven Loop

**Announce:** `    } Codey — implementing feature`

**History:** Note `CODEY_IMPL_START` (ISO 8601 UTC) before spawning.

**Runtime prompt:** `.blueprint/prompts/codey-implement-runtime.md`

### Orchestrator Reads the Plan

Before spawning Codey, the orchestrator reads `{PLAN}` and extracts the numbered steps. Each step becomes a separate, atomic Task call.

**Parsing:** Each step line matches: `N. [file_path] ACTION — description | Tests: T-IDs`
Extract: step number, file path, action (CREATE/MODIFY), description, and test IDs.

**Process:**
1. Read `{FEAT_DIR}/IMPLEMENTATION_PLAN.md`
2. Parse lines matching `^\d+\. \[` under `## Steps`
3. For each parsed step, spawn a Codey Task with the step details
4. After each step, run the mapped tests to verify
5. If a step fails after retry, stop and report

### Per-Step Task Prompt Template

For each implementation step N, use the Task tool with `subagent_type="general-purpose"`:

**Prompt:**
```
You are Codey, the Developer Agent.

## Task

Implement step {N} of the plan for feature "{slug}":

> {paste the exact step text from IMPLEMENTATION_PLAN.md}

## Context
- Tests: {TEST_FILE}
- Plan: {FEAT_DIR}/IMPLEMENTATION_PLAN.md (for reference only)
- This step should make these tests pass: {test names from plan, if mapped}

## Process
1. Write or edit the file(s) specified in this step
2. Run tests: node --test {TEST_FILE}
3. If tests for this step fail, fix and re-run

## Rules
- Write ONE source file at a time
- Keep functions small (under 30 lines)
- Code should be self-documenting, minimal comments
- Do NOT commit changes
- Do NOT modify test assertions unless they contain bugs
- Only implement what this step requires — nothing more

## Completion
Report: file(s) changed, test status (X/Y passing), any blockers
```

### Orchestrator Loop Logic

```
for each step in IMPLEMENTATION_PLAN.steps:
  announce: "    } Codey — step {N}: {step summary}"
  spawn Task(step prompt)
  if success:
    record stages.codeyStep{N} timing
    continue
  if failure:
    attempt retry (see Error Handling)
    if still fails: stop, report partial progress
```

**On all steps complete:**
1. Run full test suite: `node --test {TEST_FILE}`
2. Note `CODEY_IMPL_END`, compute `CODEY_IMPL_DURATION_MS`, and note `STEPS_COMPLETED`
3. Update queue: move feature to `completed`
4. Proceed to auto-commit (unless `--no-commit`)

**On partial failure:**
1. Record which steps completed and which failed
2. Note partial completion: `STEPS_COMPLETED=M`, `TOTAL_STEPS=N`, `FAILED_AT_STEP=step`
3. Report to user with option to continue manually

**On failure:** See [Error Handling with Retry](#error-handling-with-smart-retry)

---

## Step 10.5: Diff Preview

**Module:** `src/diff-preview.js`

**Skip if:** `--no-commit`, `--no-diff-preview`, `--yes`, or no changes detected.

Show added/modified/deleted file summary. User chooses: `[c]ommit` / `[a]bort` / `[d]iff`.
On abort: record `status: "user-aborted"` in history, clean exit (not a failure).

---

## Step 11: Auto-commit & Backlog Cleanup

If not `--no-commit`:

```bash
git add {FEAT_DIR}/ {TEST_DIR}/ {TEST_FILE}
# Add any implementation files created by Codey
git status --short
```

Commit message:
```
feat({slug}): Add {slug} feature

Artifacts:
- Feature spec by Alex
- User stories by Cass
- Tests by Nigel
- Implementation by Codey

Co-Authored-By: Claude <noreply@anthropic.com>
```

### Remove from Backlog

After commit, remove the slug's row from `{BACKLOG}` (if it exists). Stage with the commit.

---

## Step 12: Report Status & Finalize History (ENHANCED)

**Modules:** `src/history.js`, `src/cost.js`

Unless `--no-history` flag is set, build the history entry JSON from the timestamps noted during the run and write it via the CLI:

```bash
node bin/cli.js history record '{
  "slug": "{slug}",
  "status": "success",
  "startedAt": "<PIPELINE_START>",
  "completedAt": "<now ISO 8601>",
  "totalDurationMs": <elapsed ms>,
  "commitHash": "<hash or null>",
  "stages": {
    "alex":             { "startedAt": "<ALEX_START>",        "completedAt": "<ALEX_END>",        "durationMs": <ALEX_DURATION_MS>,        "status": "success" },
    "cass":             { "startedAt": "<CASS_START>",        "completedAt": "<CASS_END>",        "durationMs": <CASS_DURATION_MS>,        "status": "success" },
    "nigel-spec":       { "startedAt": "<NIGEL_SPEC_START>",  "completedAt": "<NIGEL_SPEC_END>",  "durationMs": <NIGEL_SPEC_DURATION_MS>,  "status": "success" },
    "nigel-tests":      { "startedAt": "<NIGEL_TESTS_START>", "completedAt": "<NIGEL_TESTS_END>", "durationMs": <NIGEL_TESTS_DURATION_MS>, "status": "success" },
    "codey-plan":       { "startedAt": "<CODEY_PLAN_START>",  "completedAt": "<CODEY_PLAN_END>",  "durationMs": <CODEY_PLAN_DURATION_MS>,  "status": "success" },
    "codey-implement":  { "startedAt": "<CODEY_IMPL_START>",  "completedAt": "<CODEY_IMPL_END>",  "durationMs": <CODEY_IMPL_DURATION_MS>,  "status": "success", "stepsCompleted": <N> }
  }
}'
```

Omit stages that were skipped (e.g. cass when `--skip-stories` was used). Set `status` to `"failed"` and add `"failedStage": "<stage>"` on failure, or `"paused"` and `"pausedAfter": "<stage>"` on pause.

Then send telemetry (fire-and-forget, silent on success or failure):

```bash
node -e "
const path = require('path');
const { loadConfig, buildPayload, generateRunId, resolveGitContext, ensureFeatureId, sendTelemetry } = require(path.join(process.cwd(), 'src/telemetry'));
const config = loadConfig(path.join(process.cwd(), '.env'));
// config reads MURMUR8_TELEMETRY_URL and MURMUR8_TELEMETRY_KEY from .env / process.env
if (!config.url) process.exit(0);
const { gitHubUser, repoName } = resolveGitContext(process.cwd());
const specPath = '.blueprint/features/feature_{slug}/FEATURE_SPEC.md';
let featureId = null;
try { featureId = ensureFeatureId(specPath); } catch (_) {}
const payload = buildPayload({
  runId: generateRunId(),
  featureId,
  slug: '{slug}',
  type: 'feature',
  status: '<STATUS>',
  startedAt: '<PIPELINE_START>',
  completedAt: new Date().toISOString(),
  totalDurationMs: <TOTAL_MS>,
  gitHubUser,
  repoName,
  stages: {
    alex:            { startedAt: '<ALEX_START>',        completedAt: '<ALEX_END>',        durationMs: <ALEX_DURATION_MS>,        status: 'success' },
    cass:            { startedAt: '<CASS_START>',        completedAt: '<CASS_END>',        durationMs: <CASS_DURATION_MS>,        status: 'success' },
    'nigel-spec':    { startedAt: '<NIGEL_SPEC_START>',  completedAt: '<NIGEL_SPEC_END>',  durationMs: <NIGEL_SPEC_DURATION_MS>,  status: 'success' },
    'nigel-tests':   { startedAt: '<NIGEL_TESTS_START>', completedAt: '<NIGEL_TESTS_END>', durationMs: <NIGEL_TESTS_DURATION_MS>, status: 'success' },
    'codey-plan':    { startedAt: '<CODEY_PLAN_START>',  completedAt: '<CODEY_PLAN_END>',  durationMs: <CODEY_PLAN_DURATION_MS>,  status: 'success' },
    'codey-implement':{ startedAt: '<CODEY_IMPL_START>', completedAt: '<CODEY_IMPL_END>',  durationMs: <CODEY_IMPL_DURATION_MS>,  status: 'success' },
  },
});
sendTelemetry(payload, { url: config.url, key: config.key }).catch(() => {});
" 2>/dev/null || true
```

**Display summary:** Stage status (✓/✗), test count, duration, commit hash, feedback ratings, cost breakdown per stage.

---

## Error Handling & Recovery

**Load full instructions on failure:** Read `.blueprint/prompts/skill-error-recovery.md`

**Summary:** On stage failure, analyze feedback chain + history patterns, recommend a retry strategy (retry, simplify-prompt, add-context, reduce-stories, simplify-tests, incremental), ask user, apply modified prompt, record outcome.

**Recovery:** Run `/implement-feature` again — reads queue and resumes from `current.stage`.
