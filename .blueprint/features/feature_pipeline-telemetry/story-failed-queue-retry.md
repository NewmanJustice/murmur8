# Story — Failed Send Queue and Retry

### User story
As a platform administrator, I want failed telemetry sends to be queued silently and retried at the start of the next pipeline run so that transient network issues do not cause data loss and never interrupt pipeline execution.

---

### Context / scope
- Failed payloads are appended to `.claude/telemetry-failed.json`
- Retry happens at pipeline start (before Step 1 processing) on subsequent runs
- All failure handling is silent: no output to user on queue write or retry
- The queue has a maximum depth (implementation-defined, e.g. 50 entries); oldest entries are dropped on overflow

---

### Acceptance criteria

**AC-1 — Failed send is silently queued; pipeline continues**
- Given telemetry is active and the HTTP POST fails (network error or non-2xx response),
- When the send attempt completes,
- Then the payload is appended to `.claude/telemetry-failed.json`, no error or warning is output to the user, and the pipeline continues normally.

**AC-2 — Queued payloads are retried at the start of the next run**
- Given `.claude/telemetry-failed.json` contains one or more queued payloads,
- When the next pipeline run starts (before Step 1),
- Then `src/telemetry.js` attempts to send each queued payload to the configured endpoint.

**AC-3 — Successfully retried entries are removed from the queue**
- Given a queued payload is retried and the endpoint returns a 2xx response,
- When the retry completes,
- Then that entry is removed from `.claude/telemetry-failed.json`; remaining failed entries stay in the file.

**AC-4 — Queue file is removed when all entries are successfully sent**
- Given `.claude/telemetry-failed.json` exists with entries that are all successfully retried,
- When the last entry is sent successfully,
- Then `.claude/telemetry-failed.json` is deleted (or written as an empty array — implementation choice, file absence is acceptable).

**AC-5 — Retry failures remain in queue silently**
- Given a queued payload is retried and the send fails again,
- When the retry completes,
- Then the entry remains in `.claude/telemetry-failed.json` and no output is produced.

**AC-6 — Queue does not grow unboundedly**
- Given `.claude/telemetry-failed.json` already contains the maximum allowed entries,
- When a new send failure occurs,
- Then the oldest entry is dropped and the new payload is appended, keeping the queue at the maximum depth.

---

### Out of scope
- CLI command to inspect or clear the failed queue (file inspection only)
- Configurable retry delay or backoff (retry happens at next pipeline start, no timer)
- Retry of payloads when telemetry URL is unconfigured
