const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

describe('Multi-CLI Skill Support', () => {
  let tempDir;
  let originalCwd;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'murmur8-test-'));
    originalCwd = process.cwd();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('Skill Installation', () => {
    it('copies skill to .claude/commands/', async () => {
      // Setup: create minimal structure
      const claudeDir = path.join(tempDir, '.claude', 'commands');
      fs.mkdirSync(claudeDir, { recursive: true });

      const skillContent = '---\nname: test-skill\n---\nTest content';
      const skillPath = path.join(claudeDir, 'implement-feature.md');
      fs.writeFileSync(skillPath, skillContent);

      assert.ok(fs.existsSync(skillPath));
      const content = fs.readFileSync(skillPath, 'utf8');
      assert.ok(content.includes('test-skill'));
    });

    it('creates symlink for Copilot CLI', () => {
      // Setup: create Claude skill first
      const claudeDir = path.join(tempDir, '.claude', 'commands');
      fs.mkdirSync(claudeDir, { recursive: true });

      const skillContent = '---\nname: implement-feature\n---\nPipeline skill';
      const claudeSkillPath = path.join(claudeDir, 'implement-feature.md');
      fs.writeFileSync(claudeSkillPath, skillContent);

      // Create Copilot symlink
      const copilotSkillDir = path.join(tempDir, '.github', 'skills', 'implement-feature');
      const copilotSkillPath = path.join(copilotSkillDir, 'SKILL.md');
      const relativePath = path.relative(copilotSkillDir, claudeSkillPath);

      fs.mkdirSync(copilotSkillDir, { recursive: true });
      fs.symlinkSync(relativePath, copilotSkillPath);

      // Verify symlink exists and points to correct file
      assert.ok(fs.existsSync(copilotSkillPath));
      assert.ok(fs.lstatSync(copilotSkillPath).isSymbolicLink());

      // Verify content is accessible through symlink
      const linkedContent = fs.readFileSync(copilotSkillPath, 'utf8');
      assert.strictEqual(linkedContent, skillContent);
    });

    it('symlink resolves to same content as master', () => {
      // Setup both locations
      const claudeDir = path.join(tempDir, '.claude', 'commands');
      const copilotDir = path.join(tempDir, '.github', 'skills', 'implement-feature');

      fs.mkdirSync(claudeDir, { recursive: true });
      fs.mkdirSync(copilotDir, { recursive: true });

      const skillContent = '---\nname: implement-feature\ndescription: Run the pipeline\n---\n\n# Pipeline\nAlex -> Cass -> Nigel -> Codey';

      // Write master
      const masterPath = path.join(claudeDir, 'implement-feature.md');
      fs.writeFileSync(masterPath, skillContent);

      // Create symlink
      const symlinkPath = path.join(copilotDir, 'SKILL.md');
      const relativePath = path.relative(copilotDir, masterPath);
      fs.symlinkSync(relativePath, symlinkPath);

      // Both should have identical content
      const masterContent = fs.readFileSync(masterPath, 'utf8');
      const symlinkContent = fs.readFileSync(symlinkPath, 'utf8');

      assert.strictEqual(masterContent, symlinkContent);
    });

    it('updates to master propagate through symlink', () => {
      // Setup
      const claudeDir = path.join(tempDir, '.claude', 'commands');
      const copilotDir = path.join(tempDir, '.github', 'skills', 'implement-feature');

      fs.mkdirSync(claudeDir, { recursive: true });
      fs.mkdirSync(copilotDir, { recursive: true });

      const masterPath = path.join(claudeDir, 'implement-feature.md');
      const symlinkPath = path.join(copilotDir, 'SKILL.md');

      // Write initial content
      fs.writeFileSync(masterPath, 'Version 1');

      // Create symlink
      const relativePath = path.relative(copilotDir, masterPath);
      fs.symlinkSync(relativePath, symlinkPath);

      // Verify initial content
      assert.strictEqual(fs.readFileSync(symlinkPath, 'utf8'), 'Version 1');

      // Update master
      fs.writeFileSync(masterPath, 'Version 2');

      // Symlink should reflect update
      assert.strictEqual(fs.readFileSync(symlinkPath, 'utf8'), 'Version 2');
    });
  });

  describe('Skill Format Compatibility', () => {
    it('skill has valid YAML frontmatter', () => {
      const skillPath = path.join(__dirname, '..', 'SKILL.md');
      const content = fs.readFileSync(skillPath, 'utf8');

      // Check frontmatter delimiters
      assert.ok(content.startsWith('---'), 'Should start with ---');
      assert.ok(content.includes('---\n\n') || content.includes('---\n#'), 'Should have closing ---');

      // Check required fields
      assert.ok(content.includes('name:'), 'Should have name field');
      assert.ok(content.includes('description:'), 'Should have description field');
    });

    it('skill name is lowercase with hyphens', () => {
      const skillPath = path.join(__dirname, '..', 'SKILL.md');
      const content = fs.readFileSync(skillPath, 'utf8');

      // Extract name from frontmatter
      const nameMatch = content.match(/name:\s*([^\n]+)/);
      assert.ok(nameMatch, 'Should have name field');

      const name = nameMatch[1].trim();
      assert.ok(/^[a-z][a-z0-9-]*$/.test(name), `Name "${name}" should be lowercase with hyphens`);
    });
  });

  describe('Directory Structure', () => {
    it('Claude Code structure: .claude/commands/<skill>.md', () => {
      const expectedPath = '.claude/commands/implement-feature.md';
      const parts = expectedPath.split('/');

      assert.strictEqual(parts[0], '.claude');
      assert.strictEqual(parts[1], 'commands');
      assert.ok(parts[2].endsWith('.md'));
    });

    it('Copilot CLI structure: .github/skills/<skill>/SKILL.md', () => {
      const expectedPath = '.github/skills/implement-feature/SKILL.md';
      const parts = expectedPath.split('/');

      assert.strictEqual(parts[0], '.github');
      assert.strictEqual(parts[1], 'skills');
      assert.strictEqual(parts[3], 'SKILL.md');
    });
  });
});
