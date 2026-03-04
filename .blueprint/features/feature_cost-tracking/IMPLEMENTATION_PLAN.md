# Implementation Plan — Cost Tracking

## Summary

Implement a cost tracking module (`src/cost.js`) that calculates token costs using configurable pricing, integrate it with the existing history module to persist cost data per stage, and add CLI commands for displaying costs (`history --cost`) and managing pricing configuration (`cost-config`).

## Files to Create/Modify

| Path | Action | Purpose |
|------|--------|---------|
| `src/cost.js` | Create | Core module: cost calculation, formatting, pricing config |
| `src/commands/cost-config.js` | Create | CLI command for managing pricing configuration |
| `src/history.js` | Modify | Add `--cost` display support, cost data in formatters |
| `src/commands/history.js` | Modify | Parse `--cost` flag and pass to display functions |
| `src/commands/help.js` | Modify | Add `cost-config` command to help output |
| `.gitignore` | Modify | Add `.claude/cost-config.json` entry |

## Implementation Steps

1. **Create `src/cost.js`** — Implement core functions using `config-factory.js` pattern:
   - `getDefaultPricing()` — Returns `{ inputPricePerMillion: 3, outputPricePerMillion: 15 }`
   - `loadPricingConfig()` / `savePricingConfig()` — Read/write `.claude/cost-config.json`
   - `calculateCost(inputTokens, outputTokens, pricing)` — Formula per FEATURE_SPEC.md Section 6
   - `formatCost(cost)` — Returns `$X.XXX` or `N/A` for null/undefined
   - `formatTokens(tokens)` — Returns number with thousands separator or `N/A`
   - `getCostSummary(stages)` — Generates formatted cost summary table

2. **Create `src/commands/cost-config.js`** — CLI command following `retry-config.js` pattern:
   - `cost-config` — Display current pricing
   - `cost-config set <key> <value>` — Update pricing
   - `cost-config reset` — Reset to defaults

3. **Modify `src/history.js`** — Extend `displayHistory()` and `showStats()`:
   - Add `cost` option parameter to `displayHistory()`
   - Display `TOTAL COST` column when `--cost` flag present
   - Add cost statistics to `showStats()` when cost data available
   - Handle legacy entries gracefully (display N/A for missing token data)

4. **Modify `src/commands/history.js`** — Parse `--cost` flag:
   - Pass `{ cost: flags.cost }` to `displayHistory()` and `showStats()`

5. **Modify `src/commands/help.js`** — Add `cost-config` to command list

6. **Update `.gitignore`** — Add `.claude/cost-config.json` entry

## Risks/Questions

- **Token data availability**: Claude Code must expose token usage in Task tool responses. If unavailable, gracefully degrade to N/A.
- **History schema migration**: No migration needed — new fields are additive and missing data displays as N/A.
- **Pricing accuracy**: Costs are estimates only; document this in CLI output.
