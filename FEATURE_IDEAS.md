# Feature Ideas

Suggested features to implement using the `/implement-feature` pipeline.

## Backlog

### Priority Definitions

| Priority | Meaning |
|----------|---------|
| **P0** | Critical — do before release |
| **P1** | High — do soon |
| **P2** | Medium — nice to have |
| **P3** | Low — future consideration |

### Effort Definitions

| Effort | Meaning |
|--------|---------|
| **S** | Small — <1 hour, <50 lines |
| **M** | Medium — 1-3 hours, 50-200 lines |
| **L** | Large — 3-8 hours, 200-500 lines |
| **XL** | Extra Large — 1+ days, 500+ lines |

### Status Key

- ✅ Done
- 🚧 In Progress
- ⏳ Planned
- 💡 Idea

---

## Parallel Safeguards (P0 — Before Release)

| Status | Feature | Effort | Description |
|--------|---------|--------|-------------|
| ✅ | parallel-confirm | S | Confirmation prompt before execution |
| ✅ | parallel-lock | S | Lock file to prevent concurrent runs |
| ✅ | parallel-logging | M | Output to log files per pipeline |
| ✅ | parallel-abort | M | Abort command to stop all and cleanup |
| ✅ | parallel-preflight | M | Validate feature specs, detect conflicts before execution |

## High Priority (P1)

| Status | Feature | Effort | Description |
|--------|---------|--------|-------------|
| ✅ | parallel-timeout | M | Timeout per pipeline to prevent runaway |
| ✅ | parallel-disk-check | S | Warn if disk space is low |
| ✅ | parallel-max-limit | S | Cap total features to prevent resource exhaustion |
| ⏳ | cost-tracking | M | Track token usage and estimated costs |
| ⏳ | export-history | S | Export history to CSV/JSON |
| ⏳ | diff-preview | S | Show diff before auto-commit |

## Medium Priority (P2)

| Status | Feature | Effort | Description |
|--------|---------|--------|-------------|
| ✅ | parallel-features | L | Run multiple pipelines in parallel (DONE) |
| ✅ | parallel-progress | M | Real-time progress per pipeline |
| ⏳ | agent-timeouts | M | Configurable timeouts per stage |
| ⏳ | rollback | M | Revert a feature's commits |
| ⏳ | agent-overrides | M | Per-project agent customization |
| ⏳ | resume-from-stage | M | Resume from specific stage |

## Low Priority (P3)

| Status | Feature | Effort | Description |
|--------|---------|--------|-------------|
| ✅ | parallel-rollback | M | Undo failed parallel run |
| 💡 | dry-run-mode | M | Validate without running agents |
| 💡 | feature-dependencies | M | Define execution order |
| 💡 | webhook-notifications | L | Slack/email on completion |
| 💡 | mcp-integration | XL | Expose murmur8 as MCP tools |
| 💡 | mcp-repos-server | XL | Cross-repo context for distributed monoliths |
| 💡 | cli-doctor | S | Diagnose CLI setup (symlinks, permissions, skill validity) |
| 💡 | cross-cli-insights | M | Track which CLI used per run, compare performance |
| 💡 | skill-lint | S | Validate skill YAML frontmatter and required sections |
| 💡 | aider-adapter | M | Symlink/config for Aider CLI compatibility |
| 💡 | cursor-adapter | M | Skill format for Cursor Composer |

---

## Details

### Parallel Safeguards

#### parallel-confirm
Confirmation prompt before starting parallel execution:
```
This will:
  • Create 3 git worktrees
  • Run 3 parallel pipelines
  • Estimated disk usage: ~150MB

Continue? [y/N]
```
- Skip with `--yes` or `-y` flag
- Prevents accidental execution

#### parallel-lock
Lock file to prevent running parallel twice simultaneously:
- Create `.claude/parallel.lock` with PID on start
- Check if lock exists and process is running before starting
- Clean up lock on completion or abort
- `--force` flag to override (with warning)

#### parallel-logging
Write each pipeline's output to a log file:
- Location: `.claude/worktrees/feat-{slug}/pipeline.log`
- Keeps console clean - only show summary status
- `--verbose` flag to also stream to console
- Timestamps on each line for debugging

#### parallel-abort
Command to stop all running pipelines and clean up:
```bash
murmur8 murm abort           # Stop all, preserve worktrees
murmur8 murm abort --cleanup # Stop all, remove worktrees
```
- Send SIGTERM to child processes
- Update queue state to 'aborted'
- Option to preserve worktrees for debugging

#### parallel-timeout
Timeout per pipeline to prevent runaway processes:
- Default: 30 minutes per pipeline
- Configure: `parallel-config set timeout 60` (minutes)
- Override: `--timeout=45` flag
- On timeout: kill process, mark as failed, preserve worktree

#### parallel-disk-check
Check available disk space before starting:
- Estimate space needed: ~50MB per worktree
- Warn if less than 500MB available
- `--skip-disk-check` to override
- Show current disk usage in dry-run output

#### parallel-max-limit
Cap total features that can be queued:
- Default: 10 features max
- Configure: `parallel-config set maxFeatures 20`
- Prevents accidentally overwhelming the system
- Error message with current limit if exceeded

### export-history
Complements the existing history/insights modules. Would allow users to:
- Export to CSV for spreadsheet analysis
- Export to JSON for custom dashboards
- Filter by date range (`--since`, `--until`), status, or feature
- `murmur8 history export --format=csv --since=2024-01-01`
- Useful for team reporting and metrics tracking

### agent-timeouts
Safety feature to prevent runaway agents:
- Configurable timeout per stage (default: 5 min)
- Also support `--timeout=10m` flag for one-off overrides
- Graceful termination with status recording
- Save partial work before termination for recovery
- Integrates with retry logic (timeout = retriable failure)

### dry-run-mode
Validation-only mode (note: true dry-run would require mocking agents):
- Validate all required inputs exist
- Check specs are complete and well-formed
- Estimate token usage based on input sizes
- Show expected output file paths
- `--dry-run` flag on `/implement-feature`

### resume-from-stage
More granular recovery than current queue-based resume:
- `--resume-from=nigel` to skip Alex and Cass
- Primary use case: "I edited Cass's output manually, now run from Nigel"
- Validates required artifacts exist before proceeding
- Warns if artifacts are older than expected (stale detection)

### webhook-notifications
External integrations:
- Slack webhook on completion/failure
- Email notifications
- Custom webhook URLs
- Would need secure credential storage
- **Consider:** Start with simple shell hooks (`on-complete`, `on-failure`) instead

### cost-tracking
Track API usage for budgeting and optimization:
- Record token counts per stage (input/output)
- Calculate estimated cost using model pricing
- Add `--cost` flag to `murmur8 history`
- Show cost trends in `murmur8 insights`
- Helps identify expensive stages for optimization

### diff-preview
Safety check before auto-commit:
- Show `git diff` of all changes before committing
- Prompt user to confirm, abort, or edit commit message
- Flag `--no-diff-preview` to skip (for CI/automation)
- Prevents accidental commits of unintended changes

### rollback
Undo a feature implementation:
- `murmur8 rollback <feature-slug>` reverts commits
- Uses git history to find commits by feature
- Shows preview of what will be reverted
- Supports `--dry-run` to preview without reverting

### agent-overrides
Per-project agent customization:
- Create `.blueprint/agents/overrides/AGENT_*.md` files
- Override content is appended to base agent specs
- Allows project-specific instructions without forking
- Example: Add domain-specific testing requirements for Nigel

### parallel-features ✅ DONE
Implemented in v2.7. See README for documentation.

### feature-dependencies
Define execution order for related features:
- Add `depends_on: [feat-a, feat-b]` to feature spec
- Pipeline refuses to start until dependencies complete
- `murmur8 deps <slug>` shows dependency graph
- Useful for features that build on each other

### mcp-integration
Expose murmur8 as MCP tools:
- `implement-feature` as an MCP tool
- `get-pipeline-status` for monitoring
- `get-insights` for analytics
- Enables integration with other AI systems and workflows

### mcp-repos-server (Distributed Monolith Support)

MCP server for cross-repository context in distributed architectures. Enables agents to understand service boundaries, API contracts, and event schemas across multiple repositories.

**Problem:** In a distributed monolith, a feature in repo A might depend on APIs in repo B, events from repo C, and shared types from repo D. Without cross-repo visibility, agents make assumptions that lead to integration failures.

**Proposed MCP Tools:**

| Tool | Purpose |
|------|---------|
| `list_repos` | List all repos in the architecture |
| `get_service_info` | Get metadata, dependencies, events for a service |
| `get_api_contract` | Fetch OpenAPI/GraphQL/gRPC specs |
| `get_event_schema` | Fetch Avro/JSON Schema/Protobuf for events |
| `search_repos` | Search across repos for types, APIs, code |
| `get_shared_types` | Fetch common type definitions |
| `get_dependency_graph` | Visualize upstream/downstream dependencies |

**Configuration via `.blueprint/architecture.yaml`:**
```yaml
organization: my-org

repos:
  - name: user-service
    url: github.com/my-org/user-service
    type: service
    api: api/openapi.yaml

  - name: order-service
    url: github.com/my-org/order-service
    type: service
    api: api/openapi.yaml

  - name: shared-types
    url: github.com/my-org/shared-types
    type: library

  - name: event-schemas
    url: github.com/my-org/event-schemas
    type: schemas
    path: schemas/

this_service: order-service

cache:
  enabled: true
  ttl: 3600
  local_path: .blueprint/contracts/
```

**Example: Alex Using Cross-Repo Context:**
```
Feature: Add order cancellation

1. get_dependency_graph("order-service")
   → Depends on: user-service, payment-service
   → Publishes to: notification-service

2. get_api_contract("payment-service")
   → Finds: POST /refunds endpoint
   → Notes: requires orderId, amount, reason

3. get_event_schema("order.cancelled")
   → Schema doesn't exist
   → Notes: need to create new event

4. search_repos("OrderStatus", scope="types")
   → Finds: enum missing CANCELLED value
```

**Output in FEATURE_SPEC.md:**
```markdown
## Integration Points

| Service | Direction | Contract | Notes |
|---------|-----------|----------|-------|
| payment-service | upstream | POST /refunds (v2) | Trigger refund |
| notification-service | downstream | order.cancelled | New event needed |
| shared-types | shared | OrderStatus enum | Add CANCELLED |
```

**Phased Implementation:**

1. **Phase 1: Local Cache** — `murmur8 sync-contracts` populates `.blueprint/contracts/`
2. **Phase 2: MCP Server** — Real-time access via GitHub API with caching
3. **Phase 3: Smart Sync** — Diff detection, version pinning, staleness warnings

**Alternative (Simpler):**
Central contracts repo as git submodule:
```bash
git submodule add github.com/my-org/contracts .blueprint/contracts
```
No MCP needed — contracts always available locally.

**Security Considerations:**
- Read-only access (never writes to external repos)
- Minimal GitHub token permissions (repo:read)
- Rate limiting with aggressive caching
- Secret filtering (never expose .env from other repos)

### cli-doctor
Diagnose and fix CLI setup issues:
- Check symlinks exist and point to valid files
- Verify YAML frontmatter is valid
- Check file permissions
- Test that skill is discoverable by each CLI
- `murmur8 doctor` outputs checklist with ✓/✗
- `murmur8 doctor --fix` attempts auto-repair

### cross-cli-insights
Track CLI tool used in pipeline history:
- Record `cli: "claude-code"` or `cli: "copilot-cli"` per run
- `murmur8 insights --by-cli` shows performance comparison
- Useful for teams using both tools to identify which works better for their codebase
- Could reveal patterns like "Copilot CLI faster for tests, Claude Code better for implementation"

### skill-lint
Validate skill files before CLI tries to use them:
- Check YAML frontmatter has required fields (`name`, `description`)
- Validate name is lowercase-with-hyphens
- Check markdown structure has expected sections
- `murmur8 lint` or integrated into `murmur8 validate`
- Prevents cryptic CLI errors from malformed skills

### aider-adapter
Support for Aider CLI (another popular AI coding tool):
- Research Aider's command format
- Generate appropriate config/prompt file
- Symlink or copy to Aider's expected location
- Same `/implement-feature` experience across three CLIs

### cursor-adapter
Support for Cursor's Composer feature:
- Research how Cursor handles custom commands/prompts
- May need different approach (Cursor uses `.cursorrules`)
- Could generate project rules that reference the pipeline
- Goal: consistent experience across all major AI coding tools

---

## Technical Debt / Refactoring

| Priority | Item | Effort | Description |
|----------|------|--------|-------------|
| P2 | split-cli-commands | M | `bin/cli.js` is 400+ lines — extract command handlers to `src/commands/*.js` |
| P2 | config-factory | M | DRY up retry/feedback/murm/stack-config — shared pattern with validation |
| P3 | theme-adoption | S | Use `src/theme.js` consistently across all output (not just murm) |
| P3 | fix-status-icons | S | `STATUS_ICONS` in theme.js still uses `parallel_*` — rename to `murm_*` |
| P3 | extract-prompt-util | S | `prompt()` function in init.js duplicated — extract to `src/utils.js` |
| P3 | skill-modularize | L | SKILL.md is 850+ lines — consider splitting into composable sections |

### Notes

**split-cli-commands**: Current structure puts all logic in cli.js. Pattern would be:
```
bin/cli.js           → Router only
src/commands/init.js → Handler + help text
src/commands/murm.js → Handler + help text
```

**config-factory**: All config modules follow same pattern:
- `getDefaultConfig()`, `readConfig()`, `writeConfig()`, `displayConfig()`, `setConfigValue()`
- Could be: `createConfigModule({ name, defaults, validators })`

**theme-adoption**: The pipeline skill output could use `formatStageStart()` and `colorize()` for consistent branding across CLI and skill execution.

---

*To implement any of these, run:*
```bash
/implement-feature "feature-name"
```
