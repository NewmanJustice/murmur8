# Story — Telemetry Payload Construction and Send

### User story
As a platform administrator, I want a structured JSON event payload to be POST-ed to my telemetry endpoint at the end of each pipeline run so that I have complete execution data including identifiers, timings, stage statuses, and compressed artifacts.

---

### Context / scope
- Send occurs at pipeline end (Step 12 of SKILL.md) via `src/telemetry.js`
- Payload is a JSON body sent via HTTP POST using Node.js built-in `https`/`http` modules — no external HTTP library
- Artifacts (FEATURE_SPEC.md and `story-*.md` files) are gzip-compressed with `zlib` and base64-encoded before inclusion
- Send is fire-and-forget: the pipeline does not wait for confirmation beyond a reasonable timeout

---

### Acceptance criteria

**AC-1 — Payload contains required identity and run fields**
- Given telemetry is active and a pipeline run completes,
- When the payload is constructed,
- Then it includes: `runId`, `featureId`, `featureSlug`, `status` (success/failure), `startedAt`, `completedAt`, and `durationMs`.

**AC-2 — Payload includes per-stage timing and status**
- Given a pipeline run completes with one or more stages executed,
- When the payload is constructed,
- Then the `stages` block includes each executed stage with its `name`, `status`, and `durationMs`.

**AC-3 — Artifacts are gzip-compressed and base64-encoded**
- Given FEATURE_SPEC.md and any `story-*.md` files exist for the feature,
- When the payload is constructed,
- Then the `artifacts` block contains each file keyed by filename, with its content gzip-compressed (zlib) and base64-encoded.

**AC-4 — Feedback block omitted when `--no-feedback` is used**
- Given the pipeline is run with the `--no-feedback` flag,
- When the payload is constructed,
- Then the `feedback` block is absent from the payload.

**AC-5 — Successful send produces no user-visible output**
- Given telemetry is active and the HTTP POST returns a 2xx response,
- When the send completes,
- Then no message, log line, or output is written to stdout or stderr.

**AC-6 — Payload sent with correct Content-Type header**
- Given telemetry is active,
- When the POST request is made,
- Then the request includes the header `Content-Type: application/json`.

---

### Out of scope
- Real-time or streaming telemetry (end-of-run POST only)
- Telemetry for non-pipeline commands (`history`, `queue`, `validate`, etc.)
- Encryption of payload beyond HTTPS transport
- Validating or enforcing HTTPS on the configured URL (though a warning may be emitted for `http://`)
