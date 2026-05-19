# Story — Telemetry Activation & Configuration

### User story
As a platform administrator, I want to activate pipeline telemetry by setting a URL in `.env` so that murmur8 sends structured execution data to my observability endpoint without requiring code changes.

---

### Context / scope
- Configuration via `.env` file at project root and/or real environment variables
- Activation is determined solely by the presence of `MURMUR8_TELEMETRY_URL`
- Absence of the URL means telemetry is fully inactive — no output, no side effects

---

### Acceptance criteria

**AC-1 — Telemetry inactive when URL is absent**
- Given `MURMUR8_TELEMETRY_URL` is not set in `.env` or in the process environment,
- When a pipeline run completes,
- Then no HTTP request is made, no queue file is created, and no output is produced.

**AC-2 — Telemetry active when URL is set in `.env`**
- Given `MURMUR8_TELEMETRY_URL` is set to a valid URL in `.env`,
- When a pipeline run completes,
- Then `src/telemetry.js` POSTs the payload to that URL.

**AC-3 — Real environment variable takes precedence over `.env`**
- Given `MURMUR8_TELEMETRY_URL` is set to `https://env-value.example.com` in the process environment,
- And `.env` contains `MURMUR8_TELEMETRY_URL=https://dotenv-value.example.com`,
- When telemetry resolves the endpoint,
- Then the request is sent to `https://env-value.example.com` (the process env value).

**AC-4 — API key sent as Authorization header when set**
- Given `MURMUR8_TELEMETRY_KEY` is set (in `.env` or environment),
- When the telemetry POST is made,
- Then the request includes the header `Authorization: Bearer <key>`.

**AC-5 — Authorization header omitted when key is absent**
- Given `MURMUR8_TELEMETRY_KEY` is not set,
- When the telemetry POST is made,
- Then no `Authorization` header is included in the request.

**AC-6 — Same precedence rule applies to API key**
- Given `MURMUR8_TELEMETRY_KEY` is set in both the process environment and `.env` with different values,
- When telemetry resolves the key,
- Then the process environment value is used.

---

### Out of scope
- Opt-out flag (absence of URL is the opt-out mechanism)
- Validating or enforcing HTTPS on the configured URL
- Telemetry for non-pipeline CLI commands (`history`, `queue`, etc.)
- Any third-party `.env` parsing library (manual parsing only)
