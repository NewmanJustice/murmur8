# Test Specification — Pipeline Telemetry

## Understanding

The pipeline-telemetry feature adds opt-in, fully silent telemetry to murmur8 pipeline runs. Activation is controlled solely by `MURMUR8_TELEMETRY_URL` (env var or `.env` file). On pipeline end a structured JSON payload — including run/feature identifiers, per-stage timings, gzip+base64 compressed artifacts, and optional feedback — is HTTP POSTed to the configured endpoint. Send failures are silently queued to `.claude/telemetry-failed.json` and retried at the start of the next run. A new `featureId` UUID is written into FEATURE_SPEC.md YAML frontmatter once and preserved on re-runs. The `murmur8 telemetry-config` command displays configuration with masked API key. The `init` command creates a `.env` telemetry template and ensures `.env` is in `.gitignore`. All code lives in `src/telemetry.js` and `src/commands/telemetry-config.js`; touches `src/history.js`, `src/init.js`, `bin/cli.js`, `src/index.js`.

---

## AC to Test ID Mapping

### Story: Telemetry Activation (story-telemetry-activation.md)

| AC | Test ID | Scenario |
|----|---------|----------|
| AC-1 | T-TA-1 | No HTTP request when URL absent |
| AC-2 | T-TA-2 | POST sent when URL set in .env |
| AC-3 | T-TA-3 | Process env URL overrides .env URL |
| AC-4 | T-TA-4 | Authorization header sent when key set |
| AC-5 | T-TA-5 | Authorization header absent when key not set |
| AC-6 | T-TA-6 | Process env key overrides .env key |

### Story: Identifiers (story-identifiers.md)

| AC | Test ID | Scenario |
|----|---------|----------|
| AC-1 | T-ID-1 | runId is UUID v4 generated per run |
| AC-2 | T-ID-2 | runId stored in history entry |
| AC-3 | T-ID-3 | featureId written into new FEATURE_SPEC.md frontmatter |
| AC-4 | T-ID-4 | Existing featureId preserved unchanged |
| AC-5 | T-ID-5 | Each run gets different runId; featureId stable |

### Story: Payload Construction & Send (story-payload-send.md)

| AC | Test ID | Scenario |
|----|---------|----------|
| AC-1 | T-PS-1 | Payload contains required identity/run fields |
| AC-2 | T-PS-2 | Payload includes per-stage timing and status |
| AC-3 | T-PS-3 | Artifacts gzip+base64 encoded; no stories → only FEATURE_SPEC.md key |
| AC-4 | T-PS-4 | feedback block absent when --no-feedback |
| AC-5 | T-PS-5 | Successful send produces no stdout/stderr output |
| AC-6 | T-PS-6 | POST includes Content-Type: application/json header |

### Story: Failed Send Queue & Retry (story-failed-queue-retry.md)

| AC | Test ID | Scenario |
|----|---------|----------|
| AC-1 | T-FQ-1 | Failed send appended to queue; no output; pipeline continues |
| AC-2 | T-FQ-2 | Queued payloads retried at next run start |
| AC-3 | T-FQ-3 | Successfully retried entry removed from queue |
| AC-4 | T-FQ-4 | Queue file written as [] when all entries sent |
| AC-5 | T-FQ-5 | Retry failure stays in queue silently |
| AC-6 | T-FQ-6 | Queue capped at max; oldest dropped on overflow |

### Story: Init Integration (story-init-integration.md)

| AC | Test ID | Scenario |
|----|---------|----------|
| AC-1 | T-II-1 | .env created with telemetry template when absent |
| AC-2 | T-II-2 | Template appended to existing .env |
| AC-3 | T-II-3 | .env not modified if template already present |
| AC-4 | T-II-4 | .env appended to .gitignore when absent |
| AC-5 | T-II-5 | .gitignore not modified if .env already listed |

### Story: telemetry-config Command (story-telemetry-config-command.md)

| AC | Test ID | Scenario |
|----|---------|----------|
| AC-1 | T-TC-1 | Command displays configured URL |
| AC-2 | T-TC-2 | API key masked (last 4 chars visible) |
| AC-3 | T-TC-3 | Key shown as "not set" when absent |
| AC-4 | T-TC-4 | Output indicates inactive when URL absent |
| AC-5 | T-TC-5 | Failed queue depth displayed |
| AC-6 | T-TC-6 | Failed queue shown as 0 when file absent |

---

## Key Assumptions

- `src/telemetry.js` exports: `loadConfig(dotenvPath)`, `sendTelemetry(payload, config)`, `retryQueue(config, queuePath)`, `buildPayload(runData)`, `compressArtifact(content)`, `generateRunId()`, `ensureFeatureId(specPath)`
- `src/commands/telemetry-config.js` exports a `run(options)` function returning/printing config status
- Ambiguity resolution: malformed/empty `MURMUR8_TELEMETRY_URL` → telemetry inactive (same as unset)
- Ambiguity resolution: no story files → `artifacts` block has only `FEATURE_SPEC.md` key (no other keys)
- Ambiguity resolution: FEATURE_SPEC.md with YAML frontmatter but no `featureId` key → generate new featureId
- Ambiguity resolution: corrupt/invalid JSON in `telemetry-failed.json` → treat as empty queue, overwrite with `[]`
- Ambiguity resolution: successful retry with no remaining entries → write `[]` to file (not delete)
- Ambiguity resolution: `.gitignore` absent when `.env` also absent → create `.gitignore` and add `.env` entry
- Ambiguity resolution: HTTP timeout counts as send failure → queue the payload silently
- `compressArtifact` is synchronous (zlib.gzipSync + Buffer.toString('base64'))
- UUID v4 validated via regex: `/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i`
