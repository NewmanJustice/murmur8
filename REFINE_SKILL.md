# /refine-feature Skill

Refine an existing feature by conversing with Alex, then propagating changes through stories, tests, and implementation.

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

```javascript
const { linkParentRun, buildRefinementPayload } = require('./src/refine');
const lineage = linkParentRun(slug, ctx.history);
// lineage: { parentRunId, type: 'refinement', featureId }
// Include in telemetry payload alongside standard run fields
```

### Step 8: Commit (unless --no-commit)

```bash
git add .blueprint/features/feature_{slug}/ test/
git commit -m "refine({slug}): {brief description of change}

parentRunId: {lineage.parentRunId}

Co-Authored-By: Claude <noreply@anthropic.com>"
```
