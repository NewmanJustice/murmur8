# Story 3: Normalize Stage Token Totals and Enforce Optional-Field Discipline

## User Story
As a telemetry consumer, I want deterministic token-total normalization and omission rules so payload economics are trustworthy even with partial stage data.

## Acceptance Criteria
1. Given telemetry payload assembly runs in implement Step 12 (`.claude/commands/implement-feature.md`/`SKILL.md`) or refine Step 7 (`.claude/commands/refine-feature.md`), when stage economics are normalized, then normalization is applied at those assembly boundaries without requiring transport/retry redesign.
2. Given `tokens.input` and `tokens.output` are both present and `tokens.total` is absent, when stage payload is emitted, then `tokens.total` equals `input + output`.
3. Given `tokens.input`, `tokens.output`, and explicit `tokens.total` are present and consistent, when stage payload is emitted, then the explicit `tokens.total` value is preserved.
4. Given `tokens.input`, `tokens.output`, and explicit `tokens.total` are present but inconsistent, when stage payload is emitted, then `tokens.total` is recomputed to `input + output`.
5. Given either `tokens.input` or `tokens.output` is missing, when stage payload is emitted, then `tokens.total` is omitted.
6. Given any payload stage shape, when emitted, then `tokens.total` is never emitted by itself (no `tokens.total`-only object) and missing economics fields are omitted rather than fabricated.
