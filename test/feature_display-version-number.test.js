'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const ROOT = path.resolve(__dirname, '..');
const CLI = path.join(ROOT, 'bin', 'cli.js');
const PKG_VERSION = require('../package.json').version;
const SEMVER_RE = /^\d+\.\d+\.\d+$/;
const ANSI_RE = /\x1b\[[0-9;]*m/;

function run(...args) {
  return spawnSync(process.execPath, [CLI, ...args], {
    encoding: 'utf8',
    cwd: ROOT,
  });
}

// ---------------------------------------------------------------------------
// Story: Version Invocation (version-invocation)
// ---------------------------------------------------------------------------

describe('display-version-number — Version Invocation', () => {

  // DVN-1: --version flag prints bare semver, exits 0
  it('DVN-1: --version prints bare semver and exits 0', () => {
    const result = run('--version');
    assert.strictEqual(result.status, 0, `expected exit 0, got ${result.status}; stderr: ${result.stderr}`);
    const out = result.stdout;
    assert.match(out.trim(), SEMVER_RE, `stdout "${out.trim()}" does not match semver`);
    assert.strictEqual(out, `${out.trim()}\n`, 'stdout must be semver + exactly one trailing newline');
  });

  // DVN-2: -V output identical to --version
  it('DVN-2: -V output is identical to --version output', () => {
    const long = run('--version');
    const short = run('-V');
    assert.strictEqual(short.status, 0, `expected exit 0, got ${short.status}`);
    assert.strictEqual(short.stdout, long.stdout, '-V stdout must equal --version stdout');
  });

  // DVN-3: version sub-command output identical to --version
  it('DVN-3: version sub-command output is identical to --version output', () => {
    const flag = run('--version');
    const sub = run('version');
    assert.strictEqual(sub.status, 0, `expected exit 0, got ${sub.status}`);
    assert.strictEqual(sub.stdout, flag.stdout, 'version sub-command stdout must equal --version stdout');
  });

  // DVN-4: version matches package.json at runtime
  it('DVN-4: printed version matches package.json version field', () => {
    const result = run('--version');
    assert.strictEqual(result.stdout.trim(), PKG_VERSION,
      `stdout "${result.stdout.trim()}" does not match package.json version "${PKG_VERSION}"`);
  });

  // DVN-5: no v-prefix
  it('DVN-5: output has no "v" prefix', () => {
    const result = run('--version');
    assert.ok(!result.stdout.startsWith('v'), `stdout must not start with "v", got "${result.stdout.trim()}"`);
  });

  // DVN-6: no ANSI codes
  it('DVN-6: output contains no ANSI escape codes', () => {
    const result = run('--version');
    assert.ok(!ANSI_RE.test(result.stdout),
      `stdout contains ANSI codes: "${result.stdout}"`);
  });

  // DVN-7: no .claude/ side effects
  it('DVN-7: no files under .claude/ are created or modified', () => {
    const claudeDir = path.join(ROOT, '.claude');
    function snapshot(dir) {
      if (!fs.existsSync(dir)) return {};
      const result = {};
      for (const entry of fs.readdirSync(dir, { recursive: true })) {
        const full = path.join(dir, entry);
        try {
          result[entry] = fs.statSync(full).mtimeMs;
        } catch { /* ignore */ }
      }
      return result;
    }
    const before = snapshot(claudeDir);
    run('--version');
    const after = snapshot(claudeDir);
    assert.deepStrictEqual(after, before, '.claude/ directory state changed after --version invocation');
  });

  // DVN-8: error path — missing package.json → non-zero exit, stderr message, empty stdout
  it('DVN-8: missing package.json causes non-zero exit with stderr message and no stdout', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dvn8-'));
    try {
      // Copy only bin/cli.js into a minimal tmp project (no package.json)
      const binDir = path.join(tmp, 'bin');
      fs.mkdirSync(binDir);
      const cliSrc = fs.readFileSync(CLI, 'utf8');
      const tmpCli = path.join(binDir, 'cli.js');
      // Adjust require path so relative requires still resolve from ROOT,
      // but package.json is deliberately absent in tmp.
      // We invoke with a custom MURMUR8_PKG_ROOT env var pointing to tmp
      // so the implementation can use it. However, since the implementation
      // does not exist yet, this test is a forward contract:
      // We run the real CLI from ROOT but with a fake cwd that has no package.json.
      // The CLI must handle the missing package.json gracefully.
      // Strategy: run the real CLI with NODE_PATH still pointing at ROOT's node_modules
      // but override cwd to a directory with no package.json.
      // The implementation is expected to resolve package.json relative to __dirname
      // (i.e., relative to bin/cli.js), not cwd — so we test by renaming it temporarily.
      const pkgPath = path.join(ROOT, 'package.json');
      const pkgBackup = path.join(tmp, 'package.json.bak');
      fs.copyFileSync(pkgPath, pkgBackup);
      fs.unlinkSync(pkgPath);
      try {
        const result = spawnSync(process.execPath, [CLI, '--version'], {
          encoding: 'utf8',
          cwd: ROOT,
        });
        assert.notStrictEqual(result.status, 0,
          'expected non-zero exit when package.json is missing');
        assert.ok(result.stderr.length > 0,
          'expected a descriptive error message on stderr');
        assert.strictEqual(result.stdout.trim(), '',
          `expected empty stdout when package.json is missing, got "${result.stdout}"`);
      } finally {
        fs.copyFileSync(pkgBackup, pkgPath);
      }
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

});

// ---------------------------------------------------------------------------
// Story: Version Help Discoverability (version-help-discoverability)
// ---------------------------------------------------------------------------

describe('display-version-number — Help Discoverability', () => {

  let helpOut;

  before(() => {
    const result = run('help');
    assert.strictEqual(result.status, 0, `help command failed: ${result.stderr}`);
    helpOut = result.stdout;
  });

  // DVN-9: help output lists the version sub-command
  it('DVN-9: help output lists the version sub-command', () => {
    assert.ok(helpOut.includes('version'),
      'help output does not contain "version"');
  });

  // DVN-10: help output documents --version flag
  it('DVN-10: help output documents the --version flag', () => {
    assert.ok(helpOut.includes('--version'),
      'help output does not contain "--version"');
  });

  // DVN-11: help output documents -V alias
  it('DVN-11: help output documents the -V alias', () => {
    assert.ok(helpOut.includes('-V'),
      'help output does not contain "-V"');
  });

});
