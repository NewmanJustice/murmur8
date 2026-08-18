# Story 4: Preserve Telemetry Delivery Compatibility and Non-Blocking Reliability

## User Story
As a pipeline owner, I want telemetry enrichment to remain backward-compatible and non-blocking so observability improves without risking run completion behavior.

## Acceptance Criteria
1. Given existing telemetry delivery tests with mocked HTTP server assertions, when enriched payloads are sent, then payloads with or without `run.totalCost` are accepted without schema/validation failure.
2. Given existing telemetry delivery tests with mocked HTTP server assertions, when stage payloads contain valid partial economics combinations (`cost` only, partial tokens, or full tokens), then payloads are accepted without rejection.
3. Given telemetry send fails (HTTP/network/error path), when run completion is evaluated, then final run status is unchanged by telemetry failure and follows pipeline/refinement execution outcome only.
4. Given telemetry send fails, when failure is handled, then warning/queue behavior remains active and retry state is recorded per existing telemetry queue flow.
5. Given enrichment changes are applied, when reviewing affected code paths, then telemetry transport/retry mechanics in `src/telemetry.js` remain unchanged in behavior.
