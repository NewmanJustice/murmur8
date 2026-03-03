const fs = require('fs');
const path = require('path');
const { colorize } = require('./theme');

const CONFIG_FILE = '.claude/stack-config.json';

/**
 * Returns the default (empty) stack configuration.
 */
function getDefaultStackConfig() {
  return {
    language: '',
    runtime: '',
    packageManager: '',
    frameworks: [],
    testRunner: '',
    testCommand: '',
    linter: '',
    tools: []
  };
}

/**
 * Ensures the .claude directory exists.
 */
function ensureConfigDir() {
  const dir = path.dirname(CONFIG_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Reads the stack config from file.
 * Returns defaults if file is missing or corrupted.
 */
function readStackConfig() {
  ensureConfigDir();
  if (!fs.existsSync(CONFIG_FILE)) {
    return getDefaultStackConfig();
  }
  try {
    const content = fs.readFileSync(CONFIG_FILE, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    return getDefaultStackConfig();
  }
}

/**
 * Writes the stack config to file.
 */
function writeStackConfig(config) {
  ensureConfigDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

/**
 * Resets stack config to defaults by writing empty config to file.
 */
function resetStackConfig() {
  writeStackConfig(getDefaultStackConfig());
}

const VALID_KEYS = [
  'language', 'runtime', 'packageManager',
  'frameworks', 'testRunner', 'testCommand',
  'linter', 'tools'
];

const ARRAY_KEYS = ['frameworks', 'tools'];

/**
 * Sets a config value by key.
 * Array keys (frameworks, tools) accept JSON array strings.
 * @param {string} key - Config key
 * @param {string} value - New value (string or JSON array string)
 */
function setStackConfigValue(key, value) {
  if (!VALID_KEYS.includes(key)) {
    throw new Error(
      `Unknown config key: ${key}. Valid keys: ${VALID_KEYS.join(', ')}`
    );
  }

  const config = readStackConfig();

  if (ARRAY_KEYS.includes(key)) {
    // Try parsing as JSON array
    try {
      const parsed = JSON.parse(value);
      if (!Array.isArray(parsed)) {
        throw new Error(`${key} must be a JSON array, e.g. '["express","react"]'`);
      }
      config[key] = parsed;
    } catch (err) {
      if (err.message.includes('must be a JSON array')) throw err;
      throw new Error(`${key} must be a valid JSON array, e.g. '["express","react"]'`);
    }
  } else {
    config[key] = value;
  }

  writeStackConfig(config);
  const display = Array.isArray(config[key]) ? JSON.stringify(config[key]) : config[key];
  console.log(`Set ${key} = ${display}`);
}

/**
 * Auto-detect tech stack from project files.
 * Scans for manifest files and infers configuration.
 * @param {string} projectDir - Directory to scan (defaults to cwd)
 * @returns {object} Detected stack config
 */
function detectStackConfig(projectDir) {
  const dir = projectDir || process.cwd();
  const config = getDefaultStackConfig();

  const exists = (file) => fs.existsSync(path.join(dir, file));
  const readJSON = (file) => {
    try {
      return JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    } catch {
      return null;
    }
  };
  const readText = (file) => {
    try {
      return fs.readFileSync(path.join(dir, file), 'utf8');
    } catch {
      return null;
    }
  };

  // Node.js / JavaScript detection
  if (exists('package.json')) {
    config.language = 'JavaScript';
    config.runtime = 'Node.js';

    const pkg = readJSON('package.json');
    if (pkg) {
      // Runtime version from engines
      if (pkg.engines && pkg.engines.node) {
        config.runtime = `Node.js ${pkg.engines.node}`;
      }

      const deps = pkg.dependencies || {};
      const devDeps = pkg.devDependencies || {};
      const allDeps = { ...deps, ...devDeps };

      // Frameworks
      const frameworkNames = [
        'express', 'fastify', 'koa', 'react', 'next',
        'vue', 'angular', 'hapi', 'nest', '@hapi/hapi', '@nestjs/core'
      ];
      const detected = [];
      for (const fw of frameworkNames) {
        if (fw in deps || fw in devDeps) {
          // Normalize package names to friendly names
          if (fw === '@hapi/hapi') detected.push('hapi');
          else if (fw === '@nestjs/core') detected.push('nest');
          else detected.push(fw);
        }
      }
      if (detected.length > 0) config.frameworks = detected;

      // Test runner
      const testRunners = ['jest', 'mocha', 'vitest', 'ava'];
      for (const tr of testRunners) {
        if (tr in devDeps || tr in deps) {
          config.testRunner = tr;
          break;
        }
      }

      // Test command from scripts
      if (pkg.scripts && pkg.scripts.test) {
        config.testCommand = pkg.scripts.test;
        // Also try to detect test runner from test script if not found in deps
        if (!config.testRunner) {
          for (const tr of testRunners) {
            if (pkg.scripts.test.includes(tr)) {
              config.testRunner = tr;
              break;
            }
          }
        }
      }
      if (!config.testCommand) {
        config.testCommand = 'npm test';
      }

      // Linter
      const linters = ['eslint', 'biome', 'oxlint', '@biomejs/biome'];
      for (const l of linters) {
        if (l in devDeps || l in deps) {
          if (l === '@biomejs/biome') config.linter = 'biome';
          else config.linter = l;
          break;
        }
      }

      // Tools
      const toolNames = ['nodemon', 'supertest', 'prettier', 'typescript'];
      const detectedTools = [];
      for (const t of toolNames) {
        if (t in devDeps || t in deps) {
          detectedTools.push(t);
        }
      }
      if (detectedTools.length > 0) config.tools = detectedTools;

      // Package manager from lockfiles
      if (exists('yarn.lock')) {
        config.packageManager = 'yarn';
      } else if (exists('pnpm-lock.yaml')) {
        config.packageManager = 'pnpm';
      } else {
        config.packageManager = 'npm';
      }
    }
  }

  // TypeScript overrides JavaScript
  if (exists('tsconfig.json')) {
    config.language = 'TypeScript';
    if (!config.runtime) config.runtime = 'Node.js';
  }

  // Python detection
  if (exists('pyproject.toml') || exists('requirements.txt')) {
    config.language = 'Python';
    config.runtime = 'Python 3.x';

    const pyproject = readText('pyproject.toml');
    if (pyproject) {
      // Test runner
      if (pyproject.includes('pytest')) config.testRunner = 'pytest';
      else if (pyproject.includes('unittest')) config.testRunner = 'unittest';

      // Linter/tools
      if (pyproject.includes('ruff')) config.linter = 'ruff';
      else if (pyproject.includes('flake8')) config.linter = 'flake8';

      const pyTools = [];
      if (pyproject.includes('black')) pyTools.push('black');
      if (pyproject.includes('mypy')) pyTools.push('mypy');
      if (pyTools.length > 0) config.tools = pyTools;

      // Frameworks
      const pyFrameworks = [];
      if (pyproject.includes('django')) pyFrameworks.push('django');
      if (pyproject.includes('flask')) pyFrameworks.push('flask');
      if (pyproject.includes('fastapi')) pyFrameworks.push('fastapi');
      if (pyFrameworks.length > 0) config.frameworks = pyFrameworks;
    }

    // Package manager
    if (exists('poetry.lock')) config.packageManager = 'poetry';
    else if (exists('Pipfile.lock') || exists('Pipfile')) config.packageManager = 'pipenv';
    else config.packageManager = 'pip';

    if (!config.testCommand && config.testRunner) {
      config.testCommand = config.testRunner === 'pytest' ? 'pytest' : 'python -m unittest';
    }
  }

  // Go detection
  if (exists('go.mod')) {
    config.language = 'Go';
    config.runtime = 'Go';
    config.testRunner = 'go test';
    config.testCommand = 'go test ./...';
  }

  // Rust detection
  if (exists('Cargo.toml')) {
    config.language = 'Rust';
    config.runtime = 'Rust';
    config.packageManager = 'cargo';
    config.testRunner = 'cargo test';
    config.testCommand = 'cargo test';
  }

  // Ruby detection
  if (exists('Gemfile')) {
    config.language = 'Ruby';
    config.runtime = 'Ruby';
    config.packageManager = 'bundler';
  }

  return config;
}

/**
 * Displays the current stack configuration.
 */
function displayStackConfig() {
  const config = readStackConfig();
  const useColor = process.stdout.isTTY;

  console.log('\n' + colorize('Stack Configuration', 'cyan', useColor) + '\n');
  console.log(`  language:       ${config.language || '(not set)'}`);
  console.log(`  runtime:        ${config.runtime || '(not set)'}`);
  console.log(`  packageManager: ${config.packageManager || '(not set)'}`);
  console.log(`  frameworks:     ${config.frameworks.length > 0 ? config.frameworks.join(', ') : '(not set)'}`);
  console.log(`  testRunner:     ${config.testRunner || '(not set)'}`);
  console.log(`  testCommand:    ${config.testCommand || '(not set)'}`);
  console.log(`  linter:         ${config.linter || '(not set)'}`);
  console.log(`  tools:          ${config.tools.length > 0 ? config.tools.join(', ') : '(not set)'}`);
  console.log('\nTo change: murmur8 stack-config set <key> <value>');
}

module.exports = {
  CONFIG_FILE,
  getDefaultStackConfig,
  readStackConfig,
  writeStackConfig,
  resetStackConfig,
  setStackConfigValue,
  detectStackConfig,
  displayStackConfig
};
