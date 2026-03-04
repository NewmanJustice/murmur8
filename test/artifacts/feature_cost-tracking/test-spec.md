# Test Specification - Cost Tracking

## Understanding

The cost tracking feature provides visibility into token consumption and estimated costs during pipeline execution. It extends the history module to record input/output tokens per stage, calculates costs using configurable pricing (default: Claude Sonnet pricing at $3/M input, $15/M output), and provides CLI commands to display cost data. Per FEATURE_SPEC.md:Section 5, this extends existing history entries with new fields without changing pipeline flow. Backward compatible: missing token data displays "N/A".

Key behaviors: token tracking per stage, cost calculation with rounding to 3 decimal places, cost summary display at pipeline completion, `--cost` flag for history command, and `cost-config` CLI command.

---

## AC to Test ID Mapping

### Token Tracking & Recording

| AC | Test ID | Scenario |
|----|---------|----------|
| AC-1 | T-TT-1.1 | Record input tokens per stage |
| AC-1 | T-TT-1.2 | Record output tokens per stage |
| AC-1 | T-TT-1.3 | Calculate total input tokens across all stages |
| AC-1 | T-TT-1.4 | Calculate total output tokens across all stages |
| AC-2 | T-TT-2.1 | Skipped stages record 0 tokens |
| AC-3 | T-TT-3.1 | Failed stages record tokens up to failure point |

### Cost Calculation

| AC | Test ID | Scenario |
|----|---------|----------|
| AC-4 | T-CC-1.1 | Calculate cost using default pricing |
| AC-4 | T-CC-1.2 | Calculate cost using custom pricing |
| AC-5 | T-CC-2.1 | Cost rounded to 3 decimal places |
| AC-5 | T-CC-2.2 | Very small costs round correctly |
| AC-6 | T-CC-3.1 | Total cost sums all stage costs |

### Cost Formatting & Display

| AC | Test ID | Scenario |
|----|---------|----------|
| AC-7 | T-CF-1.1 | Format cost with dollar sign and 3 decimals |
| AC-7 | T-CF-1.2 | Format tokens with thousands separator |
| AC-8 | T-CF-2.1 | Generate cost summary table |
| AC-8 | T-CF-2.2 | Summary includes all stages |
| AC-8 | T-CF-2.3 | Summary includes totals row |

### History Integration

| AC | Test ID | Scenario |
|----|---------|----------|
| AC-9 | T-HI-1.1 | History entry includes token data |
| AC-9 | T-HI-1.2 | History entry includes cost per stage |
| AC-9 | T-HI-1.3 | History entry includes total cost |
| AC-10 | T-HI-2.1 | Legacy entries without tokens show N/A |
| AC-10 | T-HI-2.2 | Missing token data handled gracefully |

### Configuration

| AC | Test ID | Scenario |
|----|---------|----------|
| AC-11 | T-CG-1.1 | Load default pricing config |
| AC-11 | T-CG-1.2 | Load custom pricing from config file |
| AC-11 | T-CG-1.3 | Missing config file uses defaults |
| AC-12 | T-CG-2.1 | Update input price in config |
| AC-12 | T-CG-2.2 | Update output price in config |
| AC-12 | T-CG-2.3 | Reset config to defaults |

---

## Key Assumptions

- Cost module at `src/cost.js` exporting `calculateCost()`, `formatCost()`, `formatTokens()`, `getCostSummary()`, `getDefaultPricing()`, `loadPricingConfig()`, `savePricingConfig()`
- Config stored at `.claude/cost-config.json` (gitignored)
- Default pricing: Claude Sonnet 3.5 at $3/M input, $15/M output (per FEATURE_SPEC.md:Section 6)
- Stage names: alex, cass, nigel, codey-plan, codey-implement
- Token data may be unavailable from Claude API; graceful degradation required
- Costs are estimates only; display should indicate this
