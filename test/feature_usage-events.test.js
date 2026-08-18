'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  createUsageCollector,
  normalizeStageName,
  loadOnLlmEndEventsFromEnv,
  hydrateRuntimeEnvFromOnLlmEndEvents,
} = require('../src/usage-events');

describe('Usage event collector', () => {
  it('normalizes stage aliases', () => {
    assert.equal(normalizeStageName('Alex'), 'alex');
    assert.equal(normalizeStageName('nigel'), 'nigel-tests');
    assert.equal(normalizeStageName('codey'), 'codey-implement');
  });

  it('records on_llm_end usage events and exports env snapshot', () => {
    const collector = createUsageCollector({
      pricing: { inputPricePerMillion: 3, outputPricePerMillion: 15 },
    });

    assert.equal(collector.recordOnLlmEnd('alex', { usage: { input_tokens: 100, output_tokens: 40 } }), true);
    assert.equal(collector.recordOnLlmEnd('alex', { usage_input_tokens: 10, usage_output_tokens: 5 }), true);
    assert.equal(collector.recordOnLlmEnd('nigel', { usage: { total_tokens: 50 } }), false);

    const events = collector.getEvents();
    assert.equal(events.length, 2);
    assert.equal(events[0].stage, 'alex');

    const economics = collector.getStageEconomics();
    assert.deepEqual(economics.alex.tokens, { input: 110, output: 45, total: 155 });
    assert.ok(typeof economics.alex.cost === 'number');

    const env = collector.toEnvSnapshot();
    assert.ok(env.MURMUR8_ON_LLM_END_USAGE_JSON.includes('"stage":"alex"'));
    assert.ok(env.MURMUR8_RUNTIME_STAGE_ECONOMICS_JSON.includes('"alex"'));
    assert.ok(Number.isFinite(Number(env.MURMUR8_RUNTIME_TOTAL_COST)));
  });

  it('loads hook events from env JSON or file and hydrates runtime telemetry env vars', () => {
    const event = { stage: 'alex', usage: { input_tokens: 7, output_tokens: 11 } };
    const fromJson = loadOnLlmEndEventsFromEnv({
      MURMUR8_ON_LLM_END_EVENTS_JSON: JSON.stringify([event]),
    });
    assert.equal(fromJson.length, 1);

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'm8-usage-events-'));
    try {
      const eventsPath = path.join(tmpDir, 'events.jsonl');
      fs.writeFileSync(eventsPath, `${JSON.stringify(event)}\n`);
      const fromFile = loadOnLlmEndEventsFromEnv({
        MURMUR8_ON_LLM_END_EVENTS_FILE: eventsPath,
      });
      assert.equal(fromFile.length, 1);

      const runtimeEnv = {};
      const result = hydrateRuntimeEnvFromOnLlmEndEvents(fromFile, runtimeEnv);
      assert.equal(result.recorded, 1);
      assert.equal(result.ignored, 0);
      assert.ok(runtimeEnv.MURMUR8_ON_LLM_END_USAGE_JSON.includes('"stage":"alex"'));
      assert.ok(runtimeEnv.MURMUR8_RUNTIME_STAGE_ECONOMICS_JSON.includes('"alex"'));
      assert.ok(Number.isFinite(Number(runtimeEnv.MURMUR8_RUNTIME_TOTAL_COST)));
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
