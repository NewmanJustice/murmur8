---
featureId: e7950491-b2fd-451c-bf10-a102f84e8196
---

# Feature Specification — Agent Runtime Security Controls (Slice 1: In-Process Path & Egress Policy Helpers)

> **Scope warning — read first.** The source requirement
> `.business_context/agent-runtime-secirity-controls.md` (working draft v0.3, ~500 lines,
> 37 acceptance criteria) describes an entire agent runtime security architecture. **Most of it lies
> outside this system's boundaries** (SYSTEM_SPEC.md §3) and requires deployed infrastructure this
> npm package does not and cannot own. This feature specifies **one bounded first slice**: source doc
> §2.2–§2.4 and §3.2, acceptance criteria 3, 4, 5, 15 and a partial 6. See §2 (Deferred / Out of
> Scope) and §10 for everything excluded and why.
>
> The source filename contains a typo ("secirity"). Referenced as-is; do not rename it.

---

## 1. Feature Intent

**Why this feature exists.**

- **Problem A — unconfined artifact writes.** murmur8's own Node code writes and mutates files at
  paths derived from a CLI-supplied feature slug, a caller-supplied output path, or an
  environment-supplied queue path. None are canonicalised or confined today: a slug of
  `../../../tmp/x`, or `--output=/etc/foo`, resolves and writes wherever it points.
- **Problem B — unscanned telemetry egress.** `src/telemetry.js` transmits `featureSpec` (the full
  FEATURE_SPEC.md body) and `stories` (title + full content) as plain text to a configured remote
  endpoint, and parks undelivered payloads on disk in `.claude/telemetry-failed.json`. Nothing checks
  that content for credentials first.
- **System purpose alignment:** SYSTEM_SPEC.md §3 (In Scope) names **artifact management** — feature
  specs, stories, test specs, tests, implementation plans — as a core responsibility, and §7
  (Governing Rules) requires artifact gates and *no silent changes*. A write landing outside the
  workspace, or a secret leaving the process, are both exactly the silent outcomes §7 forbids.
- **Both halves share one shape:** deterministic, in-process, dependency-free policy logic that ships
  as murmur8 JavaScript modules and is fully exercisable under `node --test` with no network, no
  Docker, and no external service. That shared shape is what makes them one coherent slice.

> **This feature does not claim to be a security boundary.** See §8.

---

## 2. Scope

### In Scope

**Part 1 — Workspace-root path guard** (source doc §2.2–§2.4; AC 3, 4, 5, partial 6)

- **One trusted workspace root** from trusted configuration at startup, canonicalised and validated
  once. Never derivable from a slug, spec content, story content, or tool result.
- **Path validation rules** (§2.3): reject empty / non-string / NUL-bearing / UNC / device-namespace
  paths; resolve relative paths against the workspace root, not `process.cwd()`; canonicalise via
  real-path resolution; test containment by path relation, **never** by string prefix; reject `..`
  traversal that escapes; reject symlink escape; for a **new** target, resolve and validate its
  **nearest existing parent** before creation; re-validate immediately before each write rather than
  caching a verdict.
- **Filesystem decision defaults** (§2.4): inside root and not protected → `ALLOW`; resolving outside
  the root → `BLOCK`, not overridable; a configured **protected path inside** the root → `REVIEW`.
- **Feature-slug validation** as a deterministic sub-rule — a slug is one safe path segment, not a path.
- **Adoption at murmur8's four existing in-process write paths:** `src/refine.js` (slug-derived
  feature directory and spec write), `src/interactive.js` (`writeSpec` → `mkdirSync`/`writeFileSync`),
  `src/history.js` (`history export --output=`), `src/telemetry.js` (failed-send queue path).

**Part 2 — Telemetry egress secret scan** (source doc §3.2; AC 15)

- **A deterministic secret detector**: signature-based patterns plus entropy-aware checks for
  high-confidence categories only — private keys and seed material; access tokens, API keys, session
  cookies, bearer tokens and authentication headers; passwords and credential-bearing connection
  strings; cloud-provider and service-account material; repository, package-registry, database and
  webhook credentials.
- **Scan point:** the assembled payload, after `buildPayload` and **before** any transmission or disk
  write — covering `featureSpec`, every story `title`/`content`, and all other string fields.
- **Default action on a high-confidence hit: `BLOCK` the send.** The payload is not transmitted and is
  **not** written to the failed-send queue (queuing it would only defer the same disclosure).
- **Reporting without disclosure:** the caller/user is told the **category** and **source location**
  (field, and file/line or offset) but never the value. The value must not appear in stdout, the
  history record, the failed-send queue, an error message, a stack trace, or a test fixture.
- **No silent mutation:** source artifacts are never altered. An optional, explicitly configured
  redaction mode may replace a detected value with a category placeholder in the *outbound copy only*
  — off by default, per §3.2.
- **`ALLOW` / `BLOCK` / `REVIEW` decision objects** shared by both parts (§1.4): stable reason code,
  human-readable explanation, policy version, correlation identifier, and redacted evidence.
- **`REVIEW` behaviour in this system:** there is no approval broker here. `REVIEW` prompts the human
  through the existing confirmation prompt when an interactive terminal is available, and **fails
  closed** otherwise.
- **Configuration** via the existing `src/config-factory.js` pattern (workspace root, protected paths,
  secret-detector toggles, redaction mode, policy version, enabled flag) plus one CLI command
  following the established `stack-config` / `cost-config` convention (view / set / reset).
- **Redacted, explicitly non-authoritative local decision records** appended to existing observability
  output (§1.3).
- **A visible limitation statement** in CLI output, so neither helper is mistaken for enforcement.

### Deferred / Out of Scope

**Excluded as infrastructure or deployment concerns — a different system, not this npm package.**
None of the following are deliverables of this feature, and none may be implied as delivered:
- Container security baseline: non-root user, dropped capabilities, no privileged mode or host
  runtime sockets, read-only base image, authorised mounts, resource limits, disposability (§2.1, AC 2).
- The security control plane as a deployed service, and any host supervisor or locked-down sidecar,
  including signed/versioned policy distribution and separate service identities (§1.3, §8.1).
- Model transport gateway and the pre-LLM / post-LLM guards that depend on owning the model call
  path (§1.2 items 1–3, §3.1) — murmur8 does not own the model transport; the host CLI does.
- Network egress gateway as infrastructure, allowlist enforcement, redirect re-evaluation, DNS
  rebinding defence, metadata/raw-IP/private-network blocking, proxy and tunnel prevention
  (§1.2 item 6, §5.1; AC 7–10, 29).
- Credential and operation broker, short-lived credential issuance, grant scoping and revocation
  (§5.2; AC 11–12, 30).
- Approval broker as an external service, cryptographic approval binding, single-use expiring
  approvals, pre-execution rebinding (§1.2 item 9, §7.3; AC 20–21, 31).
- Remote audit database, tamper-evident storage, workload identity, gateway authentication, sequence
  validation, heartbeats, and the control-plane outage matrix (§8.2–§8.3; AC 25–27, 34–37).

**Deferred to a named follow-on feature in this system**
- `feature_murm-path-guard` — the same guard applied to murmuration worktree paths in `src/murm.js`
  (identical slug-derived escape class; excluded only to keep this slice reviewable).
- Prompt-injection triage and provenance propagation (§3.1, §4; AC 17–19, 33).
- Personal-data classification and minimisation (§3.3; AC 16).
- Persistent external action pre-authorisation — pushes, PRs, releases, deployments (§5.3; AC 13–14, 32).

**Not attempted at all**
- Guarding shell commands, archive extraction, patch tools or version-control tools (full AC 6):
  murmur8's agents author artifacts through the **host CLI's own** Write / Edit / Bash tools, which
  this package cannot intercept. AC 6 holds only for murmur8's own Node write paths.
- Any claim of enforcement, sandboxing, or containment (§1.2, §2.3, §10).

---

## 3. Actors Involved

### Human User
- **Can:** set the workspace root, protected paths and detector configuration through trusted
  configuration; view policy via the config command; answer a `REVIEW` prompt interactively.
- **Cannot:** override a `BLOCK` for a path outside the workspace root (§2.4); override a
  high-confidence secret `BLOCK` for an outbound payload; approve anything non-interactively;
  change policy through feature or story content.

### murmur8 CLI / pipeline code (internal)
- **Can:** request a decision before each write and before each telemetry send; proceed on `ALLOW`;
  report reason codes on `BLOCK`.
- **Cannot:** cache a decision across operations; write or send without requesting one; log a
  detected secret value; enqueue a blocked payload.

### Pipeline agents (Alex, Cass, Nigel, Codey)
- **Can:** have murmur8-mediated writes validated and receive the reason code on refusal.
- **Cannot:** change policy, the workspace root, or the protected-path list. **Stated honestly:**
  their direct host-tool writes are not covered by this guard.

---

## 4. Behaviour Overview

- **Happy path (writes):** a write to `.blueprint/features/feature_<slug>/…` inside the root, not a
  protected path → `ALLOW`; behaviour identical to today. Existing passing runs stay passing.
- **Escape attempt:** absolute path outside the root, escaping `..` traversal, symlink escape, or a
  new target whose nearest existing parent escapes via symlink → `BLOCK`, no write, reason code plus
  violation category and resolved location — never file content.
- **Protected path:** a write inside the root to a designated protected path (e.g. `.git/`, `.env`)
  → `REVIEW`: prompt when interactive, refuse when not.
- **Malformed input:** empty path, NUL byte, UNC/device path, or a slug containing a separator →
  `BLOCK` with a distinct reason code.
- **Happy path (telemetry):** a clean payload → `ALLOW`; existing send, queue and retry behaviour
  unchanged.
- **Secret on egress:** a high-confidence hit → `BLOCK`. Nothing is transmitted, nothing is queued.
  The user sees category + location and guidance to remove the credential from the artifact. The run
  itself is unaffected — telemetry must never fail a pipeline run (SYSTEM_SPEC.md §8).
- **Configured redaction mode:** the outbound copy carries a category placeholder; the source artifact
  on disk is untouched; the substitution is recorded as a decision.
- **Guard disabled by configuration:** legacy behaviour plus a clearly visible warning that policy is
  not being applied.

---

## 5. State & Lifecycle Interactions

- **State-constraining.** No new pipeline stage, no new feature state; existing-stage operations are
  constrained (SYSTEM_SPEC.md §6).
- **States modified:** a refused write surfaces through the existing failure-handling path
  (SYSTEM_SPEC.md §8), so the queue records stage, reason and timestamp as it already does. A blocked
  telemetry send is recorded but never changes run status.
- **New persistent state:** one gitignored `*-config.json` file, matching existing convention
  (SYSTEM_SPEC.md §7).

---

## 6. Rules & Decision Logic

| # | Rule | Inputs | Output | Nature |
|---|------|--------|--------|--------|
| R1 | Workspace root is one absolute, existing, canonicalised directory from trusted config | configured root | canonical root or startup error | Deterministic |
| R2 | Reject empty, non-string, NUL-bearing, UNC or device-namespace paths | candidate | `BLOCK` + reason code | Deterministic |
| R3 | Resolve relative paths against the workspace root, never `process.cwd()` | candidate, root | absolute candidate | Deterministic |
| R4 | Canonicalise via real-path resolution of the deepest existing ancestor; containment by path relation, **not** string prefix | candidate, root | resolved path | Deterministic |
| R5 | Resolved target must be the root or a descendant | resolved path, root | `ALLOW` / `BLOCK` | Deterministic |
| R6 | `..` traversal and symlink escape are blocked, including via a new target's nearest existing parent | candidate, root | `BLOCK` + reason code | Deterministic |
| R7 | A configured protected path inside the root yields `REVIEW` | resolved path, protected list | `REVIEW` | Deterministic rule, discretionary outcome |
| R8 | `REVIEW` fails closed with no interactive approver | decision, TTY state | refusal | Deterministic |
| R9 | A slug must be one safe path segment | slug | `BLOCK` + reason code | Deterministic |
| R10 | Validation is re-performed immediately before each write; verdicts are never cached | call site | fresh decision | Deterministic |
| R11 | Scan every outbound string field of the assembled payload before transmission or disk write | payload | findings list | Deterministic |
| R12 | A high-confidence secret finding yields `BLOCK`: no transmission, no enqueue | findings | refusal | Deterministic |
| R13 | Report category and source location only; never emit, log, store or fixture the value | finding | redacted report | Deterministic |
| R14 | Never mutate source artifacts; outbound redaction only when explicitly configured | finding, config | outbound copy | Deterministic |
| R15 | Every decision carries reason code, message, policy version, correlation id, redacted evidence | decision inputs | decision object | Deterministic |
| R16 | An out-of-root `BLOCK` and a high-confidence secret `BLOCK` are not overridable by any flag or prompt | decision | refusal | Deterministic |
| R17 | Any internal guard or detector error is a refusal, never an `ALLOW` | error | fail closed | Deterministic |

---

## 7. Dependencies

- **System components:** `src/config-factory.js`, `src/utils.js` (interactive prompt),
  `src/telemetry.js` (`buildPayload`, `sendTelemetry`, `enqueueFailure`), `src/refine.js`,
  `src/interactive.js`, `src/history.js`, `bin/cli.js` (new config command route), `src/index.js` (exports).
- **Platform:** Node.js ≥ 18 `fs` / `path` / `crypto` only, using no-follow or directory-relative
  primitives where the platform supports them. **No new third-party dependency.**
- **External systems:** none. No control plane, no gateway, no database, no network in tests.
- **Operational:** the container and mount configuration remains the primary filesystem boundary
  (§2.1, §2.3) and is out of scope here. This feature is defence in depth behind it.

---

## 8. Non-Functional Considerations

- **Performance:** one real-path resolution per write; one linear scan of an already-assembled payload
  per run. Negligible against stage duration.
- **Audit/logging:** decision records carry path metadata, field names, categories and reason codes
  only — never file content, secret values, or personal data (§8.2). Records are explicitly
  non-authoritative.
- **Error tolerance:** fail closed (R17). Telemetry remains non-blocking: a blocked send must never
  fail a pipeline run.
- **Security implications — state plainly; this must not be softened downstream:**
  - Both helpers run **in the same process** as the pipeline they guard. Per source doc §1.2 and
    §2.3, an in-process check **is not an authoritative security boundary**.
  - The path guard covers **murmur8's own Node write paths only**. Agents author artifacts through
    the host CLI's Write / Edit / Bash tools, which murmur8 does not mediate.
  - The detector will not catch every secret (§10 non-goals). It targets high-confidence categories
    and will have false negatives; it is not a substitute for secret scanning in CI or for not
    putting credentials in artifacts.
  - These helpers therefore raise the cost of *accidental and mistaken* escape and disclosure, and
    provide a deterministic, testable policy core. They do **not** contain a determined or
    compromised agent, and they do not replace the excluded infrastructure controls.
  - No documentation, CLI output, story, or test derived from this spec may imply otherwise.
- **Backwards compatibility:** every currently-legitimate write and every clean telemetry send must
  still be `ALLOW`. These are guards, not behaviour changes.

---

## 9. Assumptions & Open Questions

**Assumptions**
- The configured workspace root is trusted startup input (CLI/environment), per §2.2.
- The repository root is a safe default workspace root for a murmur8 project.
- Node's real-path resolution is available on all supported platforms.

**Resolved decisions — human-approved 2026-08-17, binding on downstream stories and tests**
1. **Default protected-path list: `.git/` and `.env` only.** `.claude/` is **not** protected. The
   pipeline legitimately writes `implement-queue.json`, `pipeline-history.json` and
   `telemetry-failed.json` on every run; protecting them would force `REVIEW` during normal operation.
   *Was open question 1.*
2. **`history export --output=` outside the root → `REVIEW`,** not `BLOCK`. The user supplies this path
   directly, so exporting to e.g. `~/reports/` is legitimate; prompt when interactive, fail closed
   otherwise. This is the one call site where an out-of-root target is reviewable rather than refused —
   note the deliberate narrowing of R16, which otherwise makes out-of-root `BLOCK` non-overridable.
   *Was open question 2.*
3. **Detector suppresses obvious placeholders.** Values that are plainly synthetic (`xxx`, `example`,
   `REDACTED`, and equivalent placeholder shapes) are not findings. Accepted trade-off: a real secret
   shaped like a placeholder may be missed — consistent with the false-negative admission in §8.
   *Was open question 3.*

**Open questions — still flagged, not guessed**
4. **Guard-disabled escape hatch.** Should `enabled: false` exist at all? It is a self-service policy
   change, which §6 lists as prohibited. Proposed: retain for migration, warn loudly.
5. **Windows coverage depth.** UNC and device-namespace handling is specified, but the test environment
   is Linux; Windows behaviour may be untested.
6. **Murmuration worktrees.** Confirm deferral to `feature_murm-path-guard` is acceptable.

---

## 10. Impact on System Specification

**This feature stretches the system spec; the source document contradicts it.**

- **Reinforces:** SYSTEM_SPEC.md §3 (artifact management), §7 (artifact gates, no silent changes),
  §8 (observability), §9 (deterministic output given same inputs).
- **Stretches:** SYSTEM_SPEC.md contains no security or authorisation concern anywhere — §8 lists
  traceability, token limits, failure handling and observability, not policy enforcement. This is the
  system's first explicit decision-policy surface. Telemetry egress itself entered via
  `feature_pipeline-telemetry` and is still not named in §3.
- **Contradicts:** the source document assumes the implementing system **is an agent runtime**, with a
  container profile, a model transport, a network egress path, a credential broker and an audit
  database. murmur8 is none of these — it is a spec-driven workflow framework and CLI
  (SYSTEM_SPEC.md §1, §3). Roughly 32 of the 37 acceptance criteria cannot be satisfied by this
  system at any slice size, because they require deployed infrastructure outside an npm package.

**Proposed system spec changes (NOT applied — for human decision):**
1. Add a §8 subsection "Artifact Path & Egress Policy" naming the validated workspace root and
   pre-egress scanning as system invariants.
2. Add to §3 (Out of Scope), explicitly: *agent runtime containment, container hardening, network
   egress infrastructure, credential brokerage, human approval brokerage, and authoritative audit
   storage.* This closes the boundary question instead of re-litigating it per feature.
3. Record in §10 (Known Gaps) that the remainder of
   `.business_context/agent-runtime-secirity-controls.md` needs **a separate system spec for a separate
   system** — a security control plane — not further murmur8 features.

**Flagged for decision:** do not accept a future feature claiming to implement the source document's
enforcement guarantees inside this repository. It cannot be done here, and a spec implying it would be
a coherence failure.

---

## 11. Handover to BA (Cass)

**Story themes**
1. Trusted workspace root — configuration, canonicalisation, startup rejection of invalid roots.
2. Path validation decisions — malformed input, absolute escape, `..` escape, symlink escape, new
   target with a symlinked parent.
3. Shared decision-object contract — `ALLOW`/`BLOCK`/`REVIEW`, stable reason codes, policy version,
   correlation id, redaction (no content, no secret values in evidence).
4. Protected paths and `REVIEW` handling, including fail-closed when non-interactive.
5. Path-guard call-site adoption — the four named write paths, plus slug validation.
6. Telemetry secret detection — high-confidence categories, scan coverage of `featureSpec`, story
   `title`/`content` and other string fields.
7. Telemetry block semantics — no transmission, no enqueue, category + location reported, value never
   emitted, run status unaffected; optional configured outbound-only redaction.
8. Configuration and CLI surface (view / set / reset).
9. Non-regression: existing legitimate writes and clean sends behave exactly as today.

**Expected story boundaries**
- One story per theme. Themes 2 and 6 are the largest; split per escape class / per secret category if
  acceptance criteria exceed roughly six per story. Themes map to source doc AC 3, 4, 5, 15 and
  partial 6.

**Areas needing careful story framing**
- **Never write an acceptance criterion asserting enforcement, sandboxing, or containment.** Frame
  every criterion as "the helper returns decision X for input Y", "the write does not occur", or
  "the payload is not transmitted".
- Symlink and new-target-parent cases need real temp-directory filesystem fixtures, not string
  assertions — string-prefix comparison is explicitly forbidden by R4.
- Secret-detection tests must use synthetic, clearly-fake values, and must assert that the value does
  **not** appear in any output, queue file, or error message. Do not commit a real-shaped credential.
- Open questions 1, 2 and 3 (§9) shape acceptance criteria directly. Escalate them; do not resolve by
  assumption.
- No story may require Docker, a network call, or an external service — `node --test` only.

---

## 12. Change Log (Feature-Level)

| Date | Change | Reason | Raised By |
|------|--------|--------|-----------|
| 2026-08-17 | Initial spec: carved slice 1 (workspace-root path guard + telemetry egress secret scan) from `.business_context/agent-runtime-secirity-controls.md`; recorded scope tension and deferrals | Source requirement (37 AC, ~500 lines) far exceeds SYSTEM_SPEC.md §3 boundaries; needed one bounded, in-process, testable unit | Alex |
| 2026-08-17 | Narrowed to package-only scope; container/control-plane/gateway/broker/audit-database elements moved to explicit exclusions | User scope clarification: only what ships as murmur8 JS modules and runs under `node --test` with no network or Docker | Alex |
| 2026-08-17 | Resolved open questions 1–3 (§9): protected paths = `.git/` + `.env` only; `history export --output=` out-of-root → `REVIEW`; detector suppresses obvious placeholders. Run paused after Alex at user request; Cass not yet run | Human decision at the `--pause-after=alex` gate | User |
