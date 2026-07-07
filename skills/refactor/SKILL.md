---
name: refactor
description: >
  Improve code quality, structure, or readability without changing observable
  behavior. Use for cleanup, DRY improvements, naming, extraction, reorganization.
  Supports --goal "description", --scope function|file|module, --auto.
allowed-tools: Read, Write, Bash(git diff *), Bash(git status)
apsl:
  verb: refactor
  inputs:
    target: { type: path, required: true }
    flags:
      goal: { type: string, required: false }
      scope: { type: "enum[function,file,module]", required: false }
      auto: { type: boolean, required: false, default: false }
  outputs: { shape: diff, pipeable: true }
  consumes: none
  contract-version: 1
---

# refactor — Refactoring Skill

**Prime directive: Never change observable behavior. If a change would alter
behavior, flag it and ask.**

## Execution Steps

1. **Read target** and understand the current implementation.
2. **Check context** — run `git diff HEAD` to understand recent changes.
3. **If `--goal` provided** — focus all refactoring toward that specific goal.
4. **Identify opportunities:**
   - Duplicated logic that could be extracted into shared functions
   - Functions longer than 40 lines doing more than one thing
   - Unclear names (variables, functions, classes)
   - Missing abstractions for repeated patterns
   - Dead code, commented-out blocks
5. **Show diff first** (unless `--auto`) — present proposed changes as a unified diff.
6. **Wait for approval** unless `--auto` is set.
7. **Apply changes** and verify the test suite if one exists.
