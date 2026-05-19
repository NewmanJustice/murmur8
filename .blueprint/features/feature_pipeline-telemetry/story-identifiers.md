# Story — Run and Feature Identifiers

### User story
As a platform administrator, I want each pipeline run to carry a unique `runId` and each feature spec to carry a stable `featureId` so that I can correlate telemetry events with local history and track the same feature across multiple retries.

---

### Context / scope
- `runId`: UUID v4, generated at pipeline start (Step 5 of SKILL.md), stored in working context and in the history entry
- `featureId`: UUID v4, written into FEATURE_SPEC.md YAML frontmatter by Alex on first creation only
- Both identifiers are generated using Node.js built-in `crypto.randomUUID()` — no external library

---

### Acceptance criteria

**AC-1 — runId generated at pipeline start for every run**
- Given a pipeline run is initiated,
- When the pipeline reaches Step 5 of SKILL.md,
- Then a UUID v4 `runId` is generated and stored in the working context for use throughout that run.

**AC-2 — runId is stored in the history entry**
- Given a pipeline run completes (successfully or with failure),
- When the history entry is written to `.claude/pipeline-history.json`,
- Then the entry includes the `runId` generated at pipeline start.

**AC-3 — featureId written into FEATURE_SPEC.md frontmatter on first creation**
- Given Alex creates a new FEATURE_SPEC.md that has no YAML frontmatter `featureId`,
- When Alex writes the file,
- Then a UUID v4 `featureId` is added to the YAML frontmatter of FEATURE_SPEC.md.

**AC-4 — featureId is never regenerated if already present**
- Given FEATURE_SPEC.md already contains a `featureId` in its YAML frontmatter,
- When Alex processes the feature spec (on a re-run or update),
- Then the existing `featureId` value is preserved unchanged.

**AC-5 — runId is unique per run even for the same feature**
- Given the same feature is run twice (e.g., after a failure and retry),
- When both pipeline runs complete,
- Then each run's history entry contains a different `runId`, while both FEATURE_SPEC.md entries retain the same `featureId`.

---

### Out of scope
- Exposing `runId` in any user-visible CLI output
- User-configurable or manually set `runId` or `featureId`
- `featureId` for artifacts other than FEATURE_SPEC.md
