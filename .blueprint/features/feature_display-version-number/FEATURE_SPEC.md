---
featureId: d480be2b-5d31-4a87-bbaa-2a564cd38c52
---
# Feature Specification — Display Version Number

**Feature slug:** `display-version-number`
**System Spec:** `.blueprint/system_specification/SYSTEM_SPEC.md`

---

## 1. Feature Intent

**Why this feature exists.**

- **Problem:** Users running `murmur8` have no way to quickly confirm which version of the package is installed. When filing bug reports or sharing configurations, they cannot state the version in use.
- **User need:** Developers need a fast, standard CLI affordance (`--version` / `-V`) to retrieve the installed murmur8 version without reading `package.json` directly.
- **System alignment:** murmur8 is distributed as an npm package (`murmur8`); version transparency is a baseline quality-of-life expectation for CLI tooling. This supports the system purpose of providing a dependable, professional workflow framework.

---

## 2. Scope

### In Scope
- A `--version` flag (and `-V` short alias) handled at the CLI entry point (`bin/cli.js`) that prints the version string from `package.json` and exits.
- A `version` sub-command (`murmur8 version`) as an alias for discoverability, listed in `help`.
- The version string format: plain semver with no decoration (e.g., `4.7.6`), printed to stdout, followed by a newline.
- The `help` output updated to reference the version command/flag.

### Out of Scope
- Version checking against a remote registry (update notifications) — deferred.
- Structured output formats (e.g., `--format=json`) — not needed for a version command.
- Displaying versions of peer dependencies (Node.js, Claude Code) — not in scope.
- Changelog or release notes output.

---

## 3. Actors Involved

### Human User (Developer)
- **Can do:** Run `murmur8 --version`, `murmur8 -V`, or `murmur8 version` to retrieve the installed version number.
- **Cannot do:** Modify the version via this command; this is read-only.

### CLI Entry Point (`bin/cli.js`)
- **Can do:** Intercept `--version` / `-V` flags and the `version` sub-command before any other command routing, read `package.json` version, print it, and exit 0.
- **Cannot do:** Spawn agents or modify queue state.

---

## 4. Behaviour Overview

**What the feature does, conceptually.**

- **Happy path — flag form:** User runs `murmur8 --version` or `murmur8 -V`. The CLI reads `version` from `package.json`, prints it to stdout (e.g., `4.7.6`), and exits with code 0.
- **Happy path — command form:** User runs `murmur8 version`. Behaviour is identical to flag form.
- **Help integration:** `murmur8 help` lists `version` and `--version` so the affordance is discoverable.
- **No side effects:** Running the version command does not read queue state, start agents, or write any files.
- **Exit behaviour:** Process exits immediately after printing; no banner, no decorative output beyond the version string.

---

## 5. State & Lifecycle Interactions

This feature is **state-constraining** (does not create or transition pipeline state) and **read-only**.

- No pipeline stages are entered.
- No queue state is read or modified.
- No `.claude/` files are touched.
- The feature activates before command routing, so it cannot conflict with any pipeline state.

---

## 6. Rules & Decision Logic

### Rule 1 — Flag intercept priority
- **Description:** `--version` and `-V` are checked before alias resolution and before command routing.
- **Inputs:** `process.argv`
- **Output:** Prints semver string, exits 0.
- **Deterministic:** Yes.

### Rule 2 — Command routing
- **Description:** If the first argument is `version` (after alias resolution), route to the version handler.
- **Inputs:** `args[0] === 'version'`
- **Output:** Prints semver string, exits 0.
- **Deterministic:** Yes.

### Rule 3 — Version source
- **Description:** Version is read from `package.json` at the project root (same directory as `bin/cli.js`'s parent). This ensures the displayed version always matches the installed package — no hardcoded strings.
- **Inputs:** `../package.json` relative to `bin/cli.js`
- **Output:** `version` field value.
- **Deterministic:** Yes.

### Rule 4 — Output format
- **Description:** Output is the bare semver string followed by a single newline. No prefix (e.g., no `murmur8 v4.7.6`), to support scripting and `grep`.
- **Inferred interpretation:** Bare version (e.g., `4.7.6`) is preferred over prefixed (`v4.7.6`) for scripting compatibility. This is an explicit assumption — see §9.

---

## 7. Dependencies

- `package.json` (root) — source of truth for the version string.
- `bin/cli.js` — entry point where flag/command intercept is added.
- `src/commands/help.js` — must be updated to document the new flag and command.
- No external systems or network dependencies.

---

## 8. Non-Functional Considerations

- **Performance:** Must execute and exit in under 100 ms; reading `package.json` via `require()` (sync, cached) is sufficient.
- **Reliability:** If `package.json` cannot be read, exit with a non-zero code and a descriptive error message. This is an edge case (malformed install) but must not silently fail.
- **Security:** No user input is echoed; no risk of injection.
- **Scripting compatibility:** Output must be machine-parseable (plain semver, no ANSI colour codes, no banner).

---

## 9. Assumptions & Open Questions

### Assumptions
- A1: The preferred output format is bare semver (e.g., `4.7.6`), not prefixed (e.g., `v4.7.6`), to maximise scripting compatibility. **If the team prefers a `v` prefix, this is easily changed.**
- A2: `murmur8 version` (sub-command) is added as an alias for discoverability; this is consistent with tools like `node --version` / `node version`.
- A3: No existing `version` command conflicts with this slug (confirmed: not present in `src/commands/`).
- A4: The flag intercept should happen before `require()` of any command module, to avoid side effects on a simple version query.

### Open Questions
- OQ1: Should the version command also display the Node.js version (e.g., `murmur8 4.7.6 (node 20.x)`)? Deferred — not in scope for this iteration.
- OQ2: Should a future `--check-update` flag compare against the npm registry? Deferred.

---

## 10. Impact on System Specification

- **Reinforces:** The system spec notes CLI tooling (`init`, `update`, `queue`, etc.) as in scope. A `version` command is a standard CLI affordance that reinforces the professional quality of the tooling.
- **No contradiction:** The system spec does not preclude this feature. It does not touch pipeline, queue, or agent concerns.
- **No system spec change required.** This feature is a straightforward CLI quality-of-life addition within existing boundaries.

---

## 11. Handover to BA (Cass)

**Story themes:**
1. As a developer, I want to run `murmur8 --version` so that I can confirm the installed version.
2. As a developer, I want `murmur8 version` as an alternative sub-command so the version is discoverable from help.
3. As a developer, I want the output to be machine-parseable so I can use it in scripts.

**Expected story boundaries:**
- One story per invocation path (`--version`/`-V` flag; `version` sub-command) is sufficient, or they can be collapsed into one if acceptance criteria covers both.
- A story for help discoverability (the `help` output update) may be folded into the above or treated as a separate concern.

**Areas needing careful story framing:**
- The output format assumption (bare semver vs. `v`-prefixed) should be explicit in acceptance criteria so Nigel can write a deterministic assertion.
- Error path (unreadable `package.json`) should be a separate AC, not a separate story.

---

## 12. Change Log (Feature-Level)

| Date | Change | Reason | Raised By |
|------|--------|--------|-----------|
| 2026-06-01 | Initial feature specification | New feature | Alex |
