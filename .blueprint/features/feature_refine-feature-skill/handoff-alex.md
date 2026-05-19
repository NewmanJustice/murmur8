## Handoff Summary
**For:** Cass
**Feature:** refine-feature-skill

### Key Decisions
- Skill is `/refine-feature [slug]` — a separate skill from `/implement-feature`, not a flag
- Alex stage is conversation-based (reads existing artifacts, chats with user, proposes diff) rather than fresh spec creation
- Hard pause before Codey is mandatory — no `--yes` bypass
- Telemetry uses `parentRunId` to form a linked chain of refinements; `featureId` is preserved
- Cass skipped if original feature had no stories (technical classification)

### Files Created
- .blueprint/features/feature_refine-feature-skill/FEATURE_SPEC.md

### Open Questions
- None

### Critical Context
The six story themes map cleanly to pipeline stages: (1) initiation, (2) conversation + approval, (3) story propagation via Cass, (4) test propagation via Nigel, (5) mandatory pause + Codey confirmation, (6) telemetry lineage. Each story should have testable ACs focused on the observable behaviour at that stage boundary.
