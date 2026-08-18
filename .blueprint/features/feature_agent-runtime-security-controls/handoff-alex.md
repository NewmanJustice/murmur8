## Handoff Summary
**For:** Cass
**Feature:** agent-runtime-security-controls

### Key Decisions
- Carved ONE bounded slice from a ~500-line, 37-AC source requirement: (1) workspace-root path guard for murmur8's own artifact writes, (2) secret scan on the telemetry payload before egress. Source doc §2.2–2.4 and §3.2; AC 3, 4, 5, 15, partial 6.
- All infrastructure is explicitly excluded: container profile, control plane, model transport, egress gateway, credential/operation broker, approval broker, remote audit database. Different system / deployment concern — recorded in FEATURE_SPEC §2 and §10.
- Everything in scope must ship as murmur8 JS modules testable with `node --test` — no network, no Docker, no external service, no new dependency.
- Shared `ALLOW`/`BLOCK`/`REVIEW` decision object with stable reason codes; fail closed on any internal error; `REVIEW` prompts interactively and refuses when non-interactive.
- Honesty constraint is load-bearing: per source doc §1.2/§2.3 an in-process check is NOT an authoritative security boundary. No story, AC, or doc may imply enforcement, sandboxing, or containment.

### Files Created
- .blueprint/features/feature_agent-runtime-security-controls/FEATURE_SPEC.md

### Open Questions
- Default protected-path list — should `.claude/` state files be protected? The pipeline writes them legitimately.
- `history export --output=` outside the root: `BLOCK` (possible regression) or `REVIEW`?
- Detector false positives: specs legitimately quote example tokens; suppress via placeholder heuristics, or return `REVIEW`?
- Should an `enabled: false` escape hatch exist at all (§6 of source doc calls self-service policy change prohibited)?
- Windows UNC/device-path behaviour is specified but the test environment is Linux.

### Critical Context
Real, current call sites the guard must cover: `src/refine.js` (builds `feature_${slug}` from `argv[3]`, unvalidated), `src/interactive.js:writeSpec` (mkdir+write on a caller path), `src/history.js` (`--output=`), `src/telemetry.js` (`MURMUR8_TELEMETRY_QUEUE`). `src/telemetry.js:buildPayload` already sends `featureSpec` and `stories` as plain text and `enqueueFailure` writes them to disk — the scan must run before both, and a blocked payload must NOT be queued. Nine story themes are listed in FEATURE_SPEC §11; symlink cases need real temp-dir fixtures (string-prefix comparison is forbidden by rule R4), and secret tests must use synthetic values and assert the value never appears in any output.
