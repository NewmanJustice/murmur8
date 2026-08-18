---
storyId: ag-01
feature: adjust-stage-table
---

# Story: Agent Glyph Prefix in Stage Name Cell

## User Story

As a dashboard viewer,
I want each stage row to display the same `}` glyph prefix I see in my terminal,
so that I can immediately recognise agent depth without relying on colour alone.

## Background

The current stage name cell uses `border-l-2 pl-2` Tailwind classes to render a coloured
left border as a visual depth cue. This is replaced with an explicit `}` glyph string prefix
prepended to the stage key. The `stageAccentClass` per-agent colour is preserved; only the
visual prefix mechanism changes.

### Authoritative glyph map

| Stage key         | Glyph prefix | Displayed text         |
|-------------------|--------------|------------------------|
| `alex`            | `}`          | `} alex`               |
| `cass`            | `}}`         | `}} cass`              |
| `nigel-spec`      | `}}}`        | `}}} nigel-spec`       |
| `nigel-tests`     | `}}}`        | `}}} nigel-tests`      |
| `codey-plan`      | `}}}}`       | `}}}} codey-plan`      |
| `codey-implement` | `}}}}`       | `}}}} codey-implement` |
| (unknown key)     | (none)       | raw key unchanged      |

## Acceptance Criteria

**Given** a stage row with `key === 'alex'`,
**When** the stage name cell renders,
**Then** the visible text is `} alex` (one `}` plus a space plus the key).

---

**Given** a stage row with `key === 'cass'`,
**When** the stage name cell renders,
**Then** the visible text is `}} cass` (two `}` characters plus a space plus the key).

---

**Given** a stage row with `key === 'nigel-spec'` or `key === 'nigel-tests'`,
**When** the stage name cell renders,
**Then** the visible text starts with `}}} ` (three `}` characters plus a space).

---

**Given** a stage row with `key === 'codey-plan'` or `key === 'codey-implement'`,
**When** the stage name cell renders,
**Then** the visible text starts with `}}}} ` (four `}` characters plus a space).

---

**Given** a stage row with any known key,
**When** the stage name cell renders,
**Then** the `<span>` element does NOT carry the classes `border-l-2` or `pl-2`.

---

**Given** a stage row with a known key (e.g. `alex`),
**When** the stage name cell renders,
**Then** the per-agent colour class from `stageAccentClass` (e.g. `text-sky-400`) is still present on the stage name `<span>`.

---

**Given** a stage row whose key does not appear in the glyph map (unknown stage),
**When** the stage name cell renders,
**Then** the visible text is the raw stage key with no glyph prefix prepended.

## Out of Scope

- Changes to the `stageAccentClass` function or its colour assignments.
- Glyph changes on the run-detail page stage cards.
- Changes to any stage glyph rendering outside `InsightsPanel.tsx`.
