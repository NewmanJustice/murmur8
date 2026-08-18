## Handoff Summary
**For:** Nigel
**Feature:** adjust-stage-table

### Key Decisions
- Three stories map cleanly to the three bounded changes: layout width, glyph prefix, new columns.
- Glyph map is authoritative: `}` alex, `}}` cass, `}}}` nigel-*, `}}}}` codey-*; unknown keys get no prefix.
- `border-l-2 pl-2` classes are fully removed from the stage name `<span>` — not just de-emphasised.
- `avgTokens` is rounded to nearest integer; `avgFeedbackRating` is to one decimal place — null when no data.
- Column header order: Stage | Avg Duration | Avg Tokens | Avg Feedback Rating.

### Files Created
- story-table-width.md — full-width layout, removes `lg:col-span-2` and 3-col grid wrapper
- story-agent-glyphs.md — `}` glyph prefix replaces CSS left-border treatment
- story-new-columns.md — `StageAverage` type extension + two new table columns

### Open Questions
- None

### Critical Context
Nigel needs to test two layers: (1) pure function `computeStageAverages` in `lib/insights.ts` —
feed it mock `InsightsRun[]` with varied `stages` JSONB and assert `avgTokens`/`avgFeedbackRating`
on the returned array; (2) `InsightsPanel.tsx` rendering — assert absence of `lg:col-span-2` and
`border-l-2`/`pl-2`, presence of correct glyph text, correct null/value cell display for new columns.
Source fields: `stageData.tokens` (number), `stageData.feedback.rating` (nested one level under `feedback`).
