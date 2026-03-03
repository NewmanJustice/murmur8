const fs = require('fs');
const path = require('path');
const { colorize } = require('./theme');

const REQUIRED_DIRS = ['.blueprint', '.business_context', '.claude/commands'];
const AGENT_FILES = [
  'AGENT_SPECIFICATION_ALEX.md',
  'AGENT_BA_CASS.md',
  'AGENT_TESTER_NIGEL.md',
  'AGENT_DEVELOPER_CODEY.md'
];
const SYSTEM_SPEC_PATH = '.blueprint/system_specification/SYSTEM_SPEC.md';
const SKILL_PATH = '.claude/commands/implement-feature.md';
const MIN_NODE_VERSION = 18;

function checkDirectories() {
  const missing = REQUIRED_DIRS.filter(dir => !fs.existsSync(dir));
  const passed = missing.length === 0;
  return {
    name: 'Required directories',
    passed,
    message: passed
      ? 'All required directories exist'
      : `Missing directories: ${missing.join(', ')}`,
    fix: passed ? null : 'Run `murmur8 init` to initialize project'
  };
}

function checkSystemSpec() {
  const exists = fs.existsSync(SYSTEM_SPEC_PATH);
  return {
    name: 'System specification',
    passed: exists,
    message: exists
      ? 'System specification exists'
      : `Missing: ${SYSTEM_SPEC_PATH}`,
    fix: exists ? null : 'Run `murmur8 init` to create system specification'
  };
}

function checkAgentSpecs() {
  const agentsDir = '.blueprint/agents';
  if (!fs.existsSync(agentsDir)) {
    return {
      name: 'agent specifications',
      passed: false,
      message: 'Missing: .blueprint/agents directory',
      fix: 'Run `murmur8 init` to create agent specification files'
    };
  }

  const missing = AGENT_FILES.filter(f => !fs.existsSync(path.join(agentsDir, f)));
  const passed = missing.length === 0;
  return {
    name: 'agent specifications',
    passed,
    message: passed
      ? 'All agent specifications exist'
      : `Missing agent files: ${missing.join(', ')}`,
    fix: passed ? null : 'Run `murmur8 init` to create agent specification files'
  };
}

function checkBusinessContext() {
  const dir = '.business_context';
  if (!fs.existsSync(dir)) {
    return {
      name: 'business context',
      passed: false,
      message: 'Missing: .business_context directory',
      fix: 'Run `murmur8 init` to create .business_context directory'
    };
  }

  let files;
  try {
    files = fs.readdirSync(dir).filter(f => !f.startsWith('.'));
  } catch {
    files = [];
  }

  const passed = files.length > 0;
  return {
    name: 'business context',
    passed,
    message: passed
      ? 'Business context directory has content'
      : 'Business context directory is empty',
    fix: passed ? null : 'Add at least one file to `.business_context/` directory'
  };
}

function checkSkillsInstalled() {
  const exists = fs.existsSync(SKILL_PATH);
  return {
    name: 'skills installed',
    passed: exists,
    message: exists
      ? 'Required skills are installed'
      : `Missing: ${SKILL_PATH}`,
    fix: exists ? null : 'Run `murmur8 init` to install required skills'
  };
}

function checkNodeVersion() {
  const versionStr = process.version;
  const majorVersion = parseInt(versionStr.slice(1).split('.')[0], 10);
  const passed = majorVersion >= MIN_NODE_VERSION;
  return {
    name: 'Node.js version',
    passed,
    message: passed
      ? `Node.js ${majorVersion} meets minimum requirement (>=${MIN_NODE_VERSION})`
      : `Node.js ${majorVersion} is below minimum requirement (>=${MIN_NODE_VERSION})`,
    fix: passed ? null : `Upgrade Node.js to version ${MIN_NODE_VERSION} or higher`,
    detectedVersion: versionStr
  };
}

async function validate() {
  const checks = [
    checkDirectories(),
    checkSystemSpec(),
    checkAgentSpecs(),
    checkBusinessContext(),
    checkSkillsInstalled(),
    checkNodeVersion()
  ];

  const success = checks.every(c => c.passed);
  const exitCode = success ? 0 : 1;

  return { success, exitCode, checks };
}

function formatOutput(result, useColor = false) {
  const lines = [];

  const passIndicator = useColor ? colorize('\u2713', 'green', useColor) : '[PASS]';
  const failIndicator = useColor ? colorize('\u2717', 'red', useColor) : '[FAIL]';

  for (const check of result.checks) {
    const indicator = check.passed ? passIndicator : failIndicator;
    lines.push(`${indicator} ${check.name}: ${check.message}`);
    if (!check.passed && check.fix) {
      lines.push(`  Fix: ${check.fix}`);
    }
  }

  lines.push('');
  if (result.success) {
    lines.push(colorize('All checks passed. Project is ready.', 'green', useColor));
  } else {
    const failedCount = result.checks.filter(c => !c.passed).length;
    lines.push(colorize(`${failedCount} check(s) failed.`, 'red', useColor));
  }

  return lines.join('\n');
}

module.exports = {
  validate,
  formatOutput,
  checkNodeVersion
};
