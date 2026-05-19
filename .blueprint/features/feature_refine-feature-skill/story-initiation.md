# Story: Refinement Initiation

**As a** developer who has run `/implement-feature` and found the result does not fully match intent
**I want** to run `/refine-feature [slug]` and have Alex load all existing artifacts for that feature
**So that** I can start a targeted refinement without duplicating work already done

## Acceptance Criteria

### AC-1: Skill exists and accepts a slug argument
**Given** murmur8 has been initialised in a project
**When** the user runs `/refine-feature some-feature`
**Then** the `/refine-feature` skill is recognised as a valid command and begins execution with `some-feature` as the target slug

### AC-2: Missing FEATURE_SPEC.md produces a clear error
**Given** no `FEATURE_SPEC.md` exists for the given slug
**When** the user runs `/refine-feature missing-slug`
**Then** the pipeline exits with a message indicating the spec was not found and no files are modified

### AC-3: Alex reads existing artifacts before engaging the user
**Given** a feature with an existing `FEATURE_SPEC.md`, one or more `story-*.md` files, and pipeline history
**When** the refinement skill starts
**Then** Alex reads the spec, all story files, and the most recent pipeline history entry for the slug before prompting the user

### AC-4: Alex presents a current-state summary before asking for feedback
**Given** Alex has loaded all existing artifacts
**When** the context-loading phase completes
**Then** Alex presents a brief summary (feature name, current scope, last run status) and then asks: "What needs to change?"

### AC-5: featureId is read from YAML frontmatter
**Given** `FEATURE_SPEC.md` contains a `featureId` in its YAML frontmatter
**When** Alex initialises the refinement session
**Then** the featureId value is captured and preserved for all subsequent writes in this run

### AC-6: Missing featureId is added before refinement proceeds
**Given** `FEATURE_SPEC.md` exists but has no `featureId` in its YAML frontmatter
**When** the refinement skill starts
**Then** Alex adds a new featureId to the frontmatter before proceeding, and logs that it was added

## Out of Scope
- Running refinement on multiple features in a single invocation
- Forking or branching a feature into two separate features
- Rolling back a feature to a previous state
