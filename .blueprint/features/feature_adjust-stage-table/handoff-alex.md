## Handoff Summary
**For:** Cass
**Feature:** adjust-stage-table

### Key Decisions
- This is a portal UI feature — all changes are in `murmur8_portal/`, not `agent-workflow/`
- Two files change: `lib/insights.ts` (data) and `app/dashboard/InsightsPanel.tsx` (render)
- Glyph depth is authoritative: `}` alex, `}}` cass, `}}}` nigel-*, `}}}}` codey-*
- New columns (avg tokens, avg feedback rating) are computed from existing stages JSONB; no DB schema change
- `StageAverage` type needs two new nullable fields: `avgTokens` and `avgFeedbackRating`

### Files Created
- .blueprint/features/feature_adjust-stage-table/FEATURE_SPEC.md

### Open Questions
- None — scope is fully bounded by the two files above

### Critical Context
The `computeStageAverages` function in `lib/insights.ts` already iterates `stageData` per run.
`stageData.tokens` is a number field; `stageData.feedback.rating` is nested one level deeper.
The table currently lives inside `grid grid-cols-1 lg:grid-cols-3` with `lg:col-span-2` — this wrapper is removed entirely, making the table full-width.
The stage name cell currently uses `border-l-2 pl-2` (a CSS left-border visual) — this is replaced with an explicit `}` glyph prefix string.
