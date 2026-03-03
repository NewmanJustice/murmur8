const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

// We'll dynamically require after temp dir setup
let createConfigModule;
let testDir;
let originalCwd;

describe('Config Factory', () => {
  beforeEach(() => {
    // Create temp directory and switch to it
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'config-factory-test-'));
    originalCwd = process.cwd();
    process.chdir(testDir);

    // Create .claude directory
    fs.mkdirSync('.claude', { recursive: true });

    // Require the factory module (will be created by Codey)
    createConfigModule = require('../src/config-factory').createConfigModule;
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('Factory Core Functions', () => {
    it('factory returns all expected methods', () => {
      const config = createConfigModule({
        name: 'test-config',
        file: '.claude/test-config.json',
        defaults: { key1: 'value1' }
      });

      assert.ok(typeof config.read === 'function', 'read is a function');
      assert.ok(typeof config.write === 'function', 'write is a function');
      assert.ok(typeof config.reset === 'function', 'reset is a function');
      assert.ok(typeof config.display === 'function', 'display is a function');
      assert.ok(typeof config.setValue === 'function', 'setValue is a function');
      assert.ok(typeof config.getDefault === 'function', 'getDefault is a function');
      assert.ok(typeof config.CONFIG_FILE === 'string', 'CONFIG_FILE is a string');
    });

    it('getDefault returns provided defaults', () => {
      const defaults = { maxRetries: 3, enabled: true };
      const config = createConfigModule({
        name: 'test-config',
        file: '.claude/test-config.json',
        defaults
      });

      const result = config.getDefault();
      assert.deepStrictEqual(result, defaults);
    });

    it('read returns defaults when file missing', () => {
      const defaults = { key1: 'default1', key2: 42 };
      const config = createConfigModule({
        name: 'test-config',
        file: '.claude/nonexistent.json',
        defaults
      });

      const result = config.read();
      assert.deepStrictEqual(result, defaults);
    });

    it('read returns defaults on corrupted file', () => {
      const configPath = '.claude/corrupted.json';
      fs.writeFileSync(configPath, '{ invalid json }');

      const defaults = { key1: 'default' };
      const config = createConfigModule({
        name: 'test-config',
        file: configPath,
        defaults
      });

      const result = config.read();
      assert.deepStrictEqual(result, defaults);
    });

    it('read merges missing keys from defaults', () => {
      const configPath = '.claude/partial.json';
      fs.writeFileSync(configPath, JSON.stringify({ existing: 'value' }));

      const defaults = { existing: 'default', newKey: 'newDefault' };
      const config = createConfigModule({
        name: 'test-config',
        file: configPath,
        defaults
      });

      const result = config.read();
      assert.strictEqual(result.existing, 'value', 'existing key preserved');
      assert.strictEqual(result.newKey, 'newDefault', 'missing key from defaults added');
    });

    it('write creates config file', () => {
      const configPath = '.claude/new-config.json';
      const config = createConfigModule({
        name: 'test-config',
        file: configPath,
        defaults: {}
      });

      config.write({ key1: 'written' });

      assert.ok(fs.existsSync(configPath), 'config file created');
      const content = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      assert.strictEqual(content.key1, 'written');
    });

    it('reset writes defaults to file', () => {
      const configPath = '.claude/reset-test.json';
      fs.writeFileSync(configPath, JSON.stringify({ custom: 'value' }));

      const defaults = { key1: 'default1' };
      const config = createConfigModule({
        name: 'test-config',
        file: configPath,
        defaults
      });

      config.reset();

      const content = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      assert.deepStrictEqual(content, defaults);
    });
  });

  describe('Validation', () => {
    it('setValue validates against validators map', () => {
      const config = createConfigModule({
        name: 'test-config',
        file: '.claude/validated.json',
        defaults: { threshold: 0.5 },
        validators: {
          threshold: (v) => {
            if (typeof v !== 'number' || v < 0 || v > 1) {
              return 'must be a number between 0 and 1';
            }
            return true;
          }
        }
      });

      assert.throws(
        () => config.setValue('threshold', '2.0'),
        /Invalid value for threshold.*must be a number between 0 and 1/
      );
    });

    it('setValue accepts valid values', () => {
      const configPath = '.claude/valid-values.json';
      const config = createConfigModule({
        name: 'test-config',
        file: configPath,
        defaults: { count: 5 },
        validators: {
          count: (v) => Number.isInteger(v) && v > 0 ? true : 'must be a positive integer'
        }
      });

      config.setValue('count', '10');

      const content = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      assert.strictEqual(content.count, 10);
    });

    it('setValue handles unknown keys', () => {
      const config = createConfigModule({
        name: 'test-config',
        file: '.claude/unknown-key.json',
        defaults: { validKey: 'value' }
      });

      assert.throws(
        () => config.setValue('unknownKey', 'value'),
        /Unknown config key: unknownKey/
      );
    });

    it('setValue handles array keys with JSON', () => {
      const configPath = '.claude/array-config.json';
      const config = createConfigModule({
        name: 'test-config',
        file: configPath,
        defaults: { items: [] },
        arrayKeys: ['items']
      });

      config.setValue('items', '["a","b","c"]');

      const content = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      assert.deepStrictEqual(content.items, ['a', 'b', 'c']);
    });

    it('setValue handles array with invalid JSON', () => {
      const config = createConfigModule({
        name: 'test-config',
        file: '.claude/invalid-array.json',
        defaults: { items: [] },
        arrayKeys: ['items']
      });

      assert.throws(
        () => config.setValue('items', 'not valid json'),
        /must be a valid JSON array/
      );
    });
  });

  describe('Display Formatting', () => {
    it('display uses custom formatters', () => {
      const logs = [];
      const originalLog = console.log;
      console.log = (...args) => logs.push(args.join(' '));

      const config = createConfigModule({
        name: 'test-config',
        file: '.claude/formatter-test.json',
        defaults: { duration: 30 },
        formatters: {
          duration: (v) => `${v} minutes`
        }
      });

      config.display();
      console.log = originalLog;

      assert.ok(logs.some(l => l.includes('30 minutes')), 'formatter applied');
    });

    it('display falls back to default format', () => {
      const logs = [];
      const originalLog = console.log;
      console.log = (...args) => logs.push(args.join(' '));

      const config = createConfigModule({
        name: 'test-config',
        file: '.claude/no-formatter.json',
        defaults: { simpleKey: 'simpleValue' }
      });

      config.display();
      console.log = originalLog;

      assert.ok(logs.some(l => l.includes('simpleValue')), 'default format works');
    });

    it('display handles arrays', () => {
      const logs = [];
      const originalLog = console.log;
      console.log = (...args) => logs.push(args.join(' '));

      const configPath = '.claude/array-display.json';
      fs.writeFileSync(configPath, JSON.stringify({ items: ['a', 'b', 'c'] }));

      const config = createConfigModule({
        name: 'test-config',
        file: configPath,
        defaults: { items: [] },
        arrayKeys: ['items']
      });

      config.display();
      console.log = originalLog;

      // Arrays should be displayed as comma-separated or JSON
      assert.ok(logs.some(l => l.includes('a') && l.includes('b')), 'array displayed');
    });
  });

  describe('Backward Compatibility', () => {
    it('retry config API unchanged', () => {
      // This tests that after refactoring, retry.js still exports the same API
      const retry = require('../src/retry');

      assert.ok(typeof retry.getDefaultConfig === 'function');
      assert.ok(typeof retry.readConfig === 'function');
      assert.ok(typeof retry.writeConfig === 'function');
      assert.ok(typeof retry.resetConfig === 'function');
      assert.ok(typeof retry.displayConfig === 'function');
      assert.ok(typeof retry.setConfigValue === 'function');
      assert.ok(typeof retry.CONFIG_FILE === 'string');
    });

    it('feedback config API unchanged', () => {
      const feedback = require('../src/feedback');

      assert.ok(typeof feedback.getDefaultConfig === 'function');
      assert.ok(typeof feedback.readConfig === 'function');
      assert.ok(typeof feedback.writeConfig === 'function');
      assert.ok(typeof feedback.resetConfig === 'function');
      assert.ok(typeof feedback.displayConfig === 'function');
      assert.ok(typeof feedback.setConfigValue === 'function');
      assert.ok(typeof feedback.CONFIG_FILE === 'string');
    });

    it('stack config API unchanged', () => {
      const stack = require('../src/stack');

      assert.ok(typeof stack.getDefaultStackConfig === 'function');
      assert.ok(typeof stack.readStackConfig === 'function');
      assert.ok(typeof stack.writeStackConfig === 'function');
      assert.ok(typeof stack.resetStackConfig === 'function');
      assert.ok(typeof stack.displayStackConfig === 'function');
      assert.ok(typeof stack.setStackConfigValue === 'function');
      assert.ok(typeof stack.CONFIG_FILE === 'string');
    });

    it('murm config API unchanged', () => {
      const murm = require('../src/murm');

      assert.ok(typeof murm.getDefaultMurmConfig === 'function');
      assert.ok(typeof murm.readMurmConfig === 'function');
      assert.ok(typeof murm.writeMurmConfig === 'function');
    });
  });

  describe('Error Message Consistency', () => {
    it('error format standardized for validation', () => {
      const config = createConfigModule({
        name: 'test-config',
        file: '.claude/error-test.json',
        defaults: { threshold: 0.5 },
        validators: {
          threshold: (v) => {
            if (v < 0 || v > 1) return 'must be between 0 and 1';
            return true;
          }
        }
      });

      try {
        config.setValue('threshold', '5');
        assert.fail('Should have thrown');
      } catch (err) {
        assert.ok(
          err.message.includes('Invalid value for threshold'),
          `Error should mention key: ${err.message}`
        );
        assert.ok(
          err.message.includes('5'),
          `Error should mention value: ${err.message}`
        );
      }
    });

    it('unknown key error format', () => {
      const config = createConfigModule({
        name: 'test-config',
        file: '.claude/error-key.json',
        defaults: { knownKey: 'value' }
      });

      try {
        config.setValue('badKey', 'value');
        assert.fail('Should have thrown');
      } catch (err) {
        assert.ok(
          err.message.includes('Unknown config key: badKey'),
          `Error format: ${err.message}`
        );
        assert.ok(
          err.message.includes('knownKey'),
          `Error should list valid keys: ${err.message}`
        );
      }
    });
  });
});
