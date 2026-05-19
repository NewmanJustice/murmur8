# Story — Init Command Integration (.env Template and .gitignore)

### User story
As a developer initialising a new murmur8 project, I want the `init` command to create a commented-out telemetry template in `.env` and ensure `.env` is protected by `.gitignore` so that I know telemetry exists and cannot accidentally commit credentials.

---

### Context / scope
- `murmur8 init` runs `src/init.js` which copies framework files to the target project
- `.env` file is at the project root; it is optional — telemetry is inactive if absent
- `.gitignore` must include `.env` to prevent accidental credential commits
- If `.env` already exists, the template block is appended (not overwritten) only if not already present

---

### Acceptance criteria

**AC-1 — `.env` created with commented telemetry template when absent**
- Given the target project has no `.env` file,
- When `murmur8 init` is run,
- Then a `.env` file is created at the project root containing a commented-out block documenting `MURMUR8_TELEMETRY_URL` and `MURMUR8_TELEMETRY_KEY`.

**AC-2 — `.env` template appended when file already exists**
- Given the target project already has a `.env` file that does not contain the murmur8 telemetry template block,
- When `murmur8 init` is run,
- Then the commented-out telemetry template block is appended to the existing `.env` file without modifying existing content.

**AC-3 — `.env` not modified if template already present**
- Given the target project has a `.env` file that already contains the murmur8 telemetry template block,
- When `murmur8 init` is run,
- Then the `.env` file is not modified (no duplicate block appended).

**AC-4 — `.env` added to `.gitignore` when absent from it**
- Given the target project has a `.gitignore` file that does not contain `.env`,
- When `murmur8 init` is run,
- Then `.env` is appended to `.gitignore`.

**AC-5 — `.gitignore` not modified if `.env` already listed**
- Given the target project's `.gitignore` already contains `.env`,
- When `murmur8 init` is run,
- Then `.gitignore` is not modified (no duplicate entry added).

---

### Out of scope
- Emitting a user-visible notice that `.env` was created (silent operation, matching overall telemetry design)
- Validating that existing `.env` values are correct
- Creating or modifying `.gitignore` if neither `.gitignore` nor `.env` exist (no `.gitignore` needed without a `.env`)
