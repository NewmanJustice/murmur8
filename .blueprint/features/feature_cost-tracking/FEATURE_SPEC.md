# Feature Specification — Cost Tracking

## 1. Feature Intent
**Why this feature exists.**

- Users have no visibility into token consumption or estimated costs when running the pipeline
- Without cost data, users cannot identify expensive stages or optimize prompt efficiency
- Cost awareness enables informed decisions about when to use `--skip-stories` or other optimizations
- Aligns with existing observability patterns (history, insights, feedback) in the system spec

> This feature reinforces Section 8 (Cross-Cutting Concerns: Observability) of the System Spec.

---

## 2. Scope
### In Scope
- Track input/output tokens per agent stage (alex, cass, nigel, codey-plan, codey-implement)
- Estimate cost per stage using configurable pricing (default: Claude Sonnet pricing)
- Store token/cost data in pipeline history alongside existing timing data
- Display cost summary at pipeline completion
- Add `--cost` flag to `history` command to show cost breakdowns
- Add `cost-config` CLI command for pricing configuration

### Out of Scope
- Real-time token streaming (report after each stage completes)
- Multi-model pricing within a single run (assumes one model for entire pipeline)
- Billing integration or payment tracking
- Token optimization recommendations (covered by insights.js)
- Cost alerts or budget limits (potential future feature)

---

## 3. Actors Involved

| Actor | Role in Cost Tracking |
|-------|----------------------|
| Human User | Views cost summaries, configures pricing, uses data for optimization decisions |
| Pipeline Orchestrator | Records token usage at each stage transition |
| History Module | Persists and retrieves cost data |
| Each Agent (Alex, Cass, Nigel, Codey) | Token consumption is measured but agents are unaware of tracking |

---

## 4. Behaviour Overview

**Happy Path:**
1. User runs `/implement-feature "slug"`
2. At each stage completion, orchestrator records tokens used (input + output)
3. Pipeline completion displays cost summary table
4. History entry includes token/cost data per stage

**Cost Summary Display (at pipeline end):**
```
Cost Summary for feature: user-auth

STAGE            INPUT     OUTPUT    COST
alex             2,450     1,230     $0.014
cass             3,100     1,850     $0.019
nigel            2,800     2,100     $0.018
codey-plan       1,500       890     $0.009
codey-impl       4,200     3,500     $0.028
─────────────────────────────────────────
TOTAL           14,050     9,570     $0.088
```

**History with Costs:**
```bash
$ murmur8 history --cost

SLUG                STATUS    DURATION   TOTAL COST
user-auth           success   12m 30s    $0.088
api-validation      success    8m 15s    $0.062
cache-layer         failed     4m 22s    $0.031 (failed at: nigel)
```

**Stats with Costs:**
```bash
$ murmur8 history --stats --cost

Pipeline Statistics (based on 15 runs)

METRIC                    VALUE
...existing stats...
Avg cost per run          $0.075
Total cost (all runs)     $1.12
Most expensive stage      codey-implement ($0.42 total)
```

---

## 5. State & Lifecycle Interactions

**State additions to history entry:**
```json
{
  "slug": "user-auth",
  "stages": {
    "alex": {
      "durationMs": 45000,
      "tokens": { "input": 2450, "output": 1230 },
      "cost": 0.014
    }
  },
  "totalTokens": { "input": 14050, "output": 9570 },
  "totalCost": 0.088
}
```

**Lifecycle:**
- **State-extending:** Adds new fields to existing history entries
- No new states created
- Backward compatible (missing token data displays "N/A")

---

## 6. Rules & Decision Logic

| Rule | Description | Deterministic |
|------|-------------|---------------|
| Token counting | Sum of input + output tokens per stage | Yes |
| Cost calculation | `(input_tokens * input_price) + (output_tokens * output_price)` | Yes |
| Default pricing | Claude Sonnet 3.5: $3/M input, $15/M output | Yes (configurable) |
| Skipped stages | Record 0 tokens for skipped stages (e.g., Cass when `--skip-stories`) | Yes |
| Failed stages | Record tokens consumed up to failure point | Yes |
| Rounding | Costs rounded to 3 decimal places ($0.001 precision) | Yes |

---

## 7. Dependencies

**System Dependencies:**
- `src/history.js` - Extended to store/retrieve token data
- `.claude/pipeline-history.json` - Schema extended with token fields

**New Files:**
- `src/cost.js` - Token counting, cost calculation, formatting
- `src/commands/cost-config.js` - CLI command for pricing config
- `.claude/cost-config.json` - Pricing configuration (gitignored)

**Technical Dependencies:**
- Claude Code must expose token usage in Task tool responses
- If token data unavailable, feature gracefully degrades to "N/A"

---

## 8. Non-Functional Considerations

| Concern | Consideration |
|---------|---------------|
| Performance | Token counting adds negligible overhead (<1ms per stage) |
| Storage | ~100 bytes additional per history entry |
| Backward compatibility | Existing history entries without token data display "N/A" |
| Accuracy | Estimated costs only; actual billing may differ |
| Privacy | No sensitive data; token counts are numeric |

---

## 9. Assumptions & Open Questions

**Assumptions:**
- Claude Code Task tool responses include token usage metadata
- Single pricing model per pipeline run is acceptable
- Users want cost visibility but not enforcement (no budget limits)

**Open Questions:**
- How does Claude Code expose token usage? Via response metadata or separate API?
- Should we support custom pricing for enterprise/volume discounts?
- Should cost data be included in CSV/JSON exports by default?

---

## 10. Impact on System Specification

**Reinforces existing patterns:**
- Section 8 (Observability) - Adds cost as new observability dimension
- Section 9 (Reliability) - Token data helps diagnose token limit failures

**No contradictions identified.**

**Suggested System Spec addition (Section 8):**
```markdown
### Cost Visibility
- Token usage tracked per stage
- Estimated costs calculated and persisted
- Cost summaries available via `history --cost`
```

---

## 11. Handover to BA (Cass)

**Story themes:**
1. **Core tracking** - Record token usage at each stage completion
2. **Cost calculation** - Apply pricing model to token counts
3. **Display** - Show cost summary at pipeline end
4. **History integration** - Store in history, display in `history` command
5. **Configuration** - `cost-config` command for pricing settings

**Expected story boundaries:**
- Story 1: Token tracking infrastructure (cost.js, history schema)
- Story 2: Cost calculation and formatting
- Story 3: Pipeline completion summary display
- Story 4: History command integration (`--cost` flag)
- Story 5: Configuration CLI (`cost-config` command)

**Areas needing careful framing:**
- Graceful degradation when token data unavailable
- Backward compatibility with existing history entries
- Cost display formatting (currency, precision)

---

## 12. Change Log (Feature-Level)
| Date | Change | Reason | Raised By |
|-----|------|--------|-----------|
| 2026-03-04 | Initial spec | Enable cost visibility for pipeline optimization | Alex |
