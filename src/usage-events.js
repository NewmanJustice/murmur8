'use strict';

const fs = require('fs');
const { calculateCost, loadPricingConfig } = require('./cost');

const STAGE_ALIASES = {
  alex: 'alex',
  cass: 'cass',
  nigel: 'nigel-tests',
  'nigel-spec': 'nigel-spec',
  'nigel-tests': 'nigel-tests',
  codey: 'codey-implement',
  'codey-plan': 'codey-plan',
  'codey-implement': 'codey-implement',
};

function asFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function normalizeStageName(stageName) {
  if (typeof stageName !== 'string') return null;
  const key = stageName.trim().toLowerCase();
  return STAGE_ALIASES[key] || (key ? key : null);
}

function resolveStage(event, fallbackStage) {
  return normalizeStageName(
    fallbackStage ||
    event?.stage ||
    event?.stageName ||
    event?.pipelineStage ||
    event?.metadata?.stage ||
    event?.metadata?.stageName ||
    event?.metadata?.pipelineStage
  );
}

function resolveUsageTokens(event) {
  const usage = event?.usage && typeof event.usage === 'object' ? event.usage : {};
  const input = asFiniteNumber(
    usage.inputTokens ?? usage.input_tokens ?? event?.inputTokens ?? event?.input_tokens ?? event?.usage_input_tokens
  );
  const output = asFiniteNumber(
    usage.outputTokens ?? usage.output_tokens ?? event?.outputTokens ?? event?.output_tokens ?? event?.usage_output_tokens
  );
  const total = asFiniteNumber(
    usage.totalTokens ?? usage.total_tokens ?? event?.totalTokens ?? event?.total_tokens ?? event?.usage_total_tokens
  );
  return { input, output, total };
}

function createUsageCollector(options = {}) {
  const pricing = options.pricing || loadPricingConfig();
  const events = [];

  return {
    recordOnLlmEnd(stage, event = {}) {
      const resolvedStage = resolveStage(event, stage);
      if (!resolvedStage) return false;
      const tokens = resolveUsageTokens(event);
      if (tokens.input === undefined && tokens.output === undefined) return false;
      events.push({ stage: resolvedStage, usage: tokens });
      return true;
    },

    getEvents() {
      return events.map((e) => ({ stage: e.stage, usage: { ...e.usage } }));
    },

    getStageEconomics() {
      const perStage = {};
      for (const event of events) {
        const stage = event.stage;
        if (!perStage[stage]) perStage[stage] = { input: 0, output: 0, cost: 0 };
        const input = event.usage.input ?? 0;
        const output = event.usage.output ?? 0;
        perStage[stage].input += input;
        perStage[stage].output += output;
      }

      const out = {};
      for (const [stage, aggregate] of Object.entries(perStage)) {
        const tokens = {
          input: aggregate.input,
          output: aggregate.output,
          total: aggregate.input + aggregate.output,
        };
        const cost = calculateCost(tokens.input, tokens.output, pricing);
        out[stage] = { tokens, cost };
      }
      return out;
    },

    getRuntimeTotalCost() {
      const stageEconomics = this.getStageEconomics();
      const total = Object.values(stageEconomics).reduce((sum, stage) => sum + (stage.cost || 0), 0);
      return Math.round(total * 1000) / 1000;
    },

    toEnvSnapshot() {
      const stageEconomics = this.getStageEconomics();
      return {
        MURMUR8_ON_LLM_END_USAGE_JSON: JSON.stringify(this.getEvents()),
        MURMUR8_RUNTIME_STAGE_ECONOMICS_JSON: JSON.stringify(stageEconomics),
        MURMUR8_RUNTIME_TOTAL_COST: String(this.getRuntimeTotalCost()),
      };
    },
  };
}

function parseJsonArray(raw) {
  if (typeof raw !== 'string' || raw.trim() === '') return undefined;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : undefined;
  } catch (_) {
    return undefined;
  }
}

function parseJsonLines(raw) {
  if (typeof raw !== 'string' || raw.trim() === '') return undefined;
  const events = [];
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object') events.push(parsed);
    } catch (_) {
      return undefined;
    }
  }
  return events.length > 0 ? events : undefined;
}

function loadOnLlmEndEventsFromEnv(env = process.env) {
  const jsonEvents = parseJsonArray(env?.MURMUR8_ON_LLM_END_EVENTS_JSON);
  if (jsonEvents) return jsonEvents;

  const eventsFile = env?.MURMUR8_ON_LLM_END_EVENTS_FILE;
  if (typeof eventsFile !== 'string' || eventsFile.trim() === '') return undefined;
  if (!fs.existsSync(eventsFile)) return undefined;

  let contents;
  try {
    contents = fs.readFileSync(eventsFile, 'utf8');
  } catch (_) {
    return undefined;
  }

  return parseJsonArray(contents) || parseJsonLines(contents);
}

function hydrateRuntimeEnvFromOnLlmEndEvents(events, env = process.env, options = {}) {
  if (!Array.isArray(events) || events.length === 0) {
    return { recorded: 0, ignored: Array.isArray(events) ? events.length : 0 };
  }

  const collector = createUsageCollector(options);
  let recorded = 0;
  let ignored = 0;

  for (const event of events) {
    const accepted = collector.recordOnLlmEnd(
      event?.stage || event?.stageName || event?.pipelineStage || event?.metadata?.stage,
      event
    );
    if (accepted) recorded += 1;
    else ignored += 1;
  }

  if (recorded > 0) Object.assign(env, collector.toEnvSnapshot());
  return { recorded, ignored };
}

module.exports = {
  createUsageCollector,
  normalizeStageName,
  loadOnLlmEndEventsFromEnv,
  hydrateRuntimeEnvFromOnLlmEndEvents,
};
