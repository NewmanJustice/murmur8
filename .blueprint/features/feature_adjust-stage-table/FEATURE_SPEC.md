---
featureId: e7c2a1f4-9d83-4b56-a2e1-7f3c8d5b4a90
---

# Feature Specification — Adjust Stage Table

## 1. Feature Intent

**Why this feature exists.**

- **Problem being addressed:** The stage breakdown table in the InsightsPanel is narrower than the stat tiles above it (`lg:col-span-2` of 3), wasting horizontal space. The stage name prefix is rendered via a CSS `border-l-2` that looks like a plain border, not the `}` glyph used in the console. The table only shows `Avg Duration`, leaving useful aggregate columns (avg tokens, avg feedback rating) absent.
- **User need:** The dashboard should feel visually consistent — the table should span the same width as the stat tile grid — and should convey the same agent identity glyphs users see in their terminal. Adding avg tokens and avg feedback rating per stage gives users at-a-glance quality and cost signals without navigating to individual run detail pages.
- **System purpose alignment:** Aligns with observability goals; extends per-stage aggregate data already computed in `lib/insights.ts`.

---

## 2. Scope

### In Scope

1. **Table width:** Change the stage table container from `lg:col-span-2` (inside a 3-col grid) to a full-width block that matches the stat tile grid above (`grid grid-cols-2 sm:grid-cols-4` or equivalent). No other layout elements change.

2. **Agent glyph prefix:** Replace the CSS `border-l-2 pl-2` left-border treatment on stage name cells with an explicit `}` prefix string. The number of `}` characters per agent:
   - `alex` → `} Alex`
   - `cass` → `}} Cass`
   - `nigel-spec` / `nigel-tests` → `}}} nigel-spec` / `}}} nigel-tests`
   - `codey-plan` / `codey-implement` → `}}}} codey-plan` / `}}}} codey-implement`
   The existing per-agent colour class (sky / violet / amber / teal) is preserved on the cell text; only the visual prefix changes.

3. **New columns — `StageAverage` extension:**
   - **Avg Tokens:** average of `stageData.tokens` (a number stored in the stages JSONB) across all runs for that stage. Displayed as a rounded integer with comma-separator (e.g. `4,230`). `—` when no data.
   - **Avg Feedback Rating:** average of `stageData.feedback.rating` (a number 1–5) across all runs for that stage. Displayed to one decimal place (e.g. `4.2`). `—` when no data.
   Both new columns are added to `StageAverage` type, computed in `computeStageAverages`, and rendered in the table.

### Out of Scope

- Changes to any other dashboard tiles or stat cards
- Changes to the run-detail page stage cards
- Adding new data columns beyond avg tokens and avg feedback rating
- Responsive behaviour changes other than the width fix
- Changes to how `stageData.tokens` or `stageData.feedback.rating` are stored/sent

---

## 3. Actors Involved

### Dashboard Viewer (Human User)

- **Can see:** Stage table at full width alongside stat tiles; `}` glyphs with correct agent depth; avg duration, avg tokens, avg feedback rating per stage.
- **Cannot do:** Interact with the table (read-only display).

### InsightsPanel (UI Component)

- **Reads:** `StageAverage[]` from `computeStageAverages`; renders the three data columns.

### computeStageAverages (lib/insights.ts)

- **Reads:** `stageData.tokens` and `stageData.feedback.rating` from the stages JSONB per run.
- **Returns:** Extended `StageAverage` with `avgTokens: number | null` and `avgFeedbackRating: number | null`.

---

## 4. Behaviour Overview

### Stage glyph map (authoritative)

| Stage key         | Glyph prefix | Display label            |
|-------------------|--------------|--------------------------|
| `alex`            | `}`          | `} alex`                 |
| `cass`            | `}}`         | `}} cass`                |
| `nigel-spec`      | `}}}`        | `}}} nigel-spec`         |
| `nigel-tests`     | `}}}`        | `}}} nigel-tests`        |
| `codey-plan`      | `}}}}`       | `}}}} codey-plan`        |
| `codey-implement` | `}}}}`       | `}}}} codey-implement`   |
| (unknown stage)   | (no prefix)  | raw key                  |

### Column display rules

| Column              | Source field                        | Format                  | Null display |
|---------------------|-------------------------------------|-------------------------|--------------|
| Stage               | `stageKey` + glyph map              | coloured monospace text | —            |
| Avg Duration        | `stageData.durationMs`              | `formatDuration()`      | `—`          |
| Avg Tokens          | `stageData.tokens`                  | integer, comma-grouped  | `—`          |
| Avg Feedback Rating | `stageData.feedback.rating` (1–5)   | 1 decimal place         | `—`          |

### Width behaviour

The stage table `div` wrapper changes from being inside a `grid grid-cols-1 lg:grid-cols-3` with `lg:col-span-2` to a standalone block rendered at full width below the stat cards, matching the `max-w-6xl` container — i.e. it spans the same full width as the stat tile grid.

---

## 5. Files Affected

| File | Change |
|------|--------|
| `murmur8_portal/lib/insights.ts` | Extend `StageAverage` type; update `computeStageAverages` to compute `avgTokens` and `avgFeedbackRating` |
| `murmur8_portal/app/dashboard/InsightsPanel.tsx` | Remove 3-col grid wrapper; add glyph prefix helper; add two new `<th>`/`<td>` columns |

---

## 6. Change Log

| Version | Date | Author | Notes |
|---------|------|--------|-------|
| 1.0 | 2026-05-22 | Alex (interactive) | Initial spec |
