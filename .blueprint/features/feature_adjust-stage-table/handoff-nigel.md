## Handoff Summary
**For:** Codey
**Feature:** adjust-stage-table

### Key Decisions
- Pure file-content assertions for TSX checks; direct import of `lib/insights.js` (the plain-JS mirror) for unit tests — no DOM, no build step, no ts-node.
- T-AST-03 (`overflow-x-auto`) passes pre-implementation intentionally — it's a preservation requirement.
- T-AST-10 and T-AST-11 extract the `computeStageAverages` function body via string index to avoid false positives from the global `avgFeedbackRating` computation already in the file.
- T-AST-14 checks for `avgFeedbackRating` after `stageAverages.map` to distinguish the per-stage `<td>` from the global stat card.
- `lib/insights.js` must be kept in sync with `lib/insights.ts` by Codey (same pattern as all other functions in that file).

### Files Created
- /workspaces/murmur8/murmur8_portal/test/artifacts/feature_adjust-stage-table/test-spec.md
- /workspaces/murmur8/murmur8_portal/test/feature_adjust-stage-table.test.js

### Open Questions
- None

### Critical Context

Codey must change exactly two files:

**1. `murmur8_portal/lib/insights.ts` (and its mirror `lib/insights.js`)**
- Extend `StageAverage` interface: add `avgTokens: number | null` and `avgFeedbackRating: number | null`.
- In `computeStageAverages`, for each stage key, also collect `stageData.tokens` values and `stageData.feedback.rating` values alongside durations.
  - `avgTokens`: mean of collected token numbers, rounded to nearest integer (`Math.round`). `null` when none.
  - `avgFeedbackRating`: mean of collected rating numbers, to 1 decimal (`parseFloat(mean.toFixed(1))`). `null` when none.
- Return `{ key: stageKey, avgDurationMs, avgTokens, avgFeedbackRating }` from the map.
- Mirror the identical logic in `lib/insights.js`.

**2. `murmur8_portal/app/dashboard/InsightsPanel.tsx`**
- **Layout:** Remove the `<div className="grid grid-cols-1 gap-4 lg:grid-cols-3">` wrapper around the stage table. The stage table div (with `overflow-x-auto`) should render as a standalone block directly beneath the stat cards grid.
- **Glyph prefix:** Add a glyph helper (e.g. `stageGlyph(key)`) that maps: `alex`→`}`, `cass`→`}}`, `nigel-*`→`}}}`, `codey-*`→`}}}}`, unknown→`''`. Remove `border-l-2 pl-2` from the stage name `<span>`. Replace `{key}` in the cell with `{stageGlyph(key)} {key}` (or equivalent inline template).
- **New columns:** In the `<thead>` row, add `<th>Avg Tokens</th>` and `<th>Avg Feedback Rating</th>` after `Avg Duration`. In the `<tbody>` row, destructure `avgTokens` and `avgFeedbackRating` from each `StageAverage`, and add two `<td>` cells: tokens displays `avgTokens !== null ? avgTokens.toLocaleString() : '—'`; rating displays `avgFeedbackRating !== null ? avgFeedbackRating : '—'`.
