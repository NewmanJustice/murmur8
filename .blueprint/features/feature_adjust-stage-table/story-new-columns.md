---
storyId: nc-01
feature: adjust-stage-table
---

# Story: Avg Tokens and Avg Feedback Rating Columns

## User Story

As a dashboard viewer,
I want to see average token usage and average feedback rating per stage in the stage table,
so that I can spot cost and quality signals at a glance without navigating to individual run pages.

## Background

`computeStageAverages` in `lib/insights.ts` currently returns `StageAverage[]` with only `key`
and `avgDurationMs`. This story extends the type with two new nullable fields and populates them
from the stages JSONB:

- `avgTokens: number | null` — average of `stageData.tokens` (a number) across all runs for the stage.
- `avgFeedbackRating: number | null` — average of `stageData.feedback.rating` (a number 1–5) across
  all runs for the stage.

`InsightsPanel.tsx` renders two new table columns — **Avg Tokens** and **Avg Feedback Rating** —
using these fields.

## Acceptance Criteria

**Given** the `StageAverage` type in `lib/insights.ts`,
**When** the type is inspected,
**Then** it declares `avgTokens: number | null` and `avgFeedbackRating: number | null` fields in addition to the existing `key` and `avgDurationMs`.

---

**Given** runs whose stages JSONB contains `stageData.tokens` numeric values for a stage,
**When** `computeStageAverages` is called,
**Then** the returned `StageAverage` for that stage has `avgTokens` equal to the arithmetic mean of those values, rounded to the nearest integer.

---

**Given** runs whose stages JSONB contains `stageData.feedback.rating` numeric values (1–5) for a stage,
**When** `computeStageAverages` is called,
**Then** the returned `StageAverage` for that stage has `avgFeedbackRating` equal to the arithmetic mean of those values to one decimal place (e.g. `4.2`).

---

**Given** no runs have a `stageData.tokens` value for a particular stage (field absent or null),
**When** `computeStageAverages` is called,
**Then** the returned `StageAverage` for that stage has `avgTokens === null`.

---

**Given** no runs have a `stageData.feedback.rating` value for a particular stage,
**When** `computeStageAverages` is called,
**Then** the returned `StageAverage` for that stage has `avgFeedbackRating === null`.

---

**Given** the InsightsPanel renders with populated `stageAverages`,
**When** the stage breakdown table header row is rendered,
**Then** it contains three `<th>` columns: `Stage`, `Avg Duration`, `Avg Tokens`, and `Avg Feedback Rating`.

---

**Given** a `StageAverage` entry where `avgTokens` is a number (e.g. `4230`),
**When** the corresponding table row renders,
**Then** the Avg Tokens cell displays the value as a comma-grouped integer string (e.g. `4,230`).

---

**Given** a `StageAverage` entry where `avgFeedbackRating` is a number (e.g. `4.2`),
**When** the corresponding table row renders,
**Then** the Avg Feedback Rating cell displays the value to one decimal place (e.g. `4.2`).

---

**Given** a `StageAverage` entry where `avgTokens` is `null`,
**When** the corresponding table row renders,
**Then** the Avg Tokens cell displays `—`.

---

**Given** a `StageAverage` entry where `avgFeedbackRating` is `null`,
**When** the corresponding table row renders,
**Then** the Avg Feedback Rating cell displays `—`.

## Out of Scope

- Changes to how `stageData.tokens` or `stageData.feedback.rating` are stored or sent from the API.
- Adding any columns beyond `avgTokens` and `avgFeedbackRating`.
- Changes to the global `avgFeedbackRating` stat card already rendered in the stat tile grid.
- Sorting or filtering the stage table by the new columns.
- Changes to the run-detail page stage cards.
