---
storyId: tw-01
feature: adjust-stage-table
---

# Story: Stage Table Full-Width Layout

## User Story

As a dashboard viewer,
I want the stage breakdown table to span the full width of the dashboard,
so that the layout feels consistent with the stat tile grid above it.

## Background

The current layout wraps the stage table inside a `grid grid-cols-1 lg:grid-cols-3` container
with a `lg:col-span-2` class on the table div, making it narrower than the stat cards grid
(`grid grid-cols-2 sm:grid-cols-4`) that appears above it. This feature removes that wrapper.

## Acceptance Criteria

**Given** the InsightsPanel renders with at least one `StageAverage` entry,
**When** the dashboard page loads on a large (lg) screen,
**Then** the stage breakdown table container is NOT inside a `grid grid-cols-1 lg:grid-cols-3` wrapper div.

---

**Given** the InsightsPanel renders with at least one `StageAverage` entry,
**When** the dashboard page loads on a large (lg) screen,
**Then** the stage table container div does NOT carry the class `lg:col-span-2`.

---

**Given** the InsightsPanel renders with at least one `StageAverage` entry,
**When** the stage table container is inspected,
**Then** it renders as a standalone block-level element (no multi-column grid wrapper) directly beneath the stat cards `<div>`.

---

**Given** the stat tile grid uses `grid grid-cols-2 sm:grid-cols-4` with a `max-w-6xl` outer container,
**When** the stage table is rendered,
**Then** the table occupies the same full horizontal span as the stat tile grid (i.e. stretches to the `max-w-6xl` boundary).

---

**Given** the dashboard renders on a small (mobile) screen,
**When** the stage table is displayed,
**Then** horizontal overflow scrolling is still available (`overflow-x-auto`) so narrow screens are not broken.

## Out of Scope

- Changes to stat card layout or the `grid grid-cols-2 sm:grid-cols-4` grid itself.
- Changes to the failure callout section (previously in the 3-col grid alongside the table).
- Responsive breakpoint behaviour beyond removing the `lg:col-span-2` constraint.
- Any change to table column content — this story is layout only.
