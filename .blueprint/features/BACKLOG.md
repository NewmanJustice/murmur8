# Feature Backlog

## Definitions

| Priority | Meaning |
|----------|---------|
| P0 | Critical — blocker |
| P1 | High — do soon |
| P2 | Medium — planned |
| P3 | Low — future |

| Effort | Meaning |
|--------|---------|
| S | Small — <1 hour |
| M | Medium — 1-3 hours |
| L | Large — 3-8 hours |
| XL | Extra Large — 1+ days |

| Status | Meaning |
|--------|---------|
| ⏳ | Ready to implement |
| 🚧 | In progress |
| ❓ | Needs clarification |

---

## TODO 

Make sure pipeline sends telemetry data

## Backlog

| Status | P | E | Slug | Description |
|--------|---|---|------|-------------|
| ❓ | P1 | M | murm-subagent | Use Task tool sub-agents instead of spawning CLI processes |
| ⏳ | P2 | M | agent-timeouts | Configurable timeouts per agent stage |
| ⏳ | P2 | M | rollback | Revert a feature's commits |
| ⏳ | P2 | M | agent-overrides | Per-project agent customization |
| ⏳ | P2 | M | resume-from-stage | Resume pipeline from specific stage |
| ⏳ | P3 | M | dry-run-mode | Validate inputs without running agents |
| ⏳ | P3 | M | feature-dependencies | Define execution order for related features |
| ⏳ | P3 | L | webhook-notifications | Slack/email on completion |
| ⏳ | P3 | XL | mcp-integration | Expose murmur8 as MCP tools |
| ⏳ | P3 | XL | mcp-repos-server | Cross-repo context for distributed monoliths |
| ⏳ | P3 | S | cli-doctor | Diagnose CLI setup issues |
| ⏳ | P3 | M | cross-cli-insights | Track which CLI used per run |
| ⏳ | P3 | S | skill-lint | Validate skill YAML frontmatter |
| ⏳ | P3 | M | aider-adapter | Support for Aider CLI |
| ⏳ | P3 | M | cursor-adapter | Support for Cursor Composer |
| ⏳ | P3 | L | docey-agent | Fifth agent to update docs after implementation |
| ⏳ | P3 | M | backlog-tooling | CLI commands for backlog management |
| ⏳ | P3 | L | skill-modularize | Split SKILL.md into composable sections |

---

## Details

### murm-subagent

Murmuration currently spawns separate CLI processes. This doesn't work inside an existing Claude Code session. Should use Task tool sub-agents instead for parallel features.

### agent-timeouts

Configurable timeout per stage (default: 5 min). Support `--timeout=10m` flag. Graceful termination with status recording.

### rollback

`murmur8 rollback <feature-slug>` to revert commits. Uses git history to find commits by feature. Supports `--dry-run`.

### agent-overrides

Per-project agent customization via `.blueprint/agents/overrides/AGENT_*.md`. Override content appended to base specs.

### resume-from-stage

More granular than queue-based resume. `--resume-from=nigel` to skip earlier stages. Validates artifacts exist first.

### docey-agent

Fifth agent to update README/CLAUDE.md after Codey implements. Identifies user-facing changes and updates docs automatically.

### mcp-repos-server

MCP server for cross-repository context in distributed architectures. See FEATURE_IDEAS.md for full specification.

### backlog-tooling

CLI commands: `npx murmur8 backlog`, `backlog add`, `backlog next`, `backlog murm P1`.

---

## Notes

- Items removed automatically when pipeline completes successfully
- Run with: `/implement-feature "slug"` or `npx murmur8 murm slug-a slug-b`
