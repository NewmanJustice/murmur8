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

## Invocation

```bash
/implement-feature                                    # Interactive
/implement-feature "user-auth"                        # New feature
/implement-feature "user-auth" --pause-after=alex|cass|nigel|codey-plan
/implement-feature "user-auth" --no-commit
/implement-feature "user-auth" --no-feedback          # Skip feedback collection
/implement-feature "user-auth" --no-validate          # Skip pre-flight validation
/implement-feature "user-auth" --no-history           # Skip history recording
```

## Pipeline Overview

```
/implement-feature "slug"
       │
       ▼
┌─────────────────────────────────────────┐
│ 0. Pre-flight validation (validate.js)  │
│ 1. Parse args, get slug                 │
│ 2. Check system spec exists (gate)      │
│ 3. Show insights preview (insights.js)  │
│ 4. Initialize queue + history entry     │
│ 5. Route based on flags/state           │
└─────────────────────────────────────────┘
       │
       ▼
   ALEX → [feedback] → CASS → [feedback] → NIGEL → [feedback] → CODEY
       │                                                           │
       └──────────── Record timing in history.js ──────────────────┘
       │                                                           │
       └──────────── On failure: retry.js strategy ────────────────┘
       │
       ▼
   AUTO-COMMIT → Record completion in history
```

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

**On validation success:** Continue to Step 1

---

## Steps 1-5: Setup

### Step 1: Parse Arguments
Extract: `{slug}`, pause gates (`--pause-after`), `--no-commit`

### Step 2: Get Feature Slug
If not provided: Ask user, convert to slug format (lowercase, hyphens), confirm.

### Step 3: System Spec Gate
Check `{SYS_SPEC}` exists. If not: run Alex to create it, then **stop for review**.

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

**History Integration (NEW):**

Unless `--no-history` flag is set, start a history entry:

```javascript
// Conceptual - orchestrator tracks this in memory
historyEntry = {
  slug: "{slug}",
  startedAt: new Date().toISOString(),
  stages: {},
  feedback: {}
}
```

---

## Step 6: Spawn Alex Agent

**Announce:** `} Alex — creating feature spec`

**History:** Record `stages.alex.startedAt` before spawning.

Use the Task tool with `subagent_type="general-purpose"`:

**Prompt:**
```
You are Alex, the System Specification & Chief-of-Staff Agent.

Read your full specification from: .blueprint/agents/AGENT_SPECIFICATION_ALEX.md

## Your Task
Create a feature specification for "{slug}".

## Inputs (read these files)
- System Spec: .blueprint/system_specification/SYSTEM_SPEC.md
- Template: .blueprint/templates/FEATURE_SPEC.md
- Business Context: .business_context/

## Output (write this file)
Write the feature spec to: {FEAT_DIR}/FEATURE_SPEC.md

## Output Rules
- Write file incrementally (section by section if large)
- Only include sections relevant to this feature (skip empty/N/A sections)
- Reference system spec by path, don't repeat its content
- Keep Change Log to 1-2 entries max

## Completion
Brief summary (5 bullets max): intent, key behaviours, scope, story themes, tensions
```

**On completion:**
1. Verify `{FEAT_SPEC}` exists
2. **Record history:** `stages.alex = { completedAt, durationMs, status: "success" }`
3. Update queue: move feature to `cassQueue`
4. If `--pause-after=alex`: Show output path, ask user to continue

**On failure:** See [Error Handling with Retry](#error-handling-with-smart-retry)

---

## Step 6.5: Cass Feedback on Alex (NEW)

**Module:** `src/feedback.js`

Unless `--no-feedback` flag is set, collect feedback before Cass writes stories:

**Prompt addition to Cass:**
```
FIRST, before writing stories, evaluate Alex's feature spec:
- Rating (1-5): How clear and complete is the spec?
- Issues: List any problems (e.g., "missing-error-handling", "unclear-scope")
- Recommendation: "proceed" | "pause" | "revise"

Output your feedback as:
FEEDBACK: { "rating": N, "issues": [...], "recommendation": "..." }
```

**Quality Gate Check:**
- If rating < minRatingThreshold (default 3.0) OR recommendation = "pause"
- Ask user: "Cass rated Alex's spec {N}/5. Issues: {issues}. Continue anyway?"
- Options: Continue / Review spec / Abort

**Store feedback:** `feedback.cass = { about: "alex", rating, issues, recommendation }`

---

## Step 7: Spawn Cass Agent

**Announce:** ` } Cass — writing user stories`

**History:** Record `stages.cass.startedAt` before spawning.

Use the Task tool with `subagent_type="general-purpose"`:

**Prompt:**
```
You are Cass, the Story Writer Agent.

Read your full specification from: .blueprint/agents/AGENT_BA_CASS.md

## Your Task
Create user stories for feature "{slug}".

## Inputs (read these files)
- Feature Spec: {FEAT_DIR}/FEATURE_SPEC.md
- System Spec: .blueprint/system_specification/SYSTEM_SPEC.md

## Output (write these files)
Create one markdown file per user story in {FEAT_DIR}/:
- story-{story-slug}.md (e.g., story-login.md, story-logout.md)

Each story must include:
- User story in standard format
- Acceptance criteria (Given/When/Then) - max 5-7 per story
- Out of scope items (brief list)

## Output Rules
- Write ONE story file at a time, then move to next
- Keep each story focused - split large stories into multiple files
- Reference feature spec by path for shared context
- Skip boilerplate sections (session shape only if non-obvious)

## Completion
Brief summary: story count, filenames, behaviours covered (5 bullets max)
```

**On completion:**
1. Verify at least one `story-*.md` exists in `{FEAT_DIR}`
2. **Record history:** `stages.cass = { completedAt, durationMs, status: "success" }`
3. Update queue: move feature to `nigelQueue`
4. If `--pause-after=cass`: Show story paths, ask user to continue

**On failure:** See [Error Handling with Retry](#error-handling-with-smart-retry)

---

## Step 7.5: Nigel Feedback on Cass (NEW)

**Module:** `src/feedback.js`

Unless `--no-feedback` flag is set:

**Prompt addition to Nigel:**
```
FIRST, before writing tests, evaluate Cass's user stories:
- Rating (1-5): How testable are the stories?
- Issues: List any problems (e.g., "ambiguous-ac", "missing-edge-cases")
- Recommendation: "proceed" | "pause" | "revise"

Output your feedback as:
FEEDBACK: { "rating": N, "issues": [...], "recommendation": "..." }
```

**Quality Gate Check:** Same as Step 6.5

**Store feedback:** `feedback.nigel = { about: "cass", rating, issues, recommendation }`

---

## Step 8: Spawn Nigel Agent

**Announce:** `  } Nigel — building tests`

**History:** Record `stages.nigel.startedAt` before spawning.

Use the Task tool with `subagent_type="general-purpose"`:

**Prompt:**
```
You are Nigel, the Tester Agent.

Read your full specification from: .blueprint/agents/AGENT_TESTER_NIGEL.md

## Your Task
Create tests for feature "{slug}".

## Inputs (read these files)
- Stories: {FEAT_DIR}/story-*.md
- Feature Spec: {FEAT_DIR}/FEATURE_SPEC.md

## Outputs (write these files IN ORDER, one at a time)

Step 1: Write {TEST_DIR}/test-spec.md containing:
- Brief understanding (5-10 lines)
- AC → Test ID mapping table (compact)
- Key assumptions (bullet list)

Step 2: Write {TEST_FILE} containing:
- Executable tests (Jest/Node test runner)
- Group by user story
- One describe block per story, one test per AC

## Output Rules
- Write test-spec.md FIRST, then write test file
- Keep test-spec.md under 100 lines (table format, no prose)
- Tests should be self-documenting - minimal comments
- Reference story files by path in test descriptions

## Completion
Brief summary: test count, AC coverage %, assumptions (5 bullets max)
```

**On completion:**
1. Verify `{TEST_SPEC}` and `{TEST_FILE}` exist
2. **Record history:** `stages.nigel = { completedAt, durationMs, status: "success" }`
3. Update queue: move feature to `codeyQueue`
4. If `--pause-after=nigel`: Show test paths, ask user to continue

**On failure:** See [Error Handling with Retry](#error-handling-with-smart-retry)

---

## Step 8.5: Codey Feedback on Nigel (NEW)

**Module:** `src/feedback.js`

Unless `--no-feedback` flag is set:

**Prompt addition to Codey (Plan phase):**
```
FIRST, before creating the plan, evaluate Nigel's tests:
- Rating (1-5): How implementable are the tests?
- Issues: List any problems (e.g., "over-mocked", "missing-setup")
- Recommendation: "proceed" | "pause" | "revise"

Output your feedback as:
FEEDBACK: { "rating": N, "issues": [...], "recommendation": "..." }
```

**Quality Gate Check:** Same as Step 6.5

**Store feedback:** `feedback.codey = { about: "nigel", rating, issues, recommendation }`

---

## Step 9: Spawn Codey Agent (Plan)

**Announce:** `   } Codey — drafting implementation plan`

**History:** Record `stages.codeyPlan.startedAt` before spawning.

Use the Task tool with `subagent_type="general-purpose"`:

**Prompt:**
```
You are Codey, the Developer Agent.

Read your full specification from: .blueprint/agents/AGENT_DEVELOPER_CODEY.md

## Your Task
Create an implementation plan for feature "{slug}". Do NOT implement yet.

## Inputs (read these files)
- Feature Spec: {FEAT_DIR}/FEATURE_SPEC.md
- Stories: {FEAT_DIR}/story-*.md
- Test Spec: {TEST_DIR}/test-spec.md
- Tests: {TEST_FILE}

## Output (write this file)
Write implementation plan to: {FEAT_DIR}/IMPLEMENTATION_PLAN.md

Plan structure (keep concise - aim for <80 lines total):
## Summary (2-3 sentences)
## Files to Create/Modify (table: path | action | purpose)
## Implementation Steps (numbered, max 10 steps)
## Risks/Questions (bullet list, only if non-obvious)
```

**On completion:**
1. Verify `{PLAN}` exists
2. **Record history:** `stages.codeyPlan = { completedAt, durationMs, status: "success" }`
3. If `--pause-after=codey-plan`: Show plan path, ask user to continue

**On failure:** See [Error Handling with Retry](#error-handling-with-smart-retry)

---

## Step 10: Spawn Codey Agent (Implement)

**Announce:** `    } Codey — implementing feature`

**History:** Record `stages.codeyImplement.startedAt` before spawning.

Use the Task tool with `subagent_type="general-purpose"`:

**Prompt:**
```
You are Codey, the Developer Agent.

Read your full specification from: .blueprint/agents/AGENT_DEVELOPER_CODEY.md

## Your Task
Implement feature "{slug}" according to the plan.

## Inputs (read these files)
- Implementation Plan: {FEAT_DIR}/IMPLEMENTATION_PLAN.md
- Tests: {TEST_FILE}

## Process (INCREMENTAL - one file at a time)
1. Run tests: node --test {TEST_FILE}
2. For each failing test group:
   a. Identify the minimal code needed
   b. Write/edit ONE file
   c. Run tests again
   d. Repeat until group passes
3. Move to next test group

## Output Rules
- Write ONE source file at a time
- Run tests after each file write
- Keep functions small (<30 lines)
- No explanatory comments in code - code should be self-documenting

## Important
- Do NOT commit changes
- Do NOT modify test assertions unless they contain bugs

## Completion
Brief summary: files changed (list), test status (X/Y passing), blockers if any
```

**On completion:**
1. Run `npm test` to verify
2. **Record history:** `stages.codeyImplement = { completedAt, durationMs, status: "success" }`
3. Update queue: move feature to `completed`
4. Proceed to auto-commit (unless `--no-commit`)

**On failure:** See [Error Handling with Retry](#error-handling-with-smart-retry)

---

## Step 11: Auto-commit

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

---

## Step 12: Report Status & Finalize History (ENHANCED)

**Module:** `src/history.js`

Unless `--no-history` flag is set, finalize the history entry:

```javascript
historyEntry.status = "success";
historyEntry.completedAt = new Date().toISOString();
historyEntry.totalDurationMs = completedAt - startedAt;
historyEntry.commitHash = "{hash}";
// Save to .claude/pipeline-history.json
```

**Display summary:**
```
} Alex — creating feature spec       ✓
 } Cass — writing user stories       ✓
  } Nigel — building tests           ✓
   } Codey — drafting plan           ✓
    } Codey — implementing feature   ✓

## Landed
- feature_{slug}
  - Stories: N
  - Tests: N (all passing)
  - Duration: X min (avg: Y min)
  - Commit: {hash}

## Feedback Summary
- Alex spec: rated 4/5 by Cass
- Cass stories: rated 5/5 by Nigel
- Nigel tests: rated 4/5 by Codey

## Next Action
Pipeline complete. Run `npm test` to verify or `/implement-feature` for next feature.
```

---

## Error Handling with Smart Retry (ENHANCED)

**Modules:** `src/retry.js`, `src/feedback.js`, `src/insights.js`

After each agent spawn, if the Task tool returns an error or output validation fails:

### 1. Analyze Failure Context

**Check feedback chain for clues:**
```
If Cass flagged "unclear-scope" on Alex's spec
  → Likely root cause identified
  → Recommend: "add-context" strategy
```

**Check history for patterns:**
```bash
node bin/cli.js insights --failures --json
```
- If this stage has >20% failure rate, suggest alternative strategy
- If this specific issue pattern correlates with failures, mention it

### 2. Get Retry Strategy Recommendation

**Module:** `src/retry.js`

```
Strategy recommendation based on:
- Stage: {stage}
- Attempt: {attemptNumber}
- Failure rate: {rate}%
- Feedback issues: {issues}

Recommended: {strategy}
```

**Available strategies:**
| Strategy | Effect |
|----------|--------|
| `retry` | Simple retry with same prompt |
| `simplify-prompt` | Reduce scope: "Focus only on core happy path" |
| `add-context` | Include more output from previous stages |
| `reduce-stories` | Ask for fewer, more focused stories |
| `simplify-tests` | Ask for fewer, essential tests only |
| `incremental` | Implement one test at a time |

### 3. Ask User with Recommendation

```
## Stage Failed: {stage}

Feedback context: Cass flagged "unclear-scope" on Alex's spec
History: This stage fails 25% of the time
Recommended strategy: add-context

Options:
1. Retry with "add-context" strategy (recommended)
2. Retry with simple retry
3. Skip this stage (warning: missing artifacts)
4. Abort pipeline
```

### 4. Apply Strategy and Retry

If user selects a retry strategy, modify the agent prompt:

**Example: add-context strategy**
```
[Original prompt]

## Additional Context (added due to retry)
Previous stage feedback indicated: "unclear-scope"
Here is additional context from earlier stages:
- System spec key points: [summary]
- Feature spec key decisions: [summary]
```

### 5. Record Failure in History

```javascript
historyEntry.stages[stage] = {
  status: "failed",
  failedAt: "...",
  attempts: N,
  lastStrategy: "add-context",
  feedbackContext: ["unclear-scope"]
};
```

**On abort:** Update queue `failed` array with:
```json
{
  "slug": "{slug}",
  "stage": "{stage}",
  "reason": "{error message}",
  "feedbackContext": ["issues from feedback chain"],
  "attemptCount": N,
  "timestamp": "{ISO timestamp}"
}
```

---

## Queue Structure

Location: `.claude/implement-queue.json`

```json
{
  "lastUpdated": "2025-02-01T12:00:00Z",
  "current": {
    "slug": "user-auth",
    "stage": "cass",
    "startedAt": "2025-02-01T11:55:00Z"
  },
  "alexQueue": [],
  "cassQueue": [{ "slug": "user-auth", "featureSpec": "..." }],
  "nigelQueue": [],
  "codeyQueue": [],
  "completed": [{ "slug": "...", "testCount": 5, "commitHash": "abc123" }],
  "failed": []
}
```

---

## Recovery

Run `/implement-feature` again - reads queue and resumes from `current.stage`.

---

## Agent References

| Agent | File |
|-------|------|
| Alex | `.blueprint/agents/AGENT_SPECIFICATION_ALEX.md` |
| Cass | `.blueprint/agents/AGENT_BA_CASS.md` |
| Nigel | `.blueprint/agents/AGENT_TESTER_NIGEL.md` |
| Codey | `.blueprint/agents/AGENT_DEVELOPER_CODEY.md` |

---

## Module Integration Summary (NEW)

The pipeline integrates these murmur8 modules:

| Module | File | Integration Points |
|--------|------|-------------------|
| **validate** | `src/validate.js` | Step 0: Pre-flight checks |
| **history** | `src/history.js` | Steps 5-12: Record timing, finalize entry |
| **insights** | `src/insights.js` | Step 3.5: Preview, On failure: Analysis |
| **feedback** | `src/feedback.js` | Steps 6.5, 7.5, 8.5: Quality gates |
| **retry** | `src/retry.js` | On failure: Strategy recommendation |

### CLI Commands Available

```bash
# Pre-flight validation
npx murmur8 validate

# History management
npx murmur8 history
npx murmur8 history --stats
npx murmur8 history --all

# Pipeline insights
npx murmur8 insights
npx murmur8 insights --feedback
npx murmur8 insights --bottlenecks
npx murmur8 insights --failures

# Retry configuration
npx murmur8 retry-config
npx murmur8 retry-config set maxRetries 5

# Feedback configuration
npx murmur8 feedback-config
npx murmur8 feedback-config set minRatingThreshold 3.5
```

### Data Files Created

| File | Purpose |
|------|---------|
| `.claude/pipeline-history.json` | Execution history with timing and feedback |
| `.claude/retry-config.json` | Retry strategies and thresholds |
| `.claude/feedback-config.json` | Feedback quality gate thresholds |
| `.claude/implement-queue.json` | Pipeline queue state (existing) |
