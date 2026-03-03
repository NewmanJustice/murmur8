const fs = require('fs');
const path = require('path');
const readline = require('readline');

const { detectStackConfig, writeStackConfig, CONFIG_FILE: STACK_CONFIG_FILE } = require('./stack');

const PACKAGE_ROOT = path.resolve(__dirname, '..');
const TARGET_DIR = process.cwd();

async function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase().trim());
    });
  });
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function updateGitignore() {
  const gitignorePath = path.join(TARGET_DIR, '.gitignore');
  const entriesToAdd = [
    '# murmur8',
    '.claude/implement-queue.json',
    '.claude/pipeline-history.json',
    '.claude/stack-config.json'
  ];

  let content = '';
  if (fs.existsSync(gitignorePath)) {
    content = fs.readFileSync(gitignorePath, 'utf8');
  }

  const newEntries = entriesToAdd.filter(entry => !content.includes(entry));

  if (newEntries.length > 0) {
    const addition = '\n' + newEntries.join('\n') + '\n';
    fs.appendFileSync(gitignorePath, addition);
    console.log('Updated .gitignore');
  }
}

/**
 * Create symlink for Copilot CLI
 * Links .github/skills/implement-feature/SKILL.md -> .claude/commands/implement-feature.md
 */
function createCopilotSymlink() {
  const copilotSkillDir = path.join(TARGET_DIR, '.github', 'skills', 'implement-feature');
  const copilotSkillPath = path.join(copilotSkillDir, 'SKILL.md');
  const claudeSkillPath = path.join(TARGET_DIR, '.claude', 'commands', 'implement-feature.md');

  // Relative path from .github/skills/implement-feature/ to .claude/commands/
  const relativePath = path.relative(copilotSkillDir, claudeSkillPath);

  // Create directory
  fs.mkdirSync(copilotSkillDir, { recursive: true });

  // Remove existing symlink or file
  if (fs.existsSync(copilotSkillPath)) {
    fs.unlinkSync(copilotSkillPath);
  }

  // Create symlink
  try {
    fs.symlinkSync(relativePath, copilotSkillPath);
    console.log('Created Copilot CLI symlink at .github/skills/implement-feature/SKILL.md');
    return true;
  } catch (err) {
    console.warn(`Warning: Could not create symlink: ${err.message}`);
    // Fallback: copy the file instead
    fs.copyFileSync(claudeSkillPath, copilotSkillPath);
    console.log('Copied skill to .github/skills/implement-feature/SKILL.md (symlink failed)');
    return false;
  }
}

async function init() {
  const blueprintSrc = path.join(PACKAGE_ROOT, '.blueprint');
  const blueprintDest = path.join(TARGET_DIR, '.blueprint');
  const businessContextSrc = path.join(PACKAGE_ROOT, '.business_context');
  const businessContextDest = path.join(TARGET_DIR, '.business_context');
  const skillSrc = path.join(PACKAGE_ROOT, 'SKILL.md');
  const claudeCommandsDir = path.join(TARGET_DIR, '.claude', 'commands');
  const skillCommandDest = path.join(claudeCommandsDir, 'implement-feature.md');

  // Check if .blueprint already exists
  if (fs.existsSync(blueprintDest)) {
    const answer = await prompt('.blueprint directory already exists. Overwrite? (y/N): ');
    if (answer !== 'y' && answer !== 'yes') {
      console.log('Aborted. Use "murmur8 update" to update existing installation.');
      return;
    }
    fs.rmSync(blueprintDest, { recursive: true });
  }

  // Copy skill to .claude/commands/ (master location)
  fs.mkdirSync(claudeCommandsDir, { recursive: true });
  if (fs.existsSync(skillCommandDest)) {
    const answer = await prompt('.claude/commands/implement-feature.md already exists. Overwrite? (y/N): ');
    if (answer !== 'y' && answer !== 'yes') {
      console.log('Skipping skill installation');
    } else {
      fs.copyFileSync(skillSrc, skillCommandDest);
      console.log('Copied skill to .claude/commands/implement-feature.md');
      createCopilotSymlink();
    }
  } else {
    fs.copyFileSync(skillSrc, skillCommandDest);
    console.log('Copied skill to .claude/commands/implement-feature.md');
    createCopilotSymlink();
  }

  // Copy .blueprint directory
  console.log('Copying .blueprint directory...');
  copyDir(blueprintSrc, blueprintDest);
  console.log('Copied .blueprint directory');

  // Copy .business_context directory
  if (!fs.existsSync(businessContextDest)) {
    console.log('Copying .business_context directory...');
    copyDir(businessContextSrc, businessContextDest);
    console.log('Copied .business_context directory');
  } else {
    console.log('.business_context directory already exists, skipping');
  }

  // Update .gitignore
  updateGitignore();

  // Auto-detect tech stack
  const stackConfigPath = path.join(TARGET_DIR, STACK_CONFIG_FILE);
  if (!fs.existsSync(stackConfigPath)) {
    const detected = detectStackConfig(TARGET_DIR);
    const hasValues = detected.language || detected.runtime;
    if (hasValues) {
      writeStackConfig(detected);
      const parts = [detected.language, detected.runtime, ...detected.frameworks, detected.testRunner].filter(Boolean);
      console.log(`Detected tech stack: ${parts.join(', ')}`);
    }
  } else {
    console.log('Stack config already exists, skipping detection');
  }

  console.log(`
murmur8 initialized successfully!

Next steps:
1. Review your tech stack with \`npx murmur8 stack-config\`
2. Add business context documents to .business_context/
3. Run /implement-feature in Claude Code or Copilot CLI to start your first feature
`);
}

module.exports = { init };
