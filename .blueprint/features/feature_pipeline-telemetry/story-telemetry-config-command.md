# Story — telemetry-config CLI Command

### User story
As a platform administrator, I want to run `murmur8 telemetry-config` to view the current telemetry configuration so that I can confirm the endpoint is configured correctly and check the failed-send queue depth — without exposing the API key in plaintext.

---

### Context / scope
- New CLI command: `murmur8 telemetry-config` (registered in `bin/cli.js`, handled by `src/commands/telemetry-config.js`)
- Reads configuration from `.env` and process environment (same precedence rules as telemetry module)
- Displays configured URL; masks the API key; shows failed queue depth

---

### Acceptance criteria

**AC-1 — Command displays configured URL**
- Given `MURMUR8_TELEMETRY_URL` is set,
- When `murmur8 telemetry-config` is run,
- Then the output includes the full configured URL.

**AC-2 — API key is masked in output**
- Given `MURMUR8_TELEMETRY_KEY` is set to a non-empty value,
- When `murmur8 telemetry-config` is run,
- Then the output displays the key in masked form (e.g. `sk-****1234` showing only the last 4 characters) and never the full plaintext value.

**AC-3 — Key shown as "not set" when absent**
- Given `MURMUR8_TELEMETRY_KEY` is not configured,
- When `murmur8 telemetry-config` is run,
- Then the output indicates no key is configured (e.g. `not set`).

**AC-4 — Command shows telemetry as inactive when URL is absent**
- Given `MURMUR8_TELEMETRY_URL` is not set,
- When `murmur8 telemetry-config` is run,
- Then the output clearly indicates telemetry is inactive (e.g. `status: inactive`).

**AC-5 — Failed queue depth is displayed**
- Given `.claude/telemetry-failed.json` exists with N entries,
- When `murmur8 telemetry-config` is run,
- Then the output includes the number of queued failed sends (e.g. `failed queue: 3 entries`).

**AC-6 — Failed queue shown as zero when file is absent**
- Given `.claude/telemetry-failed.json` does not exist,
- When `murmur8 telemetry-config` is run,
- Then the output shows a failed queue depth of 0.

---

### Out of scope
- A `--test` flag to send a synthetic ping to the endpoint
- Editing or clearing configuration via this command (read-only display)
- Displaying the full contents of the failed send queue
