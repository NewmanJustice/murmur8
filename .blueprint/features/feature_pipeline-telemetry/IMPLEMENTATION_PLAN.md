# Implementation Plan — pipeline-telemetry

## Summary

Create `src/telemetry.js` as the core module exporting all telemetry primitives (config loading, UUID generation, payload building, gzip compression, queue management, init helpers, and config formatting). Add `src/commands/telemetry-config.js` as a thin CLI wrapper, then wire the new module into `src/index.js`, `src/init.js`, and `bin/cli.js`. No external dependencies are required; Node.js built-ins (`crypto`, `zlib`, `https`, `fs`) cover all needs.

## Files to Create / Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/telemetry.js` | **Create** | All exported telemetry functions |
| `src/commands/telemetry-config.js` | **Create** | CLI command handler for `telemetry-config` |
| `src/index.js` | **Modify** | Export telemetry functions |
| `src/init.js` | **Modify** | Call `ensureDotenv` and `ensureGitignore` during init |
| `bin/cli.js` | **No change needed** | Dynamic command loading already handles new commands |

## Numbered Steps

1. `src/telemetry.js` CREATE `loadConfig(dotenvPath)` — manual `.env` parse; env vars win; returns `{ url, key }` (null if absent) | Tests: T-TA-1 to T-TA-6
2. `src/telemetry.js` ADD `generateRunId()` — returns `crypto.randomUUID()` | Tests: T-ID-1, T-ID-2, T-ID-5
3. `src/telemetry.js` ADD `ensureFeatureId(specPath)` — reads file, extracts YAML frontmatter `featureId`; generates UUID v4 and prepends/updates frontmatter if absent | Tests: T-ID-3, T-ID-4, T-ID-5
4. `src/telemetry.js` ADD `buildPayload(runData)` — assembles `{ runId, run: { featureId, slug, status, startedAt, completedAt, totalDurationMs, stages } }`; omits `feedback` key when value is falsy/empty; passes `artifacts` through unchanged | Tests: T-PS-1 to T-PS-4, T-PS-6
5. `src/telemetry.js` ADD `compressArtifact(content)` — synchronous `zlib.gzipSync(content)` then `.toString('base64')` | Tests: T-PS-3, T-PS-5
6. `src/telemetry.js` ADD `enqueueFailure(payload, queuePath)` — reads queue (or `[]` on missing/corrupt); appends payload; trims to last 50; writes JSON | Tests: T-FQ-1, T-FQ-6
7. `src/telemetry.js` ADD `retryQueue(queuePath, sendFn)` — reads queue; calls `sendFn(payload)` for each entry; keeps entries where `sendFn` returns falsy; writes remaining (or `[]`) back to file | Tests: T-FQ-2 to T-FQ-5
8. `src/telemetry.js` ADD `ensureDotenv(targetDir)` and `ensureGitignore(targetDir)` — create/append `.env` template (idempotent on `MURMUR8_TELEMETRY_URL` presence); add `.env` line to `.gitignore` if absent (create if needed) | Tests: T-II-1 to T-II-5
9. `src/telemetry.js` ADD `formatTelemetryConfig(config, queuePath)` — returns string with URL, masked key (`****last4` or "not set"), active/inactive status, queue depth (reads file or 0) | Tests: T-TC-1 to T-TC-6
10. `src/commands/telemetry-config.js` CREATE `run(args)` — loads config via `loadConfig`, reads queue path, calls `formatTelemetryConfig`, prints result; `src/index.js` ADD telemetry exports; `src/init.js` CALL `ensureDotenv`+`ensureGitignore` | Tests: T-TC-1 to T-TC-6, T-II-1 to T-II-5

## Risks

- `ensureFeatureId` must handle three frontmatter states: no frontmatter, frontmatter without `featureId`, and frontmatter with existing `featureId`. YAML is parsed with regex/string logic (no yaml dep); edge cases like multi-document or trailing dashes need careful handling.
- `retryQueue` contract: `sendFn` returns truthy on success (synchronous). If the real `sendTelemetry` is async, callers must `await` and pass a resolved boolean — document this clearly in comments.
- Queue overflow logic drops the **oldest** entries (index 0), keeping the newest. Verify slice direction: `queue.slice(-49)` then push gives correct oldest-dropped behaviour.
