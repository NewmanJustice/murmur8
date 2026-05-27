# Story Changes — pipeline-telemetry refinement (2026-05-27)

## Reason for refinement

The telemetry send was never executed at the end of a pipeline run. `src/telemetry.js` contains all building-block functions (`loadConfig`, `buildPayload`, `compressArtifact`, `enqueueFailure`) but:

- SKILL.md Step 12 records to local history and then stops — no send step follows
- REFINE_SKILL.md Step 7 contains only a pseudocode JS comment — no actual Bash invocation

The fix requires both SKILL.md and REFINE_SKILL.md to include an explicit, executable Bash step after `history record` that calls the `src/telemetry.js` building-block functions to build and POST the payload.

---

## Stories directly affected

### story-payload-send.md — REQUIRES UPDATE

**Why:** The story's context line says "Send occurs at pipeline end (Step 12 of SKILL.md) via `src/telemetry.js`" but makes no distinction between `sendTelemetry` (which does not exist as a function) and the actual building-block call pattern. The story must be updated to:

1. Clarify that the orchestrator invokes a `node -e` inline Bash step that calls `loadConfig`, `buildPayload`, `compressArtifact`, and `enqueueFailure` from `src/telemetry.js` — there is no single `sendTelemetry` wrapper function
2. Add an AC for the refinement path: the send step in REFINE_SKILL.md Step 7 must include `type: "refinement"` and `parentRunId` in the payload

**New AC to add (AC-7):**
- Given a refinement run completes,
- When the telemetry payload is constructed,
- Then the payload includes `type: "refinement"` and `parentRunId` linking to the preceding run.

---

## Stories not affected

| Story file                       | Reason unchanged                                                                  |
|----------------------------------|-----------------------------------------------------------------------------------|
| story-telemetry-activation.md    | Activation rules (URL presence, env var precedence) are unchanged                 |
| story-identifiers.md             | runId and featureId generation and lifecycle are unchanged                        |
| story-failed-queue-retry.md      | Queue and retry logic are unchanged; enqueueFailure is already implemented        |
| story-init-integration.md        | .env template and .gitignore changes are unchanged                                |
| story-telemetry-config-command.md | telemetry-config command output and key masking are unchanged                    |

---

## SKILL.md and REFINE_SKILL.md changes required (for Codey)

### SKILL.md — Step 12

After the `node bin/cli.js history record '{...}'` bash block, add an explicit step:

```bash
# Fire-and-forget telemetry send (silent; never blocks pipeline)
node -e "
  const t = require('./src/telemetry');
  const cfg = t.loadConfig('.env');
  if (!cfg.url) process.exit(0);
  const { gitHubUser, repoName } = t.resolveGitContext(process.cwd());
  const fs = require('fs'), path = require('path');
  const featDir = '.blueprint/features/feature_{slug}';
  const artifacts = {};
  for (const f of fs.readdirSync(featDir)) {
    if (f === 'FEATURE_SPEC.md' || f.startsWith('story-')) {
      artifacts[f] = t.compressArtifact(fs.readFileSync(path.join(featDir, f), 'utf8'));
    }
  }
  const payload = t.buildPayload({
    runId: '{runId}', featureId: '{featureId}', slug: '{slug}',
    status: '{status}', startedAt: '{PIPELINE_START}', completedAt: '<now>',
    totalDurationMs: <elapsed>, stages: { /* all collected stage timings */ },
    artifacts, feedback: { /* collected feedback */ },
    gitHubUser, repoName
  });
  const http = require(cfg.url.startsWith('https') ? 'https' : 'http');
  const body = JSON.stringify(payload);
  const u = new URL(cfg.url);
  const req = http.request({ hostname: u.hostname, port: u.port, path: u.pathname + u.search,
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body),
    ...(cfg.key ? { 'Authorization': 'Bearer ' + cfg.key } : {}) } }, () => {});
  req.on('error', (e) => t.enqueueFailure(payload, '.claude/telemetry-failed.json'));
  req.write(body); req.end();
" 2>/dev/null || true
```

The send must be:
- Non-blocking (fire-and-forget; pipeline does not await the response)
- Silent on success (stdout suppressed via `2>/dev/null || true`)
- Fire-and-forget: network errors invoke `enqueueFailure`, not pipeline abort

### REFINE_SKILL.md — Step 7

Replace the current pseudocode comment block with an equivalent explicit Bash step (same pattern as above) that additionally includes `type: "refinement"` and `parentRunId: '{lineage.parentRunId}'` in the `buildPayload` call. The step must be an executable Bash command, not a JavaScript pseudocode snippet.
