# Implementation Plan — refine-feature-skill

## Summary
Create `src/refine.js` exporting 10 pure helper functions tested by Nigel's 25-test suite. Add `src/commands/refine.js` CLI handler and wire the command into `bin/cli.js` and `src/index.js`. Write `REFINE_SKILL.md` at project root.

## Files to Create/Modify

| Path | Action | Purpose |
|------|--------|---------|
| `src/refine.js` | Create | All 10 pure helper functions |
| `src/commands/refine.js` | Create | CLI handler for `murm refine` / `refine-feature` command |
| `src/index.js` | Modify | Export refine module functions |
| `bin/cli.js` | Modify | Register `refine-feature` command |
| `REFINE_SKILL.md` | Create | Skill definition for /refine-feature |

## Implementation Steps

1. **Create `src/refine.js`** — implement all 10 functions:
   - `parseRefinementArgs(argv)` → `{ slug }` from argv[3] or null
   - `loadRefinementContext(slug, baseDir)` → reads FEATURE_SPEC.md (throws if missing), story-*.md files, .claude/pipeline-history.json; extracts/writes featureId; returns `{ spec, stories, history, featureId, slug }`
   - `applySpecDiff(specPath, newContent, featureId)` → throws on null; writes spec with YAML frontmatter containing featureId
   - `buildRefinementPayload(opts)` → returns plain object with storyChangesPath, testChangesPath, specDiff, commitSkipped
   - `linkParentRun(slug, history)` → finds most recent entry for slug by completedAt; returns `{ parentRunId, type: 'refinement', featureId }`
   - `isTechnicalFeature(stories)` → returns `stories.length === 0`
   - `filterAffectedStories(stories, changedSlugs)` → filters by slug contained in filename
   - `buildStoryChanges(entries)` → returns entries array (passthrough with validation)
   - `buildChangeSummary(opts)` → returns `{ specPath, affectedStories, testChangesPath }`
   - `isPauseBypassable(_flags)` → always returns `false`

2. **Run tests** after writing src/refine.js — expect 25/25 to pass

3. **Create `src/commands/refine.js`** — CLI handler that calls loadRefinementContext and orchestrates the pipeline flow (stub-level for now; skill handles orchestration)

4. **Modify `src/index.js`** — add require + exports for refine module

5. **Modify `bin/cli.js`** — register `refine-feature` command routing to `src/commands/refine.js`

6. **Create `REFINE_SKILL.md`** — skill definition with full `/refine-feature` pipeline documented

7. **Run full test suite** — `node --test` to verify no regressions

## Key Implementation Notes

- `loadRefinementContext`: use `fs.readdirSync` to find `story-*.md` files; parse YAML frontmatter with simple regex (no deps); if no featureId in frontmatter, generate UUID v4 and write it back (same pattern as telemetry's `ensureFeatureId`)
- `applySpecDiff`: ensure YAML frontmatter block always starts the file; preserve featureId even if newContent doesn't include it
- `linkParentRun`: sort history by `completedAt` descending, take first matching slug; if no match, parentRunId = null
- UUID generation: use `crypto.randomUUID()` (Node 18+, no deps needed)
