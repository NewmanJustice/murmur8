---
featureId: a3f8c2d1-7e54-4b09-8f16-23a1e5d94c72
---

# Feature Specification — Pipeline Telemetry

## 1. Feature Intent

**Why this feature exists.**

- **Problem being addressed:** Teams using murmur8 have no visibility into pipeline usage across projects or over time at an aggregate level. Individual projects may have local history, but there is no mechanism to send structured execution data to a central observability endpoint for fleet-wide analysis, cost attribution, or quality tracking.
- **User need:** Platform teams and administrators want to understand how murmur8 is being used — which features succeed or fail, how long stages take, and whether quality is improving. This is opt-in by configuration, not mandated.
- **System purpose alignment:** Per SYSTEM_SPEC.md:Section 8 (Cross-Cutting Concerns:Observability), the system aims for observability. This feature extends that observability to an external, configurable telemetry layer without modifying the core pipeline flow.

> This feature reinforces the system's observability goals and does not alter pipeline behaviour. It is completely silent when no endpoint is configured.

---

## 2. Scope

### In Scope

- Sending a structured JSON event payload via HTTP POST to a configurable telemetry endpoint at the end of each pipeline run
- Reading endpoint URL and API key from `.env` file and real environment variables (env vars take precedence)
- Non-blocking send: failures never interrupt the pipeline
- Queuing failed sends to `.claude/telemetry-failed.json`; retrying queued sends at the start of the next pipeline run
- Compressing artifact content (FEATURE_SPEC.md and story files) with zlib gzip + base64 before inclusion in payload
- Generating a `runId` (UUID v4) at pipeline start for correlating events
- Writing a `featureId` (UUID v4) into FEATURE_SPEC.md YAML frontmatter by Alex on first creation; stable across retries
- New CLI command `murmur8 telemetry-config` to display current telemetry configuration
- `init` command creating/appending a commented-out telemetry template to `.env` and ensuring `.env` is in `.gitignore`
- Exporting telemetry functions from `src/index.js`
- Storing `runId` in the history entry

### Out of Scope

- An opt-out flag (presence of URL = opt-in; absence = opt-out)
- Real-time or streaming telemetry (end-of-run POST only)
- Telemetry for non-pipeline CLI commands (e.g., `history`, `queue`)
- Encryption of payload beyond HTTPS transport
- Telemetry dashboard or receiver implementation
- dotenv or any third-party `.env` parsing dependency (manual parsing only)

---

## 3. Actors Involved

### Human User / Administrator

- **Can do:** Configure telemetry endpoint and key via `.env`; view telemetry config via `murmur8 telemetry-config`; remove config to disable
- **Cannot do:** Trigger telemetry manually; view the contents of failed send queue via CLI (file inspection only)

### Pipeline Orchestrator (internal)

- **Can do:** Generate `runId` at pipeline start; call telemetry send at pipeline end; enqueue failed sends; retry failed sends at start of next run
- **Cannot do:** Block pipeline on telemetry failure; modify payload after send attempt

### Alex Agent (internal)

- **Can do:** Write `featureId` UUID into FEATURE_SPEC.md YAML frontmatter on first creation; preserve existing `featureId` on re-runs
- **Cannot do:** Regenerate `featureId` if one already exists

---

## 4. Behaviour Overview

### Happy-path behaviour

1. User configures `MURMUR8_TELEMETRY_URL` (and optionally `MURMUR8_TELEMETRY_KEY`) in `.env` or as real environment variables
2. At pipeline start (Step 5 of SKILL.md), orchestrator generates a `runId` UUID v4 and stores it in working context
3. Alex writes a `featureId` UUID into FEATURE_SPEC.md YAML frontmatter (if not already present)
4. Pipeline executes normally; timings, stage statuses, and feedback are collected as usual
5. At pipeline end (after the `history record` call in Step 12 of SKILL.md), the orchestrator executes an explicit Bash step that calls `loadConfig`, `buildPayload`, `compressArtifact`, and `enqueueFailure` from `src/telemetry.js` to build and POST the payload
6. For refinement runs, the equivalent send step is executed at Step 7 of REFINE_SKILL.md (after `history record`) using the same building-block functions, with `type: "refinement"` and `parentRunId` added to the payload
7. On success, no user-visible output occurs (silent)
8. On failure, the payload is appended to `.claude/telemetry-failed.json` silently

### Key alternatives or branches

- **No URL configured:** Telemetry module does nothing; pipeline continues as normal
- **Send failure (network error, non-2xx response):** Payload written to failed queue; no pipeline interruption
- **Retry at next run start:** Any entries in `.claude/telemetry-failed.json` are attempted before the new run proceeds; failures remain in queue
- **`--no-feedback` flag used:** `feedback` block omitted from payload
- **`featureId` already present in FEATURE_SPEC.md:** Alex preserves existing value; does not regenerate

### User-visible outcomes

- No output when telemetry is working correctly (fully silent)
- `murmur8 telemetry-config` shows configured URL (masked key), retry queue depth

---

## 5. State & Lifecycle Interactions

### States entered

- **telemetry_pending:** `runId` generated at pipeline start; stored in working context
- **telemetry_sent:** Payload successfully POSTed at pipeline end
- **telemetry_queued:** Send failed; payload appended to `.claude/telemetry-failed.json`

### States modified

- `featureId` written into FEATURE_SPEC.md frontmatter (by Alex, on first run only)
- History entry extended with `runId` field
- `.claude/telemetry-failed.json` appended to on send failure; entries removed on successful retry

### This feature is:

- **State-creating:** Creates `runId` per run; may create `telemetry-failed.json`
- **State-transitioning:** Moves failed payloads from queued → sent on retry
- **Not state-constraining:** Does not block any pipeline operations

---

## 6. Rules & Decision Logic

### Rule: Telemetry Activation

- **Description:** Telemetry is active if and only if `MURMUR8_TELEMETRY_URL` is set (non-empty) in `.env` or real env
- **Inputs:** Presence and value of `MURMUR8_TELEMETRY_URL`
- **Outputs:** Active or inactive module
- **Deterministic:** Yes

### Rule: Environment Variable Precedence

- **Description:** Real environment variables take precedence over `.env` file values for both `MURMUR8_TELEMETRY_URL` and `MURMUR8_TELEMETRY_KEY`
- **Inputs:** `process.env` values, `.env` file parse result
- **Outputs:** Resolved URL and key
- **Deterministic:** Yes

### Rule: runId Generation

- **Description:** A new UUID v4 `runId` is generated at Step 5 of SKILL.md for every pipeline run, regardless of whether telemetry is active
- **Inputs:** None (random UUID)
- **Outputs:** UUID v4 string stored in working context and history entry
- **Deterministic:** No (random)

### Rule: featureId Stability

- **Description:** `featureId` is written by Alex into FEATURE_SPEC.md frontmatter on first creation. If FEATURE_SPEC.md already contains a `featureId`, it must not be changed.
- **Inputs:** Existing FEATURE_SPEC.md content
- **Outputs:** Frontmatter with stable `featureId`
- **Deterministic:** Yes (preserves existing); No for initial generation (random UUID)

### Rule: Explicit Send Invocation in SKILL.md and REFINE_SKILL.md

- **Description:** Both SKILL.md (Step 12) and REFINE_SKILL.md (Step 7) MUST include an explicit Bash step that invokes `src/telemetry.js` building-block functions (`loadConfig`, `buildPayload`, `compressArtifact`, `enqueueFailure`) via a `node -e` inline script after the `history record` call. The step is mandatory and must not be a pseudocode comment — it must be a real, executable Bash command. For REFINE_SKILL.md the payload must include `type: "refinement"` and `parentRunId`.
- **Inputs:** All stage timings collected during the run, `featureId` from FEATURE_SPEC.md frontmatter, `runId` from working context, `MURMUR8_TELEMETRY_URL` and `MURMUR8_TELEMETRY_KEY` from `.env` / real env
- **Outputs:** HTTP POST fired (silent on success); payload written to `.claude/telemetry-failed.json` on any error (silent)
- **Deterministic:** Yes (given same inputs)

### Rule: Non-blocking Send

- **Description:** The HTTP POST to the telemetry endpoint must not block or throw into the pipeline. Any network or HTTP error results in silent queue, not pipeline abort.
- **Inputs:** HTTP response code, network errors
- **Outputs:** Success (silent) or enqueue to failed queue (silent)
- **Deterministic:** Yes

### Rule: Failed Queue Retry

- **Description:** At the start of each pipeline run (before Step 1 processing), any entries in `.claude/telemetry-failed.json` are attempted. Successfully sent entries are removed; failures remain.
- **Inputs:** Contents of `.claude/telemetry-failed.json`
- **Outputs:** Updated queue file (or file removed if empty)
- **Deterministic:** Yes

### Rule: Artifact Compression

- **Description:** FEATURE_SPEC.md and any `story-*.md` files are gzip-compressed (zlib) and base64-encoded before inclusion in the `artifacts` block. Each file is keyed by its filename.
- **Inputs:** File contents
- **Outputs:** `{ "filename": "<base64-gzip>" }` per file
- **Deterministic:** Yes (given same input)

### Rule: Authorization Header

- **Description:** If `MURMUR8_TELEMETRY_KEY` is set, it is sent as `Authorization: Bearer <key>` header. If not set, the header is omitted.
- **Inputs:** Key value
- **Outputs:** HTTP Authorization header presence
- **Deterministic:** Yes

---

## 7. Dependencies

### System components

- `src/history.js` — Must pass `runId` to the history entry write
- `SKILL.md` Step 5 — Must generate `runId`; Step 12 — Must include an explicit Bash step to invoke `src/telemetry.js` building-block functions after `history record`
- `REFINE_SKILL.md` Step 7 — Must replace the current pseudocode comment with an explicit Bash step to invoke `src/telemetry.js` building-block functions; payload must include `type: "refinement"` and `parentRunId`
- `src/init.js` — Must create/append `.env` template and update `.gitignore`
- `bin/cli.js` — Must register `telemetry-config` command
- `src/index.js` — Must export telemetry functions

### External systems

- Configurable HTTP/HTTPS endpoint (operator-supplied); must accept POST with JSON body
- zlib (Node.js built-in) — for gzip compression
- Node.js `crypto` module (built-in) — for UUID v4 generation
- Node.js `https`/`http` modules (built-in) — for HTTP POST; no external HTTP library

### Operational dependencies

- `.env` file at project root (optional; telemetry inactive if absent or URL not set)
- File system access to `.claude/` directory for failed queue
- Network access to configured endpoint (no hard dependency — failures are tolerated)

---

## 8. Non-Functional Considerations

### Performance sensitivity

- Telemetry send is fire-and-forget (async, non-blocking); it must not add measurable latency to the user-visible pipeline completion
- Artifact compression is performed in-process; acceptable for typical spec file sizes (<50 KB combined)

### Audit/logging needs

- The telemetry payload itself constitutes a structured audit record
- `runId` links telemetry events to local history entries for cross-referencing
- `featureId` provides stable identity across retries of the same feature

### Error tolerance

- Send failures must be fully silent to the user (no output, no pipeline interruption)
- Failed queue must not grow unboundedly — implementations should consider a maximum retry depth (e.g., 50 entries), dropping oldest on overflow; exact limit is an implementation decision

### Security implications

- `MURMUR8_TELEMETRY_KEY` must never be logged or displayed in plaintext; `telemetry-config` command must mask the key (e.g., `sk-****1234`)
- `.env` file must be added to `.gitignore` by the `init` command to prevent accidental credential commit
- `gitEmail` and `repoUrl` are included in the identity block; operators must be aware these are transmitted to the configured endpoint
- Payload transmitted over HTTPS (URL is operator-configured; framework does not enforce HTTPS but should warn if `http://` is used)

---

## 9. Assumptions & Open Questions

### Assumptions

- ASSUMPTION: Node.js built-in `zlib`, `crypto`, `https`/`http` modules are sufficient; no external dependencies needed
- ASSUMPTION: `git config user.name`, `git config user.email`, and `git remote get-url origin` are available and executable in the pipeline environment
- ASSUMPTION: Artifact files (FEATURE_SPEC.md, story files) are small enough that synchronous gzip compression is non-blocking in practice
- ASSUMPTION: The telemetry endpoint is operator-managed; murmur8 does not validate the endpoint URL beyond basic format
- ASSUMPTION: UUID v4 can be generated using `crypto.randomUUID()` (Node.js 15.6+; within Node.js 18+ requirement)

### Open Questions

- Should the failed queue have a configurable maximum depth, or a fixed cap (e.g., 50)?
- Should `telemetry-config` provide a `--test` flag to send a synthetic ping to verify connectivity?
- Should the `init` command emit a user-visible notice that `.env` was created (to aid discoverability)?

---

## 10. Impact on System Specification

### Alignment assessment

This feature **reinforces existing system assumptions** and introduces a minor extension:

- Per SYSTEM_SPEC.md:Section 8 (Observability), the system already exposes queue status and completion summaries. This feature adds an optional external observability channel.
- SYSTEM_SPEC.md:Section 3 (Out of Scope) excludes CI/CD integration, but telemetry to an operator endpoint is a distinct concern (usage analytics, not CI automation). No contradiction.
- SYSTEM_SPEC.md:Section 9 (Non-Functional:Reliability) states the system must not be blocked by side-effects. This feature's non-blocking, silent-failure design directly upholds that invariant.

### Minor extension to system spec warranted

The following additions to SYSTEM_SPEC.md are flagged for consideration (not applied here):

1. **Section 5 (Core Domain Concepts):** Add entry for `Run Identifier (runId)` — a UUID v4 generated per pipeline invocation for telemetry correlation and history linkage.
2. **Section 5:** Add entry for `Feature Identifier (featureId)` — a UUID v4 written into FEATURE_SPEC.md frontmatter by Alex on first creation; stable across retries.
3. **Section 8 (Cross-Cutting Concerns):** Add sub-section for external telemetry noting the opt-in model.

These are **non-breaking extensions** flagged for Alex/human decision.

---

## 11. Handover to BA (Cass)

### Story themes

1. **Telemetry activation** — Configuring the endpoint and key; understanding opt-in model
2. **runId and featureId generation** — Identifier lifecycle at pipeline start and spec creation
3. **Payload construction and send** — Building and POSTing the event at pipeline end
4. **Failed send queue** — Queuing failed sends and retrying at next run start
5. **init integration** — `.env` template creation and `.gitignore` protection
6. **telemetry-config command** — Viewing current configuration with masked key

### Expected story boundaries

- Activation/config story should be separate from the payload/send story
- `featureId` (Alex behaviour) and `runId` (orchestrator behaviour) may be combined into one story or split by agent concern
- Failed queue retry is a distinct story (edge case behaviour, important for reliability)
- `init` changes are a small story but have a user-visible outcome (discoverability of the feature)

### Areas needing careful story framing

- The "completely silent when no endpoint configured" behaviour needs an explicit AC (absence of output is the expected outcome)
- The precedence rule (real env vars override `.env`) needs a dedicated AC
- The `featureId` preservation rule (no regeneration on re-run) needs a dedicated AC
- Security: key masking in `telemetry-config` output needs explicit AC

---

## 12. Change Log (Feature-Level)

| Date       | Change                                                                                              | Reason                                                                                         | Raised By |
|------------|-----------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------|-----------|
| 2026-05-19 | Initial feature specification created                                                               | New feature: telemetry layer                                                                   | Alex      |
| 2026-05-27 | Added Rule: Explicit Send Invocation; updated Behaviour Overview and Dependencies to require real Bash send step in SKILL.md Step 12 and REFINE_SKILL.md Step 7; added REFINE_SKILL.md to dependency list | Gap: runs complete and history is recorded locally but nothing is ever POSTed to the endpoint | Steve     |
